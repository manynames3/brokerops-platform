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
    "POL-1001,Acme Manufacturing,2026-01-15,\"$1,000.00\",10%,10000"
  ].join("\n")
);

assert.equal(valid.errors.length, 0);
assert.equal(valid.rows.length, 1);
assert.equal(valid.rows[0].commissionRate, 0.1);
assert.equal(valid.rows[0].premiumCents, 100000);
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

const rowErrors = normalizeStatementCsv(
  [
    "external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents",
    "POL-1001,,2026-02-31,abc,120%,12.345"
  ].join("\n")
);

assert.equal(rowErrors.rows.length, 0);
assert.deepEqual(
  rowErrors.errors.map((error) => `${error.rowNumber}:${error.field}:${error.code}`),
  [
    "2:account_name:required_field",
    "2:payment_date:invalid_date",
    "2:premium_cents:invalid_money",
    "2:commission_rate:invalid_rate",
    "2:commission_amount_cents:invalid_money"
  ]
);

const empty = normalizeStatementCsv("");
assert.deepEqual(empty.errors.map((error) => error.code), ["empty_csv"]);

const noRows = normalizeStatementCsv(
  [
    "external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents",
    ",,,,,"
  ].join("\n")
);
assert.deepEqual(noRows.errors.map((error) => error.code), ["no_data_rows"]);

console.log("csv statement tests passed");
