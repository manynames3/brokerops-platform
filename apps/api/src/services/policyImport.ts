import { pool } from "../db.js";
import { parseCsvRecords, type StatementValidationError } from "./csvStatement.js";

export type PolicyImportRequest = {
  organizationId: string;
  carrierName: string;
  csv: string;
  actor?: string;
};

export type NormalizedPolicyRow = {
  externalPolicyId: string;
  accountName: string;
  expectedCommissionRate: number;
  effectiveDate: string;
  sourceRowNumber: number;
};

type PolicyHeaderName =
  | "external_policy_id"
  | "account_name"
  | "expected_commission_rate"
  | "effective_date";

const requiredPolicyHeaders: PolicyHeaderName[] = [
  "external_policy_id",
  "account_name",
  "expected_commission_rate",
  "effective_date"
];

export function normalizePolicyCsv(csv: string): {
  rows: NormalizedPolicyRow[];
  errors: StatementValidationError[];
} {
  const records = parseCsvRecords(csv);
  const errors: StatementValidationError[] = [];

  if (records.length === 0) {
    return {
      rows: [],
      errors: [{
        rowNumber: 1,
        code: "empty_csv",
        message: "Policy CSV input must include a header row and at least one data row."
      }]
    };
  }

  const headers = records[0].map((header) => header.trim().toLowerCase());
  const headerIndexes = new Map(headers.map((header, index) => [header, index]));

  for (const header of requiredPolicyHeaders) {
    if (!headerIndexes.has(header)) {
      errors.push({
        rowNumber: 1,
        field: header,
        code: "missing_header",
        message: `Policy CSV is missing required header "${header}".`
      });
    }
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const rows: NormalizedPolicyRow[] = [];
  const seenPolicyIds = new Set<string>();

  records.slice(1).forEach((record, index) => {
    const rowNumber = index + 2;
    if (record.every((value) => value.trim() === "")) {
      return;
    }

    const externalPolicyId = getPolicyCell(record, headerIndexes, "external_policy_id");
    const accountName = getPolicyCell(record, headerIndexes, "account_name");
    const expectedCommissionRate = parsePolicyRate(getPolicyCell(record, headerIndexes, "expected_commission_rate"));
    const effectiveDate = getPolicyCell(record, headerIndexes, "effective_date");

    if (!externalPolicyId) {
      errors.push(requiredPolicyFieldError(rowNumber, "external_policy_id"));
    }
    if (!accountName) {
      errors.push(requiredPolicyFieldError(rowNumber, "account_name"));
    }
    if (expectedCommissionRate === null) {
      errors.push({
        rowNumber,
        field: "expected_commission_rate",
        code: "invalid_rate",
        message: "expected_commission_rate must be a decimal rate or percentage between 0 and 1."
      });
    }
    if (!isIsoDate(effectiveDate)) {
      errors.push({
        rowNumber,
        field: "effective_date",
        code: "invalid_date",
        message: "effective_date must be a valid YYYY-MM-DD date."
      });
    }
    if (externalPolicyId && seenPolicyIds.has(externalPolicyId)) {
      errors.push({
        rowNumber,
        field: "external_policy_id",
        code: "duplicate_policy",
        message: `Policy CSV contains duplicate external policy ID "${externalPolicyId}".`
      });
    }

    if (
      externalPolicyId &&
      accountName &&
      expectedCommissionRate !== null &&
      isIsoDate(effectiveDate) &&
      !seenPolicyIds.has(externalPolicyId)
    ) {
      seenPolicyIds.add(externalPolicyId);
      rows.push({
        externalPolicyId,
        accountName,
        expectedCommissionRate,
        effectiveDate,
        sourceRowNumber: rowNumber
      });
    }
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push({
      rowNumber: 2,
      code: "no_data_rows",
      message: "Policy CSV input must include at least one non-empty data row."
    });
  }

  return { rows, errors };
}

export async function importPolicyCsv(input: PolicyImportRequest) {
  const requestErrors = validatePolicyImportRequest(input);
  if (requestErrors.length > 0) {
    return { ok: false as const, errors: requestErrors };
  }

  const normalized = normalizePolicyCsv(input.csv);
  if (normalized.errors.length > 0) {
    return { ok: false as const, errors: normalized.errors };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const carrier = await client.query<{ id: string }>(
      `
      INSERT INTO carriers (organization_id, name)
      VALUES ($1, $2)
      ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
      `,
      [input.organizationId, input.carrierName.trim()]
    );
    const carrierId = carrier.rows[0].id;
    let upsertedPolicies = 0;

    for (const row of normalized.rows) {
      await client.query(
        `
        INSERT INTO policies (
          organization_id, external_policy_id, account_name, carrier_id, expected_commission_rate, effective_date
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (organization_id, external_policy_id)
        DO UPDATE SET
          account_name = EXCLUDED.account_name,
          carrier_id = EXCLUDED.carrier_id,
          expected_commission_rate = EXCLUDED.expected_commission_rate,
          effective_date = EXCLUDED.effective_date
        `,
        [
          input.organizationId,
          row.externalPolicyId,
          row.accountName,
          carrierId,
          row.expectedCommissionRate,
          row.effectiveDate
        ]
      );
      upsertedPolicies += 1;
    }

    await client.query(
      `
      INSERT INTO audit_events (actor, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        input.actor?.trim() || "system",
        "policy_records_imported",
        "carrier",
        carrierId,
        {
          carrierName: input.carrierName.trim(),
          policyCount: upsertedPolicies
        }
      ]
    );

    await client.query("COMMIT");

    return {
      ok: true as const,
      carrierId,
      importedPolicies: upsertedPolicies
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function validatePolicyImportRequest(input: PolicyImportRequest): StatementValidationError[] {
  const errors: StatementValidationError[] = [];

  if (!input.organizationId?.trim()) {
    errors.push({
      rowNumber: 0,
      field: "organizationId",
      code: "required_field",
      message: "organizationId is required."
    });
  }

  if (!input.carrierName?.trim()) {
    errors.push({
      rowNumber: 0,
      field: "carrierName",
      code: "required_field",
      message: "carrierName is required."
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

function getPolicyCell(record: string[], headerIndexes: Map<string, number>, header: PolicyHeaderName) {
  const index = headerIndexes.get(header);
  if (index === undefined) return "";
  return (record[index] || "").trim();
}

function requiredPolicyFieldError(rowNumber: number, field: string): StatementValidationError {
  return {
    rowNumber,
    field,
    code: "required_field",
    message: `${field} is required.`
  };
}

function parsePolicyRate(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;

  const isPercent = cleaned.endsWith("%");
  const parsed = Number(isPercent ? cleaned.slice(0, -1) : cleaned);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  const rate = isPercent || parsed > 1 ? parsed / 100 : parsed;
  if (rate < 0 || rate > 1) {
    return null;
  }

  return rate;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}
