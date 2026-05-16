# Runbook: Teardown Verification

## Goal

Confirm preview infrastructure has been removed after validation.

## Commands

```bash
make preview-down
make verify-teardown
```

## Review

Expected result: `make verify-teardown` exits successfully and reports that no tagged preview resources or preview ECR images were found.

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
- preview ECR images with tags beginning with `preview-`

The script fails if it finds resources tagged `Project=brokerops-platform` and `Environment=preview`, or if it finds preview-tagged images in the configured ECR repository.

## Cleanup

If verification fails:

1. Remove the listed tagged preview resources.
2. Delete preview-tagged ECR images or apply an ECR lifecycle policy that expires them.
3. Rerun:

```bash
make verify-teardown
```

## Record

Save verification output to `docs/evidence/generated/` when capturing release evidence.
