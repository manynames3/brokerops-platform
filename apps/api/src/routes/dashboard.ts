import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { requireWorkspace } from "../workspace.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/summary", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

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
        (
          SELECT count(*)::int
          FROM statement_files sf
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE c.organization_id = $1
        ) AS statement_files,
        (
          SELECT count(*)::int
          FROM statement_rows sr
          JOIN statement_files sf ON sf.id = sr.statement_file_id
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE c.organization_id = $1
        ) AS statement_rows,
        (
          SELECT count(*)::int
          FROM reconciliation_exceptions re
          JOIN statement_rows sr ON sr.id = re.statement_row_id
          JOIN statement_files sf ON sf.id = sr.statement_file_id
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE re.status = 'open' AND c.organization_id = $1
        ) AS open_exceptions,
        (
          SELECT count(*)::int
          FROM reconciliation_exceptions re
          JOIN statement_rows sr ON sr.id = re.statement_row_id
          JOIN statement_files sf ON sf.id = sr.statement_file_id
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE re.status = 'in_review' AND c.organization_id = $1
        ) AS in_review_exceptions,
        (
          SELECT count(*)::int
          FROM reconciliation_exceptions re
          JOIN statement_rows sr ON sr.id = re.statement_row_id
          JOIN statement_files sf ON sf.id = sr.statement_file_id
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE re.status = 'resolved' AND c.organization_id = $1
        ) AS resolved_exceptions,
        (
          SELECT count(*)::int
          FROM reconciliation_exceptions re
          JOIN statement_rows sr ON sr.id = re.statement_row_id
          JOIN statement_files sf ON sf.id = sr.statement_file_id
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE re.severity = 'high'
            AND re.status <> 'resolved'
            AND c.organization_id = $1
        ) AS high_severity_exceptions,
        (
          SELECT count(*)::int
          FROM ai_reviews ar
          JOIN reconciliation_exceptions re ON re.id = ar.exception_id
          JOIN statement_rows sr ON sr.id = re.statement_row_id
          JOIN statement_files sf ON sf.id = sr.statement_file_id
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE c.organization_id = $1
        ) AS ai_reviews,
        (
          SELECT max(sf.created_at)::text
          FROM statement_files sf
          JOIN carriers c ON c.id = sf.carrier_id
          WHERE c.organization_id = $1
        ) AS latest_statement_at
      `,
      [workspace.id]
    );

    return { summary: result.rows[0] };
  });
}
