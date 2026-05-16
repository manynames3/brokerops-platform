# Runbook: Slow PostgreSQL Query

## Symptom

API p95 latency increases or reconciliation pages load slowly.

## Checks

1. Identify slow endpoint.
2. Capture query and parameters.
3. Run `EXPLAIN ANALYZE`.
4. Check indexes.
5. Compare row estimates with actual rows.
6. Review whether the query is doing unnecessary sorting or sequential scans.

## Remediation

1. Add or adjust index.
2. Reduce selected columns.
3. Add pagination.
4. Move expensive work to worker.
5. Re-run query plan and record before/after evidence.

## Prevention

- keep query plans in evidence docs for key paths
- add regression tests for expensive queries
- monitor p95 latency and error rate
