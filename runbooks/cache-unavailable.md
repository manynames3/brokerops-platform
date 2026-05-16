# Runbook: Cache Unavailable

## Symptom

Dashboard reads are slower or logs show cache connection failures.

## Checks

1. Confirm cache endpoint and security group.
2. Review application timeout behavior.
3. Verify PostgreSQL remains available.
4. Confirm cached data is not required for correctness.

## Remediation

1. Disable cache usage temporarily if supported.
2. Restart affected service tasks.
3. Restore cache path.
4. Confirm application correctness through PostgreSQL reads.

## Prevention

- keep cache as performance layer only
- use timeouts
- preserve PostgreSQL as source of truth
