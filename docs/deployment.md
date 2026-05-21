# Deployment

BrokerOps supports local development, preview validation, and production deployment profiles.

## Preview path

```bash
export CONTAINER_IMAGE=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brokerops-api:preview
export DATABASE_PASSWORD=replace-with-secure-preview-password
export WORKSPACE_API_KEY=replace-with-secure-preview-workspace-key
export AUTH_TOKEN_SECRET=replace-with-secure-preview-auth-token-secret
export AUTH_ADMIN_EMAIL=ops@example.com
export AUTH_ADMIN_PASSWORD=replace-with-secure-preview-admin-password
make preview-plan
make preview-up
make preview-smoke
make evidence
make preview-down
make verify-teardown
```

`make preview-plan` validates the AWS resource plan without creating resources. `make preview-up` is the cost-bearing step because it can create ECS, RDS, cache, load balancer, networking, logging, and alarm resources. After Terraform apply, `make preview-up` runs the database migration as a one-shot ECS task using the deployed API image.

The GitHub preview deployment builds `apps/api/Dockerfile`, pushes the image to ECR, and applies Terraform with `TF_VAR_container_image` set to that immutable image URI. Terraform passes the RDS `DATABASE_URL`, ElastiCache `REDIS_URL`, `WORKSPACE_API_KEY`, and auth secrets into the ECS task definition. The workflow then runs the ECS migration task, waits for the service to stabilize, and runs authenticated smoke tests against the preview ALB DNS name. The workflow expects `PREVIEW_DATABASE_PASSWORD`, `PREVIEW_WORKSPACE_API_KEY`, `PREVIEW_AUTH_TOKEN_SECRET`, `PREVIEW_AUTH_ADMIN_PASSWORD`, and `AWS_ROLE_ARN` secrets.

Preview and production API tasks also receive `API_ALLOWED_ORIGINS`, `WEB_APP_URL`, and `WORKSPACE_NAME` from Terraform. Set `api_allowed_origins` to the Cloudflare Pages domain and any approved custom domain before using a hosted frontend against a deployed API. Set `web_app_url` to the public frontend URL so the API root endpoint points operators to the correct dashboard.

## Production path

Production deployment is manual and approval-gated through GitHub Actions.

```bash
export CONTAINER_IMAGE=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brokerops-api:production
export DATABASE_PASSWORD=replace-with-secure-production-password
export WORKSPACE_API_KEY=replace-with-secure-production-workspace-key
export AUTH_TOKEN_SECRET=replace-with-secure-production-auth-token-secret
export AUTH_ADMIN_EMAIL=ops@example.com
export AUTH_ADMIN_PASSWORD=replace-with-secure-production-admin-password
make production-plan
```

Production apply should happen through `.github/workflows/deploy-production.yml` with a confirmed environment and an explicit immutable `container_image` input. The workflow applies Terraform, runs the same ECS-hosted database migration task against production RDS, and waits for the ECS service to stabilize. It expects `PRODUCTION_DATABASE_PASSWORD`, `PRODUCTION_WORKSPACE_API_KEY`, `PRODUCTION_AUTH_TOKEN_SECRET`, `PRODUCTION_AUTH_ADMIN_PASSWORD`, `PRODUCTION_AUTH_ADMIN_EMAIL`, and `AWS_ROLE_ARN` configuration.

## End-user frontend path

The end-user dashboard deploys as a static Next.js export on Cloudflare Pages. It is intentionally separate from the AWS API runtime: Cloudflare serves the frontend globally, while the browser calls the deployed BrokerOps API through `NEXT_PUBLIC_API_URL`.

```bash
export NEXT_PUBLIC_API_URL=https://api.example.com
export NEXT_PUBLIC_DEMO_EMAIL=ops@example.com
export NEXT_PUBLIC_WORKSPACE_NAME="BrokerOps Preview Workspace"
export NEXT_PUBLIC_REQUEST_ACCESS_URL=https://example.com/request-access
make web-build
```

Manual deployment runs through `.github/workflows/deploy-web-cloudflare-pages.yml`. The workflow builds `apps/web/out` and uploads it with Wrangler. Required GitHub secrets are `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; the optional repository variable `CLOUDFLARE_PAGES_PROJECT` overrides the default project name `brokerops-platform-web`. The workflow inputs include `workspace_name` and `demo_email`, which should match the target API workspace configuration.

The request-access URL is a lightweight paid-pilot path. It is not a billing system. Use a monitored form or inbox until user authentication, production-grade authorization, and payment handling are implemented. If no request-access URL is configured, the frontend CTA scrolls to the pilot section instead of using a placeholder email address.

## Release safety

The ECS module creates blue and green target groups. The rollout runbook explains the expected release path and rollback steps.

See `runbooks/rollback-blue-green.md`.
