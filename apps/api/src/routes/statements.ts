import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { importStatementCsv, type StatementImportRequest } from "../services/statementImport.js";

export async function registerStatementRoutes(app: FastifyInstance) {
  app.get("/statements", async () => {
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
      ORDER BY sf.created_at DESC
      LIMIT 25
      `
    );

    return { statements: result.rows };
  });

  app.get("/statements/:id/rows", async (request) => {
    const { id } = request.params as { id: string };

    const result = await query(
      `
      SELECT *
      FROM statement_rows
      WHERE statement_file_id = $1
      ORDER BY source_row_number ASC
      `,
      [id]
    );

    return { rows: result.rows };
  });

  app.post("/statements/import", async (request, reply) => {
    const body = request.body as Partial<StatementImportRequest> | undefined;
    const result = await importStatementCsv({
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
