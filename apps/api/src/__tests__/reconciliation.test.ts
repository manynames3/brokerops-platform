import assert from "node:assert/strict";
import { expectedCommissionAmountCents, classifyCommissionVariance } from "../services/reconciliation.js";

assert.equal(expectedCommissionAmountCents(100000, 0.1), 10000);

const matched = classifyCommissionVariance(10000, 10000);
assert.equal(matched.status, "matched");

const exception = classifyCommissionVariance(24000, 20000);
assert.equal(exception.status, "exception");
assert.equal(exception.severity, "high");

console.log("reconciliation tests passed");
