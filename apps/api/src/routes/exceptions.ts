import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { createAiReviewForException } from "../services/aiExceptionReview.js";

const reviewStatuses = new Set(["open", "in_review", "resolved"]);

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

    const aiReviews = await query(
      `
      SELECT *
      FROM ai_reviews
      WHERE exception_id = $1
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [id]
    );

    const auditEvents = await query(
      `
      SELECT *
      FROM audit_events
      WHERE entity_type = 'reconciliation_exception'
        AND entity_id = $1
      ORDER BY created_at DESC
      LIMIT 25
      `,
      [id]
    );

    return {
      exception: result.rows[0],
      aiReviews: aiReviews.rows,
      auditEvents: auditEvents.rows
    };
  });

  app.post("/exceptions/:id/ai-review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const review = await createAiReviewForException(id);

    if (!review) {
      return reply.status(404).send({ error: "not_found" });
    }

    return { review };
  });

  app.patch("/exceptions/:id/review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: string;
      actor?: string;
      note?: string;
    } | undefined;
    const nextStatus = body?.status;

    if (!nextStatus || !reviewStatuses.has(nextStatus)) {
      return reply.status(422).send({
        error: "invalid_status",
        allowedStatuses: [...reviewStatuses]
      });
    }

    const current = await query<{ status: string }>(
      "SELECT status FROM reconciliation_exceptions WHERE id = $1",
      [id]
    );

    if (!current.rows[0]) {
      return reply.status(404).send({ error: "not_found" });
    }

    const previousStatus = current.rows[0].status;

    const updated = await query(
      `
      UPDATE reconciliation_exceptions
      SET status = $2,
          resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE NULL END
      WHERE id = $1
      RETURNING *
      `,
      [id, nextStatus]
    );

    await query(
      `
      INSERT INTO audit_events (actor, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        body?.actor?.trim() || "human-reviewer",
        "exception_status_changed",
        "reconciliation_exception",
        id,
        {
          previousStatus,
          nextStatus,
          note: body?.note?.trim() || null
        }
      ]
    );

    return { exception: updated.rows[0] };
  });
}
