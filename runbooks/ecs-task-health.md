# Runbook: ECS Task Health

## Symptom

ECS tasks fail to start, restart frequently, or fail target group health checks.

## Checks

1. Review ECS service events.
2. Review task stopped reason.
3. Review CloudWatch logs.
4. Confirm image tag exists in ECR.
5. Confirm environment variables and secrets are present.
6. Confirm security groups allow ALB to task traffic.

## Remediation

1. Roll back to previous image tag.
2. Fix missing configuration.
3. Adjust health check path or timeout if needed.
4. Redeploy and confirm target health.

## Prevention

- run smoke checks before traffic shift
- keep health endpoint lightweight
- validate required environment variables at startup
