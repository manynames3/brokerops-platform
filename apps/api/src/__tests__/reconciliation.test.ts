import assert from "node:assert/strict";
import {
  expectedCommissionAmountCents,
  classifyCommissionVariance,
  reconcileStatementRows
} from "../services/reconciliation.js";

assert.equal(expectedCommissionAmountCents(100000, 0.1), 10000);

const matched = classifyCommissionVariance(10000, 10000);
assert.equal(matched.status, "matched");

const exception = classifyCommissionVariance(24000, 20000);
assert.equal(exception.status, "exception");
assert.equal(exception.severity, "high");

const findings = reconcileStatementRows(
  [
    {
      externalPolicyId: "POL-1001",
      accountName: "Acme Manufacturing",
      paymentDate: "2026-01-15",
      premiumCents: 100000,
      commissionRate: 0.1,
      commissionAmountCents: 9000,
      sourceRowNumber: 2
    },
    {
      externalPolicyId: "POL-9999",
      accountName: "Unknown Account",
      paymentDate: "2026-01-15",
      premiumCents: 50000,
      commissionRate: 0.1,
      commissionAmountCents: 5000,
      sourceRowNumber: 3
    },
    {
      externalPolicyId: "POL-1001",
      accountName: "Acme Manufacturing",
      paymentDate: "2026-01-15",
      premiumCents: 100000,
      commissionRate: 0.1,
      commissionAmountCents: 9000,
      sourceRowNumber: 4
    }
  ],
  [{
    id: "policy-1",
    externalPolicyId: "POL-1001",
    accountName: "Acme Manufacturing",
    expectedCommissionRate: 0.1
  }]
);

assert.deepEqual(
  findings.map((finding) => finding.kind),
  ["commission_amount_mismatch", "missing_policy", "commission_amount_mismatch", "duplicate_payment"]
);

console.log("reconciliation tests passed");
