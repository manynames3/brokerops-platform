import assert from "node:assert/strict";
import {
  buildStatusChangeAuditMetadata,
  isReviewStatus,
  reviewStatuses
} from "../services/reviewWorkflow.js";

assert.deepEqual(reviewStatuses, ["open", "in_review", "resolved"]);
assert.equal(isReviewStatus("in_review"), true);
assert.equal(isReviewStatus("closed"), false);
assert.equal(isReviewStatus(undefined), false);

assert.deepEqual(
  buildStatusChangeAuditMetadata({
    previousStatus: "open",
    nextStatus: "resolved",
    note: "  Confirmed carrier adjustment.  "
  }),
  {
    previousStatus: "open",
    nextStatus: "resolved",
    note: "Confirmed carrier adjustment."
  }
);

assert.deepEqual(
  buildStatusChangeAuditMetadata({
    previousStatus: "open",
    nextStatus: "in_review"
  }),
  {
    previousStatus: "open",
    nextStatus: "in_review",
    note: null
  }
);

console.log("review workflow tests passed");
