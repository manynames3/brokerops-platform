# Runbook: RDS Connections Exhausted

## Symptom

API latency increases, requests fail, or logs show database connection errors.

## Checks

1. Review RDS connection count.
2. Review API task count and pool size.
3. Check long-running queries.
4. Review recent traffic or ingestion jobs.
5. Confirm whether migrations are running.

## Remediation

1. Reduce unnecessary worker concurrency.
2. Restart unhealthy API tasks if connections are leaked.
3. Tune pool settings.
4. Add query timeouts.
5. Consider RDS Proxy or connection pooling path for production.

## Prevention

- enforce pool limits
- add query timeout defaults
- track connection metrics
- load test ingestion paths
