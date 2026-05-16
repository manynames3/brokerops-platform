# CSV Ingestion Failure

## Symptoms

- `POST /statements/import` returns `csv_validation_failed`.
- The dashboard shows no new statement rows after an attempted import.
- No `statement_file_imported` audit event is present for the attempted file.

## Immediate Checks

1. Confirm the request uses `content-type: application/json`.
2. Confirm the JSON body includes `carrierName`, `fileName`, and `csv`.
3. Confirm the CSV header includes:

```text
external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents
```

4. Check validation errors returned by the API for row number, field, code, and message.

## Recovery

Fix the CSV data and resubmit the import. Validation failures occur before database writes, so partial statement files should not be created for rejected imports.

## Escalation

If valid CSV fails repeatedly, check API logs, PostgreSQL connectivity, and migration state. Confirm `packages/db/migrations/001_schema.sql` has been applied to the target database.
