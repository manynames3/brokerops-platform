import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { createAiReviewForException } from "../services/aiExceptionReview.js";
import {
  buildStatusChangeAuditMetadata,
  isReviewStatus,
  reviewStatuses
} from "../services/reviewWorkflow.js";
import { requireWorkspace } from "../workspace.js";

export async function registerExceptionRoutes(app: FastifyInstance) {
  app.get("/exceptions/report.csv", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const result = await query<{
      exception_id: string;
      kind: string;
      severity: string;
      status: string;
      account_name: string;
      external_policy_id: string;
      payment_date: string;
      expected_amount_cents: number | null;
      actual_amount_cents: number;
      ai_summary: string | null;
      ai_confidence: string | null;
      recommended_next_step: string | null;
      latest_review_at: string | null;
      created_at: string;
    }>(
      `
      SELECT
        re.id AS exception_id,
        re.kind,
        re.severity,
        re.status,
        sr.account_name,
        sr.external_policy_id,
        sr.payment_date::text,
        re.expected_amount_cents,
        re.actual_amount_cents,
        latest_review.summary AS ai_summary,
        latest_review.confidence AS ai_confidence,
        latest_review.recommended_next_step,
        latest_review.created_at::text AS latest_review_at,
        re.created_at::text
      FROM reconciliation_exceptions re
      JOIN statement_rows sr ON sr.id = re.statement_row_id
      JOIN statement_files sf ON sf.id = sr.statement_file_id
      JOIN carriers c ON c.id = sf.carrier_id
      LEFT JOIN LATERAL (
        SELECT summary, confidence, recommended_next_step, created_at
        FROM ai_reviews
        WHERE exception_id = re.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest_review ON true
      WHERE c.organization_id = $1
      ORDER BY re.created_at DESC
      LIMIT 500
      `,
      [workspace.id]
    );

    const headers = [
      "exception_id",
      "kind",
      "severity",
      "status",
      "account_name",
      "external_policy_id",
      "payment_date",
      "expected_amount",
      "actual_amount",
      "ai_summary",
      "ai_confidence",
      "recommended_next_step",
      "latest_review_at",
      "created_at"
    ];
    const rows = result.rows.map((row) => [
      row.exception_id,
      row.kind,
      row.severity,
      row.status,
      row.account_name,
      row.external_policy_id,
      row.payment_date,
      money(row.expected_amount_cents),
      money(row.actual_amount_cents),
      row.ai_summary || "",
      row.ai_confidence || "",
      row.recommended_next_step || "",
      row.latest_review_at || "",
      row.created_at
    ]);

    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", "attachment; filename=brokerops-exception-report.csv");

    return [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
  });

  app.get("/exceptions", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

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
      JOIN statement_files sf ON sf.id = sr.statement_file_id
      JOIN carriers c ON c.id = sf.carrier_id
      WHERE c.organization_id = $1
      ORDER BY re.created_at DESC
      LIMIT 50
      `,
      [workspace.id]
    );

    return { exceptions: result.rows };
  });

  app.get("/exceptions/:id", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

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
      JOIN statement_files sf ON sf.id = sr.statement_file_id
      JOIN carriers c ON c.id = sf.carrier_id
      LEFT JOIN policies p ON p.id = re.policy_id
      WHERE re.id = $1
        AND c.organization_id = $2
      `,
      [id, workspace.id]
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
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const { id } = request.params as { id: string };
    const review = await createAiReviewForException(id, workspace.id);

    if (!review) {
      return reply.status(404).send({ error: "not_found" });
    }

    return { review };
  });

  app.patch("/exceptions/:id/review", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: string;
      actor?: string;
      note?: string;
    } | undefined;
    const nextStatus = body?.status;

    if (!isReviewStatus(nextStatus)) {
      return reply.status(422).send({
        error: "invalid_status",
        allowedStatuses: reviewStatuses
      });
    }

    const current = await query<{ status: string }>(
      `
      SELECT re.status
      FROM reconciliation_exceptions re
      JOIN statement_rows sr ON sr.id = re.statement_row_id
      JOIN statement_files sf ON sf.id = sr.statement_file_id
      JOIN carriers c ON c.id = sf.carrier_id
      WHERE re.id = $1
        AND c.organization_id = $2
      `,
      [id, workspace.id]
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
        buildStatusChangeAuditMetadata({
          previousStatus,
          nextStatus,
          note: body?.note
        })
      ]
    );

    return { exception: updated.rows[0] };
  });
}

function money(cents: number | null) {
  if (cents === null) return "";
  return (cents / 100).toFixed(2);
}

function csvCell(value: string | number | null) {
  const stringValue = value === null ? "" : String(value);
  return `"${stringValue.replaceAll("\"", "\"\"")}"`;
}
