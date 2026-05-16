import assert from "node:assert/strict";
import { normalizeStatementCsv, parseCsvRecords } from "../services/csvStatement.js";

const records = parseCsvRecords('external_policy_id,account_name\nPOL-1,"Acme, Inc."\n');
assert.deepEqual(records, [
  ["external_policy_id", "account_name"],
  ["POL-1", "Acme, Inc."]
]);

const valid = normalizeStatementCsv(
  [
    "external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents",
    "POL-1001,Acme Manufacturing,2026-01-15,100000,10%,10000"
  ].join("\n")
);

assert.equal(valid.errors.length, 0);
assert.equal(valid.rows.length, 1);
assert.equal(valid.rows[0].commissionRate, 0.1);
assert.equal(valid.rows[0].sourceRowNumber, 2);

const invalid = normalizeStatementCsv(
  [
    "external_policy_id,account_name,payment_date,premium_cents,commission_rate",
    "POL-1001,,2026-02-31,abc,1.2"
  ].join("\n")
);

assert.equal(invalid.rows.length, 0);
assert.deepEqual(
  invalid.errors.map((error) => error.code),
  ["missing_header"]
);

console.log("csv statement tests passed");
