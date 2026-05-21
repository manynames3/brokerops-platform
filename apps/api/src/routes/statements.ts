import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { importStatementCsv, type StatementImportRequest } from "../services/statementImport.js";
import { requireWorkspace } from "../workspace.js";

export async function registerStatementRoutes(app: FastifyInstance) {
  app.get("/statements", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const result = await query<{
      id: string;
      file_name: string;
      status: string;
      row_count: number;
      carrier_name: string;
      created_at: string;
    }>(
      `
      SELECT sf.id, sf.file_name, sf.status, sf.row_count, c.name AS carrier_name, sf.created_at
      FROM statement_files sf
      JOIN carriers c ON c.id = sf.carrier_id
      WHERE c.organization_id = $1
      ORDER BY sf.created_at DESC
      LIMIT 25
      `,
      [workspace.id]
    );

    return { statements: result.rows };
  });

  app.get("/statements/:id/rows", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const { id } = request.params as { id: string };

    const result = await query(
      `
      SELECT sr.*
      FROM statement_rows sr
      JOIN statement_files sf ON sf.id = sr.statement_file_id
      JOIN carriers c ON c.id = sf.carrier_id
      WHERE sr.statement_file_id = $1
        AND c.organization_id = $2
      ORDER BY sr.source_row_number ASC
      `,
      [id, workspace.id]
    );

    return { rows: result.rows };
  });

  app.post("/statements/import", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const body = request.body as Partial<StatementImportRequest> | undefined;
    const result = await importStatementCsv({
      organizationId: workspace.id,
      carrierName: body?.carrierName || "",
      fileName: body?.fileName || "",
      csv: body?.csv || "",
      actor: body?.actor
    });

    if (!result.ok) {
      return reply.status(422).send({
        error: "csv_validation_failed",
        errors: result.errors
      });
    }

    return reply.status(201).send(result);
  });
}
