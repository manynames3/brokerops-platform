# Runbook: Preview Validation

## Purpose

Validate the production-capable AWS deployment path without leaving non-production infrastructure idle.

## Cost boundary

`make preview-up` is cost-bearing. Run it only after confirming AWS resource creation is intended.

## Procedure

1. Confirm the target branch has passed CI.
2. Export explicit preview values:

```bash
export CONTAINER_IMAGE=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brokerops-api:preview
export DATABASE_PASSWORD=replace-with-secure-preview-password
export WORKSPACE_API_KEY=replace-with-secure-preview-workspace-key
export AUTH_TOKEN_SECRET=replace-with-secure-preview-auth-token-secret
export AUTH_ADMIN_EMAIL=ops@example.com
export AUTH_ADMIN_PASSWORD=replace-with-secure-preview-admin-password
```

3. Run `make preview-plan` and inspect the plan.
4. Run `make preview-up`.
5. Run `make preview-smoke`.
6. Capture evidence:

```bash
API_URL=https://api.example.com WEB_URL=https://brokerops-platform-web.pages.dev bash scripts/capture-preview-evidence.sh
```

7. Run `make preview-down`.
8. Run `make verify-teardown`.

## Success criteria

- ECS service reaches stable state.
- RDS migration has completed.
- `/health` and `/health/readiness` return healthy responses.
- Smoke test completes through authenticated reconciliation workflow.
- Teardown verification confirms no tagged preview resources remain.
