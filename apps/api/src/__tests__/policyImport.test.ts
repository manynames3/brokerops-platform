import assert from "node:assert/strict";
import { normalizePolicyCsv } from "../services/policyImport.js";

const valid = normalizePolicyCsv(
  [
    "external_policy_id,account_name,expected_commission_rate,effective_date",
    "POL-1001,Acme Manufacturing,10%,2025-01-01",
    "POL-1002,Cedar Logistics,0.08,2025-01-01"
  ].join("\n")
);

assert.equal(valid.errors.length, 0);
assert.equal(valid.rows.length, 2);
assert.equal(valid.rows[0].expectedCommissionRate, 0.1);
assert.equal(valid.rows[1].expectedCommissionRate, 0.08);

const invalid = normalizePolicyCsv(
  [
    "external_policy_id,account_name,expected_commission_rate,effective_date",
    "POL-1001,,120%,2025-02-31",
    "POL-1001,Duplicate,10%,2025-01-01"
  ].join("\n")
);

assert.deepEqual(
  invalid.errors.map((error) => `${error.rowNumber}:${error.field}:${error.code}`),
  [
    "2:account_name:required_field",
    "2:expected_commission_rate:invalid_rate",
    "2:effective_date:invalid_date"
  ]
);

const duplicate = normalizePolicyCsv(
  [
    "external_policy_id,account_name,expected_commission_rate,effective_date",
    "POL-1001,Acme Manufacturing,10%,2025-01-01",
    "POL-1001,Acme Manufacturing,10%,2025-01-01"
  ].join("\n")
);

assert.deepEqual(
  duplicate.errors.map((error) => `${error.rowNumber}:${error.field}:${error.code}`),
  ["3:external_policy_id:duplicate_policy"]
);

const missingHeader = normalizePolicyCsv(
  [
    "external_policy_id,account_name,effective_date",
    "POL-1001,Acme Manufacturing,2025-01-01"
  ].join("\n")
);

assert.deepEqual(missingHeader.errors.map((error) => error.code), ["missing_header"]);

console.log("policy import tests passed");
