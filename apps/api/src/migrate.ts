import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { resolveDatabaseUrl } from "./databaseUrl.js";

const { Pool } = pg;

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const migrationsDir = process.env.MIGRATIONS_DIR || path.join(repoRoot, "packages/db/migrations");

const pool = new Pool({
  connectionString: resolveDatabaseUrl(process.env, { migration: true }),
  max: 1,
  connectionTimeoutMillis: 5_000
});

async function main() {
  try {
    await waitForDatabase();

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      throw new Error(`No SQL migrations found in ${migrationsDir}`);
    }

    const client = await pool.connect();

    try {
      for (const file of files) {
        const sql = await readFile(path.join(migrationsDir, file), "utf8");

        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");

        console.log(JSON.stringify({
          event: "migration_applied",
          migration: file
        }));
      }
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function waitForDatabase() {
  const attempts = Number(process.env.MIGRATION_DB_ATTEMPTS || 12);
  const delayMs = Number(process.env.MIGRATION_DB_DELAY_MS || 5_000);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      console.warn(JSON.stringify({
        event: "migration_database_wait",
        attempt,
        attempts
      }));
      await delay(delayMs);
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
