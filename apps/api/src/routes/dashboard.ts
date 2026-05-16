import type { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/summary", async () => {
    const result = await query<{
      statement_files: number;
      statement_rows: number;
      open_exceptions: number;
      in_review_exceptions: number;
      resolved_exceptions: number;
      high_severity_exceptions: number;
      ai_reviews: number;
      latest_statement_at: string | null;
    }>(
      `
      SELECT
        (SELECT count(*)::int FROM statement_files) AS statement_files,
        (SELECT count(*)::int FROM statement_rows) AS statement_rows,
        (SELECT count(*)::int FROM reconciliation_exceptions WHERE status = 'open') AS open_exceptions,
        (SELECT count(*)::int FROM reconciliation_exceptions WHERE status = 'in_review') AS in_review_exceptions,
        (SELECT count(*)::int FROM reconciliation_exceptions WHERE status = 'resolved') AS resolved_exceptions,
        (SELECT count(*)::int FROM reconciliation_exceptions WHERE severity = 'high' AND status <> 'resolved') AS high_severity_exceptions,
        (SELECT count(*)::int FROM ai_reviews) AS ai_reviews,
        (SELECT max(created_at)::text FROM statement_files) AS latest_statement_at
      `
    );

    return { summary: result.rows[0] };
  });
}
