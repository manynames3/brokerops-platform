import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { createAiReviewForException } from "../services/aiExceptionReview.js";

export async function registerExceptionRoutes(app: FastifyInstance) {
  app.get("/exceptions", async () => {
    const result = await query(
      `
      SELECT
        re.id,
        re.kind,
        re.severity,
        re.status,
        re.expected_amount_cents,
        re.actual_amount_cents,
        re.created_at,
        sr.external_policy_id,
        sr.account_name,
        sr.payment_date,
        sr.source_row_number
      FROM reconciliation_exceptions re
      JOIN statement_rows sr ON sr.id = re.statement_row_id
      ORDER BY re.created_at DESC
      LIMIT 50
      `
    );

    return { exceptions: result.rows };
  });

  app.get("/exceptions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await query(
      `
      SELECT
        re.*,
        sr.external_policy_id,
        sr.account_name,
        sr.payment_date,
        sr.premium_cents,
        sr.commission_rate,
        sr.commission_amount_cents,
        p.expected_commission_rate
      FROM reconciliation_exceptions re
      JOIN statement_rows sr ON sr.id = re.statement_row_id
      LEFT JOIN policies p ON p.id = re.policy_id
      WHERE re.id = $1
      `,
      [id]
    );

    if (!result.rows[0]) {
      return reply.status(404).send({ error: "not_found" });
    }

    return { exception: result.rows[0] };
  });

  app.post("/exceptions/:id/ai-review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const review = await createAiReviewForException(id);

    if (!review) {
      return reply.status(404).send({ error: "not_found" });
    }

    return { review };
  });
}
