# PostgreSQL Observability

BrokerOps includes PostgreSQL observability as a first-class platform concern.

## Goals

- identify slow reconciliation queries
- understand query plans
- track connection pressure
- expose workflow-level database symptoms
- document remediation steps

## Local query analysis

Use seeded data, then run:

```sql
EXPLAIN ANALYZE
SELECT *
FROM statement_rows
WHERE external_policy_id = 'POL-1003';
```

## Metrics to track

- open reconciliation exceptions
- slow reconciliation queries
- database connection count
- statement row volume
- AI review creation time
- failed ingestion rows

## Evidence to capture

- query plan before index change
- query plan after index change
- index rationale
- p95 API latency
- RDS connection trend
- exception endpoint response time

## Runbook

See `runbooks/slow-postgres-query.md`.
