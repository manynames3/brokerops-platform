# Product Hardening Sprint

## What changed

BrokerOps now has a minimal authenticated operator boundary: `POST /auth/login` creates a signed bearer session, operational API routes resolve the signed-in user's organization, and the web app starts with a sign-in panel. The UI also supports CSV file upload for policy records and carrier statements, shows import row counts, and keeps the existing sample workflow for fast demo setup.

The deployment path now requires explicit auth secrets for preview and production profiles. Smoke tests sign in before exercising policy import, statement import, exception creation, AI review, human review, audit trail, and report export. Preview validation and observability drill runbooks define the evidence needed for hiring-manager review without running AWS resources by default.

## Why it changed

The biggest paid-user trust gap was the shared workspace key boundary and paste-only CSV workflow. The biggest hiring-manager gap was lack of proof around authenticated smoke testing, readiness checks, request IDs, and preview evidence capture.

## Tradeoff

This is still not full customer administration. There is no invite flow, password reset, SSO, fine-grained RBAC, or Stripe billing. The current auth layer is a credible paid-pilot boundary for one operator team, while keeping implementation scope reviewable.

## How to validate

```bash
pnpm -r lint
pnpm -r typecheck
pnpm -r test
NEXT_PUBLIC_API_URL=http://localhost:8080 NEXT_PUBLIC_DEMO_EMAIL=ops@brokerops.local pnpm --filter @brokerops/web build
bash -n scripts/smoke-test.sh scripts/run-ecs-migration.sh scripts/capture-evidence.sh scripts/capture-preview-evidence.sh scripts/verify-teardown.sh
node --check scripts/api-workflow-smoke.mjs
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/environments/preview init -backend=false
terraform -chdir=infra/terraform/environments/preview validate
terraform -chdir=infra/terraform/environments/production init -backend=false
terraform -chdir=infra/terraform/environments/production validate
```

Do not run `make preview-up`, `terraform apply`, or production deploy workflows unless AWS resource creation and cost are approved.
