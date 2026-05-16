# Runbook: ECS Task Health

## Symptom

ECS tasks fail to start, restart frequently, or fail target group health checks.

## Checks

1. Review ECS service events.
2. Review task stopped reason.
3. Review CloudWatch logs.
4. Confirm image tag exists in ECR.
5. Confirm `DATABASE_URL`, `REDIS_URL`, and AI provider environment variables are present in the task definition.
6. Confirm the service security group is allowed to reach RDS and ElastiCache.
7. Confirm the latest one-shot migration task completed successfully.
8. Confirm security groups allow ALB to task traffic.

## Remediation

1. Roll back to previous image tag.
2. Fix missing configuration.
3. Adjust health check path or timeout if needed.
4. Redeploy and confirm target health.

## Prevention

- run database migrations from an ECS task before smoke checks
- run smoke checks against the deployed ALB before traffic shift
- keep health endpoint lightweight
- validate required environment variables at startup
