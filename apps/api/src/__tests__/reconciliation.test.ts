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

const mediumException = classifyCommissionVariance(10100, 10000);
assert.equal(mediumException.status, "exception");
assert.equal(mediumException.severity, "medium");

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

const accountMismatch = reconcileStatementRows(
  [{
    externalPolicyId: "POL-2001",
    accountName: "Acme Mfg",
    paymentDate: "2026-01-15",
    premiumCents: 100000,
    commissionRate: 0.1,
    commissionAmountCents: 10000,
    sourceRowNumber: 2
  }],
  [{
    id: "policy-2",
    externalPolicyId: "POL-2001",
    accountName: "Acme Manufacturing",
    expectedCommissionRate: 0.1
  }]
);

assert.equal(accountMismatch.length, 1);
assert.equal(accountMismatch[0].kind, "unmatched_account");
assert.equal(accountMismatch[0].policyId, "policy-2");

const clean = reconcileStatementRows(
  [{
    externalPolicyId: "POL-3001",
    accountName: "Cedar Logistics",
    paymentDate: "2026-01-15",
    premiumCents: 150000,
    commissionRate: 0.08,
    commissionAmountCents: 12000,
    sourceRowNumber: 2
  }],
  [{
    id: "policy-3",
    externalPolicyId: "POL-3001",
    accountName: "Cedar Logistics",
    expectedCommissionRate: 0.08
  }]
);

assert.deepEqual(clean, []);

console.log("reconciliation tests passed");
