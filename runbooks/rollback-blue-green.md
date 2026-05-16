# Rollback: Blue-Green Release

## Symptom

A new release fails health checks, smoke tests, or post-shift monitoring.

## Checks

1. Confirm active target group.
2. Review ALB target health.
3. Review ECS task events.
4. Review API logs.
5. Review recent deployment ID and image tag.

## Immediate action

1. Shift listener back to previous healthy target group.
2. Confirm `/health` returns success.
3. Run smoke checks.
4. Watch error rate and p95 latency.
5. Create audit note with cause and remediation status.

## Prevention

- require smoke test before traffic shift
- track image tags
- keep rollback command documented
- include migration safety review
