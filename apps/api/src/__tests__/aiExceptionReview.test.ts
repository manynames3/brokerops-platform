import assert from "node:assert/strict";
import { buildEvidenceGroundedReview, type ExceptionEvidence } from "../services/aiExceptionReview.js";

const baseEvidence: ExceptionEvidence = {
  id: "exception-1",
  statement_row_id: "statement-row-1",
  policy_id: "policy-1",
  kind: "commission_amount_mismatch",
  expected_amount_cents: 12000,
  actual_amount_cents: 10000,
  external_policy_id: "POL-1001",
  account_name: "Acme Manufacturing",
  payment_date: "2026-01-15",
  premium_cents: 100000,
  commission_rate: "0.1",
  expected_commission_rate: "0.12",
  source_row_number: 2
};

const complete = await buildEvidenceGroundedReview(baseEvidence);
assert.equal(complete.reviewStatus, "complete");
assert.equal(complete.promptVersion, "exception-review-v1");
assert.equal(complete.provider, "local");
assert.equal(complete.model, "brokerops-local-rules-v1");
assert.deepEqual(complete.evidenceIds, [
  "exception:exception-1",
  "statement_row:statement-row-1",
  "policy:policy-1"
]);
assert.deepEqual(complete.missingInformation, []);

const notEnoughInformation = await buildEvidenceGroundedReview({
  ...baseEvidence,
  policy_id: null,
  expected_amount_cents: null,
  expected_commission_rate: null
});

assert.equal(notEnoughInformation.reviewStatus, "not_enough_information");
assert.equal(notEnoughInformation.confidence, "low");
assert.deepEqual(notEnoughInformation.missingInformation, [
  "expected_amount_cents",
  "expected_commission_rate"
]);
assert.deepEqual(notEnoughInformation.evidenceIds, [
  "exception:exception-1",
  "statement_row:statement-row-1"
]);

const missingPolicy = await buildEvidenceGroundedReview({
  ...baseEvidence,
  kind: "missing_policy",
  policy_id: null,
  expected_amount_cents: null,
  expected_commission_rate: null,
  external_policy_id: "POL-404"
});

assert.equal(missingPolicy.reviewStatus, "complete");
assert.deepEqual(missingPolicy.missingInformation, ["matching_policy_record"]);

const duplicatePayment = await buildEvidenceGroundedReview({
  ...baseEvidence,
  kind: "duplicate_payment"
});

assert.equal(duplicatePayment.reviewStatus, "not_enough_information");
assert.deepEqual(duplicatePayment.missingInformation, ["exception_specific_context"]);

console.log("ai exception review tests passed");
