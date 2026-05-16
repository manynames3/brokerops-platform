# Runbook: Cost Spike

## Symptom

AWS spend increases unexpectedly.

## Checks

1. Review resources tagged `Project=brokerops-platform`.
2. Check for active ALBs.
3. Check for running ECS tasks.
4. Check RDS instances.
5. Check ElastiCache resources.
6. Check NAT Gateways.
7. Check public IPv4 allocations.
8. Check CloudWatch log growth.

## Remediation

1. Run `make preview-down`.
2. Run `make verify-teardown`.
3. Remove unneeded ECR images and log groups if appropriate.
4. Confirm no tagged preview resources remain.
5. Record root cause.

## Prevention

- TTL tags on preview resources
- teardown verification after every preview validation
- manual approval for production apply
- cost-aware defaults in preview
