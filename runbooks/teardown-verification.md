# Runbook: Teardown Verification

## Goal

Confirm preview infrastructure has been removed after validation.

## Commands

```bash
make preview-down
make verify-teardown
```

## Review

Verify that the output does not show remaining tagged resources.

Resource types to check:

- ECS services
- ECS tasks
- ALBs
- target groups
- RDS instances
- ElastiCache resources
- NAT Gateways
- Elastic IPs
- CloudWatch log groups
- ECR repositories

## Record

Save verification output to `docs/evidence/generated/` when capturing release evidence.
