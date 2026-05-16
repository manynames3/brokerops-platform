import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.LOCAL_DATABASE_URL ||
  "postgres://brokerops:brokerops@localhost:5432/brokerops";

const pool = new Pool({ connectionString });

async function heartbeat() {
  const result = await pool.query("SELECT count(*)::int AS open_count FROM reconciliation_exceptions WHERE status = 'open'");
  const openCount = result.rows[0]?.open_count ?? 0;
  console.log(JSON.stringify({ service: "brokerops-worker", openExceptions: openCount, at: new Date().toISOString() }));
}

await heartbeat();
setInterval(heartbeat, 30_000);
