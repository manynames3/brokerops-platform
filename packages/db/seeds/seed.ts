import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.LOCAL_DATABASE_URL ||
  "postgres://brokerops:brokerops@localhost:5432/brokerops";

const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE ai_reviews, audit_events, reconciliation_exceptions, statement_rows, statement_files, policies, carriers, organizations RESTART IDENTITY CASCADE");

    const organization = await client.query<{ id: string }>(
      `
      INSERT INTO organizations (name, workspace_key)
      VALUES ($1, $2)
      RETURNING id
      `,
      ["BrokerOps Demo Workspace", process.env.WORKSPACE_API_KEY || "brokerops-local-demo-key"]
    );
    const organizationId = organization.rows[0].id;

    const carrier = await client.query<{ id: string }>(
      "INSERT INTO carriers (organization_id, name) VALUES ($1, $2) RETURNING id",
      [organizationId, "Northstar Mutual"]
    );
    const carrierId = carrier.rows[0].id;

    const policies = [
      ["POL-1001", "Acme Manufacturing", 0.1, "2025-01-01"],
      ["POL-1002", "Cedar Logistics", 0.08, "2025-01-01"],
      ["POL-1003", "Summit Retail Group", 0.12, "2025-01-01"],
      ["POL-1004", "Harbor Foods", 0.1, "2025-01-01"]
    ];

    for (const [externalPolicyId, accountName, rate, effectiveDate] of policies) {
      await client.query(
        "INSERT INTO policies (organization_id, external_policy_id, account_name, carrier_id, expected_commission_rate, effective_date) VALUES ($1, $2, $3, $4, $5, $6)",
        [organizationId, externalPolicyId, accountName, carrierId, rate, effectiveDate]
      );
    }

    const file = await client.query<{ id: string }>(
      "INSERT INTO statement_files (carrier_id, file_name, status, row_count) VALUES ($1, $2, $3, $4) RETURNING id",
      [carrierId, "northstar-2026-01.csv", "processed", 6]
    );

    const rows = [
      ["POL-1001", "Acme Manufacturing", "2026-01-15", 100000, 0.1, 10000, 1],
      ["POL-1002", "Cedar Logistics", "2026-01-15", 150000, 0.08, 12000, 2],
      ["POL-1003", "Summit Retail Group", "2026-01-15", 200000, 0.1, 20000, 3],
      ["POL-9999", "Unknown Account", "2026-01-15", 50000, 0.1, 5000, 4],
      ["POL-1004", "Harbor Foods", "2026-01-15", 125000, 0.1, 12500, 5],
      ["POL-1004", "Harbor Foods", "2026-01-15", 125000, 0.1, 12500, 6]
    ];

    const rowIds: Record<number, string> = {};

    for (const row of rows) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO statement_rows (
          statement_file_id, external_policy_id, account_name, payment_date,
          premium_cents, commission_rate, commission_amount_cents, source_row_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        `,
        [file.rows[0].id, ...row]
      );

      rowIds[row[6] as number] = inserted.rows[0].id;
    }

    const summitPolicy = await client.query<{ id: string }>(
      "SELECT id FROM policies WHERE external_policy_id = $1",
      ["POL-1003"]
    );

    await client.query(
      `
      INSERT INTO reconciliation_exceptions (
        kind, statement_row_id, policy_id, severity, expected_amount_cents, actual_amount_cents
      )
      VALUES
        ($1, $2, $3, $4, $5, $6),
        ($7, $8, NULL, $9, NULL, $10),
        ($11, $12, NULL, $13, $14, $15)
      `,
      [
        "commission_amount_mismatch", rowIds[3], summitPolicy.rows[0].id, "high", 24000, 20000,
        "missing_policy", rowIds[4], "medium", 5000,
        "duplicate_payment", rowIds[6], "medium", 12500, 12500
      ]
    );

    await client.query("COMMIT");
    console.log("Seeded BrokerOps development data.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
