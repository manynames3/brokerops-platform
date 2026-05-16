# Deployment Runtime Validation

## What changed

Preview and production Terraform now wire ECS tasks to the provisioned RDS PostgreSQL and ElastiCache-compatible cache endpoints. Deploy workflows run database migrations as one-shot ECS tasks inside the target VPC, then preview smoke testing resolves the deployed ALB DNS name from Terraform output.

## Why it changed

The previous deployment path could validate local code while leaving deployed tasks pointed at localhost and smoke tests pointed at the GitHub runner. Fresh RDS instances also needed the schema migration before reconciliation endpoints could serve traffic.

## Tradeoff

The ECS service security group is now owned by each environment and passed into the ECS module. That keeps RDS/cache ingress independent from ECS task-definition environment values and avoids a Terraform dependency cycle.

## How to validate

```bash
pnpm -r lint
pnpm -r typecheck
pnpm -r test
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/environments/preview init -backend=false
terraform -chdir=infra/terraform/environments/preview validate
terraform -chdir=infra/terraform/environments/production init -backend=false
terraform -chdir=infra/terraform/environments/production validate
```

Do not run `make preview-up` or deployment workflows unless AWS resource creation and cost are intended.
