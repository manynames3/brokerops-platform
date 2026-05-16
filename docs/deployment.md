# Deployment

BrokerOps supports local development, preview validation, and production deployment profiles.

## Preview path

```bash
export CONTAINER_IMAGE=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brokerops-api:preview
export DATABASE_PASSWORD=replace-with-secure-preview-password
make preview-plan
make preview-up
make preview-smoke
make evidence
make preview-down
make verify-teardown
```

`make preview-plan` validates the AWS resource plan without creating resources. `make preview-up` is the cost-bearing step because it can create ECS, RDS, cache, load balancer, networking, logging, and alarm resources.

The GitHub preview deployment builds `apps/api/Dockerfile`, pushes the image to ECR, and applies Terraform with `TF_VAR_container_image` set to that immutable image URI. The workflow expects `PREVIEW_DATABASE_PASSWORD` and `AWS_ROLE_ARN` secrets.

## Production path

Production deployment is manual and approval-gated through GitHub Actions.

```bash
export CONTAINER_IMAGE=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brokerops-api:production
export DATABASE_PASSWORD=replace-with-secure-production-password
make production-plan
```

Production apply should happen through `.github/workflows/deploy-production.yml` with a confirmed environment and an explicit immutable `container_image` input. The workflow expects `PRODUCTION_DATABASE_PASSWORD` and `AWS_ROLE_ARN` secrets.

## Release safety

The ECS module creates blue and green target groups. The rollout runbook explains the expected release path and rollback steps.

See `runbooks/rollback-blue-green.md`.
