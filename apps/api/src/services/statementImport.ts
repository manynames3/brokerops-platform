import { pool } from "../db.js";
import { normalizeStatementCsv, type StatementValidationError } from "./csvStatement.js";
import {
  reconcileStatementRows,
  type NormalizedStatementRow,
  type PolicySnapshot,
  type ReconciliationFinding
} from "./reconciliation.js";

export type StatementImportRequest = {
  carrierName: string;
  fileName: string;
  csv: string;
  actor?: string;
};

export type StatementImportResult =
  | {
      ok: true;
      statementFileId: string;
      carrierId: string;
      importedRows: number;
      exceptionsCreated: number;
      exceptions: Array<ReconciliationFinding & { id: string }>;
    }
  | {
      ok: false;
      errors: StatementValidationError[];
    };

type PolicyRecord = {
  id: string;
  external_policy_id: string;
  account_name: string;
  expected_commission_rate: string;
};

export async function importStatementCsv(input: StatementImportRequest): Promise<StatementImportResult> {
  const requestErrors = validateImportRequest(input);
  if (requestErrors.length > 0) {
    return { ok: false, errors: requestErrors };
  }

  const normalized = normalizeStatementCsv(input.csv);
  if (normalized.errors.length > 0) {
    return { ok: false, errors: normalized.errors };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const carrier = await client.query<{ id: string }>(
      `
      INSERT INTO carriers (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
      `,
      [input.carrierName.trim()]
    );
    const carrierId = carrier.rows[0].id;

    const file = await client.query<{ id: string }>(
      `
      INSERT INTO statement_files (carrier_id, file_name, status, row_count)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [carrierId, input.fileName.trim(), "processed", normalized.rows.length]
    );
    const statementFileId = file.rows[0].id;

    const rowIdsBySourceRow = new Map<number, string>();
    for (const row of normalized.rows) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO statement_rows (
          statement_file_id, external_policy_id, account_name, payment_date,
          premium_cents, commission_rate, commission_amount_cents, source_row_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        `,
        [
          statementFileId,
          row.externalPolicyId,
          row.accountName,
          row.paymentDate,
          row.premiumCents,
          row.commissionRate,
          row.commissionAmountCents,
          row.sourceRowNumber
        ]
      );
      rowIdsBySourceRow.set(row.sourceRowNumber, inserted.rows[0].id);
    }

    const policies = await loadPoliciesForRows(normalized.rows, client);
    const findings = reconcileStatementRows(normalized.rows, policies);
    const exceptions: Array<ReconciliationFinding & { id: string }> = [];

    for (const finding of findings) {
      const statementRowId = rowIdsBySourceRow.get(finding.sourceRowNumber);
      if (!statementRowId) {
        throw new Error(`No statement row ID found for source row ${finding.sourceRowNumber}.`);
      }

      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO reconciliation_exceptions (
          kind, statement_row_id, policy_id, severity, expected_amount_cents, actual_amount_cents
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          finding.kind,
          statementRowId,
          finding.policyId,
          finding.severity,
          finding.expectedAmountCents,
          finding.actualAmountCents
        ]
      );

      const exception = { ...finding, id: inserted.rows[0].id };
      exceptions.push(exception);

      await client.query(
        `
        INSERT INTO audit_events (actor, action, entity_type, entity_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          "system",
          "reconciliation_exception_created",
          "reconciliation_exception",
          exception.id,
          {
            statementFileId,
            sourceRowNumber: finding.sourceRowNumber,
            kind: finding.kind,
            message: finding.message
          }
        ]
      );
    }

    await client.query(
      `
      INSERT INTO audit_events (actor, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        input.actor?.trim() || "system",
        "statement_file_imported",
        "statement_file",
        statementFileId,
        {
          fileName: input.fileName.trim(),
          carrierName: input.carrierName.trim(),
          rowCount: normalized.rows.length,
          exceptionCount: exceptions.length
        }
      ]
    );

    await client.query("COMMIT");

    return {
      ok: true,
      statementFileId,
      carrierId,
      importedRows: normalized.rows.length,
      exceptionsCreated: exceptions.length,
      exceptions
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function validateImportRequest(input: StatementImportRequest): StatementValidationError[] {
  const errors: StatementValidationError[] = [];

  if (!input.carrierName?.trim()) {
    errors.push({
      rowNumber: 0,
      field: "carrierName",
      code: "required_field",
      message: "carrierName is required."
    });
  }

  if (!input.fileName?.trim()) {
    errors.push({
      rowNumber: 0,
      field: "fileName",
      code: "required_field",
      message: "fileName is required."
    });
  }

  if (!input.csv?.trim()) {
    errors.push({
      rowNumber: 0,
      field: "csv",
      code: "required_field",
      message: "csv is required."
    });
  }

  return errors;
}

async function loadPoliciesForRows(
  rows: NormalizedStatementRow[],
  client: Pick<typeof pool, "query">
): Promise<PolicySnapshot[]> {
  const externalPolicyIds = [...new Set(rows.map((row) => row.externalPolicyId))];
  const result = await client.query<PolicyRecord>(
    `
    SELECT id, external_policy_id, account_name, expected_commission_rate
    FROM policies
    WHERE external_policy_id = ANY($1::text[])
    `,
    [externalPolicyIds]
  );

  return result.rows.map((policy) => ({
    id: policy.id,
    externalPolicyId: policy.external_policy_id,
    accountName: policy.account_name,
    expectedCommissionRate: Number(policy.expected_commission_rate)
  }));
}
