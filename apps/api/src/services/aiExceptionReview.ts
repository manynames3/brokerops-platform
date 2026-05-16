import { config } from "../config.js";
import { query } from "../db.js";

type AiExceptionReview = {
  exceptionId: string;
  reviewStatus: "complete" | "not_enough_information";
  summary: string;
  likelyCause: string;
  recommendedNextStep: string;
  evidenceIds: string[];
  confidence: "low" | "medium" | "high";
  missingInformation: string[];
  promptVersion: string;
  provider: string;
  model: string;
  modelMetadata: Record<string, string>;
};

type ExceptionEvidence = {
  id: string;
  statement_row_id: string;
  policy_id: string | null;
  kind: string;
  expected_amount_cents: number | null;
  actual_amount_cents: number;
  external_policy_id: string;
  account_name: string;
  payment_date: string;
  premium_cents: number;
  commission_rate: string;
  expected_commission_rate: string | null;
  source_row_number: number;
};

export async function createAiReviewForException(exceptionId: string): Promise<AiExceptionReview | null> {
  const evidenceResult = await query<ExceptionEvidence>(
    `
    SELECT
      re.id,
      sr.id AS statement_row_id,
      p.id AS policy_id,
      re.kind,
      re.expected_amount_cents,
      re.actual_amount_cents,
      sr.external_policy_id,
      sr.account_name,
      sr.payment_date,
      sr.premium_cents,
      sr.commission_rate,
      p.expected_commission_rate,
      sr.source_row_number
    FROM reconciliation_exceptions re
    JOIN statement_rows sr ON sr.id = re.statement_row_id
    LEFT JOIN policies p ON p.id = re.policy_id
    WHERE re.id = $1
    `,
    [exceptionId]
  );

  const evidence = evidenceResult.rows[0];

  if (!evidence) {
    return null;
  }

  const review = await buildEvidenceGroundedReview(evidence);

  await query(
    `
    INSERT INTO ai_reviews (
      exception_id, provider, prompt_version, review_status, model_metadata, summary, likely_cause,
      recommended_next_step, evidence_ids, confidence, missing_information
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      exceptionId,
      config.aiProvider,
      review.promptVersion,
      review.reviewStatus,
      review.modelMetadata,
      review.summary,
      review.likelyCause,
      review.recommendedNextStep,
      review.evidenceIds,
      review.confidence,
      review.missingInformation
    ]
  );

  await query(
    `
    INSERT INTO audit_events (actor, action, entity_type, entity_id, metadata)
    VALUES ($1, $2, $3, $4, $5)
    `,
    ["system", "ai_review_created", "reconciliation_exception", exceptionId, {
      provider: config.aiProvider,
      model: config.aiModel,
      promptVersion: review.promptVersion,
      reviewStatus: review.reviewStatus,
      evidenceIds: review.evidenceIds
    }]
  );

  return review;
}

async function buildEvidenceGroundedReview(evidence: ExceptionEvidence): Promise<AiExceptionReview> {
  const promptVersion = "exception-review-v1";
  const modelMetadata = {
    provider: config.aiProvider,
    model: config.aiModel,
    mode: config.aiProvider === "local" ? "deterministic-local-review" : "external-provider-review"
  };
  const evidenceIds = [
    `exception:${evidence.id}`,
    `statement_row:${evidence.statement_row_id}`,
    ...(evidence.policy_id ? [`policy:${evidence.policy_id}`] : [])
  ];

  if (evidence.kind === "commission_amount_mismatch" && evidence.expected_amount_cents === null) {
    return {
      exceptionId: evidence.id,
      reviewStatus: "not_enough_information",
      summary: "Not enough information is available to explain this commission variance.",
      likelyCause: "The exception is missing an expected commission amount from the policy evidence.",
      recommendedNextStep: "Load or repair the matching policy record before requesting another AI-assisted review.",
      evidenceIds,
      confidence: "low",
      missingInformation: ["expected_amount_cents", "expected_commission_rate"],
      promptVersion,
      provider: config.aiProvider,
      model: config.aiModel,
      modelMetadata
    };
  }

  if (evidence.kind === "commission_amount_mismatch") {
    return {
      exceptionId: evidence.id,
      reviewStatus: "complete",
      summary: "Commission amount does not match the expected policy commission schedule.",
      likelyCause: `The statement row paid ${formatMoney(evidence.actual_amount_cents)}, while the expected amount is ${formatMoney(evidence.expected_amount_cents ?? 0)} based on the available policy record.`,
      recommendedNextStep: "Verify whether the policy commission rate changed before marking the exception resolved.",
      evidenceIds,
      confidence: "medium",
      missingInformation: evidence.expected_commission_rate ? [] : ["expected_commission_rate"],
      promptVersion,
      provider: config.aiProvider,
      model: config.aiModel,
      modelMetadata
    };
  }

  if (evidence.kind === "missing_policy") {
    return {
      exceptionId: evidence.id,
      reviewStatus: "complete",
      summary: "Statement row could not be matched to an existing policy record.",
      likelyCause: `No policy record was found for external policy ID ${evidence.external_policy_id}.`,
      recommendedNextStep: "Confirm whether the carrier used a new policy identifier or whether the policy record has not been loaded yet.",
      evidenceIds,
      confidence: "medium",
      missingInformation: ["matching_policy_record"],
      promptVersion,
      provider: config.aiProvider,
      model: config.aiModel,
      modelMetadata
    };
  }

  return {
    exceptionId: evidence.id,
    reviewStatus: "not_enough_information",
    summary: "The reconciliation engine flagged this row for review.",
    likelyCause: "The available evidence is not sufficient to determine a single likely cause.",
    recommendedNextStep: "Review the source row, policy record, and audit events before changing status.",
    evidenceIds,
    confidence: "low",
    missingInformation: ["exception_specific_context"],
    promptVersion,
    provider: config.aiProvider,
    model: config.aiModel,
    modelMetadata
  };
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
