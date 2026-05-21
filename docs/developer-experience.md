# Developer Experience

BrokerOps treats developer experience as part of the platform.

## Local setup

```bash
cp .env.example .env
make local-up
make local-seed
make local-smoke
```

The local path should give an engineer a working web app, API, worker, PostgreSQL database, cache, seeded data, and health checks.

## Developer goals

- one-command startup
- seeded workflow data
- repeatable database reset
- fast API feedback
- simple smoke checks
- no cloud dependency for routine development
- clear documentation for environment variables
- local policy import path for expected commission records
- local CSV import path for reconciliation workflow testing
- audit-backed human review status updates
- browser-based sample workflow for import, exception review, AI review, and audit trail validation
- workspace-scoped API requests with a local demo key

## Commands

```bash
make local-up
make local-down
make local-reset
make local-seed
make local-smoke
make test
make lint
make typecheck
make docker-config
make docker-build-api
make web-build
make validate-local
make preview-migrate
make preview-smoke
```

`make preview-plan`, `make preview-up`, and `make production-plan` require explicit `CONTAINER_IMAGE`, `DATABASE_PASSWORD`, and `WORKSPACE_API_KEY` values. This keeps cost-bearing infrastructure commands environment-aware and avoids placeholder runtime deployments.

Preview smoke tests resolve the ALB DNS name from Terraform output. `scripts/smoke-test.sh` requires an explicit `API_URL` and sends `WORKSPACE_API_KEY`, which prevents a cloud validation run from accidentally testing a local API process or an unscoped workflow.

`make web-build` creates the static Next.js export for Cloudflare Pages. Set `NEXT_PUBLIC_API_URL` to the target API URL and `NEXT_PUBLIC_WORKSPACE_KEY` to the matching API workspace key when building for preview or production.

Set `NEXT_PUBLIC_REQUEST_ACCESS_URL` to a monitored paid-pilot form or inbox when building a public demo. If it is not configured, the frontend CTA stays on-page and scrolls to the pilot section.

`make validate-local` includes an API Docker image build when Docker is available. CI also builds `apps/api/Dockerfile` before any deploy workflow runs, so container packaging problems are caught before AWS resources are created.

## Quality gates

CI should run:

- TypeScript checks
- unit tests
- database migration check
- seed verification
- API smoke check
- Terraform format and validation for infrastructure changes

## Local import contract

The API accepts JSON-wrapped CSV at `POST /statements/import`. Validation happens before database writes. Required headers are:

```text
external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents
```

Use `premium_cents` and `commission_amount_cents` as whole-cent integers. Dollar amounts with two decimals are accepted for local ergonomics. `commission_rate` accepts decimal rates such as `0.1` or percentages such as `10%`.

Operational API requests must include `x-brokerops-workspace-key`. Local development uses:

```text
x-brokerops-workspace-key: brokerops-local-demo-key
```

## Browser demo path

Use this path when evaluating product readiness locally:

1. Run `make local-up`.
2. Run `make local-seed`.
3. Open `http://localhost:3000`.
4. Confirm the API status is connected.
5. Import the sample policy records from the web app.
6. Import the sample statement CSV from the web app.
7. Select a created exception.
8. Create an AI-assisted review.
9. Save a human review status with a note.
10. Export the exception report.
11. Confirm the exception detail shows audit events.

This path exercises the same API workflow as `make local-smoke`, but through the end-user surface instead of command-line requests.

## Local policy import contract

The API accepts JSON-wrapped CSV at `POST /policies/import`. Required headers are:

```text
external_policy_id,account_name,expected_commission_rate,effective_date
```

`expected_commission_rate` accepts decimal rates such as `0.1` or percentages such as `10%`. `effective_date` must be a valid `YYYY-MM-DD` date.
