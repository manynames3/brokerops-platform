# BrokerOps Platform

[![CI](https://github.com/manynames3/brokerops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/manynames3/brokerops-platform/actions/workflows/ci.yml)
[![Terraform Plan](https://github.com/manynames3/brokerops-platform/actions/workflows/terraform-plan.yml/badge.svg)](https://github.com/manynames3/brokerops-platform/actions/workflows/terraform-plan.yml)

BrokerOps Platform is a production-capable insurance back-office reconciliation platform built with TypeScript, Node.js, Next.js, PostgreSQL, Redis-compatible caching, Terraform, ECS, RDS PostgreSQL, CI/CD, blue-green deployment support, observability, AI-assisted exception review, and operational runbooks.

The system models carrier statement ingestion, transaction normalization, reconciliation exceptions, audit history, AI-assisted review, and operational dashboards.

BrokerOps uses environment-aware architecture: local development runs the full application stack through Docker Compose, preview environments validate the AWS deployment path with cost-conscious defaults, and the production profile supports an always-on ECS/RDS/ElastiCache deployment.

## Live links

- Landing page: [brokerops-platform-web.pages.dev](https://brokerops-platform-web.pages.dev)
- Repository: [github.com/manynames3/brokerops-platform](https://github.com/manynames3/brokerops-platform)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Deployment path: [docs/deployment.md](docs/deployment.md)
- Cost controls: [docs/cost-controls.md](docs/cost-controls.md)
- Security boundary: [docs/security.md](docs/security.md)
- Paid pilot plan: [docs/paid-pilot.md](docs/paid-pilot.md)
- Preview validation evidence template: [docs/evidence/preview-validation-template.md](docs/evidence/preview-validation-template.md)
- Operational runbooks: [runbooks](runbooks)

## Reviewer quick path

Use this path if you are evaluating the repository as a product or Platform Engineering portfolio project:

1. Open the [live landing page](https://brokerops-platform-web.pages.dev) to inspect the end-user workflow and current demo boundary.
2. Read the [architecture](docs/architecture.md) and [environment strategy](docs/environment-strategy.md) for the local, preview, and production profiles.
3. Review [docs/deployment.md](docs/deployment.md) for the ECS/RDS/ElastiCache deployment path and Cloudflare Pages frontend path.
4. Review [docs/cost-controls.md](docs/cost-controls.md) before running any preview infrastructure command.
5. Run `make validate-local` for local validation when Docker is available.

## Buyer-facing product focus

BrokerOps is aimed at insurance agency and MGA operations teams that reconcile recurring carrier commission statements manually. The first paid wedge is a focused reconciliation pilot: one agency, one carrier statement workflow, one policy export, measurable exceptions reviewed, and an audit-ready report of what changed.

The end-user experience is intentionally focused on the core workflow instead of broad enterprise features:

- explain the platform value immediately
- guide a user through a sample carrier statement import or uploaded CSV
- load expected policy records before statement import
- show validation, API connectivity, sign-in, and workspace boundary states
- create a reconciliation queue from deterministic rules
- let an operator review exception evidence
- persist AI-assisted review output and human review status to the audit trail
- export a reconciliation exception report
- provide a request-access path for paid pilot conversations

Full self-serve billing, customer administration, and carrier templates are still required before charging broadly for production customer use.

## Core workflow

1. Expected policy records are loaded from structured CSV data.
2. Carrier statements are ingested from structured CSV data.
3. CSV rows are validated before any database writes occur.
4. Operational API routes require a signed-in user and scope records to that user's organization.
5. Rows are normalized into PostgreSQL.
6. Reconciliation logic matches statement rows against expected policy records.
7. Exceptions are created for mismatches, missing records, duplicate payments, account mismatches, and unexpected amounts.
8. The AI-assisted review layer explains exceptions using structured evidence only.
9. Human review decisions and system events are written to an audit trail.
10. Exception reports can be exported for follow-up and buyer-facing proof.
11. Dashboards and metrics expose workflow health and infrastructure health.

## Stack

- Frontend: Next.js, React, TypeScript
- API: Node.js, TypeScript, Fastify
- Worker: Node.js, TypeScript
- Data: PostgreSQL, Redis-compatible cache
- Cloud runtime: ECS
- Database: RDS PostgreSQL
- Cache: ElastiCache-compatible profile
- Infrastructure: Terraform
- CI/CD: GitHub Actions with AWS OIDC
- Observability: CloudWatch, OpenTelemetry-ready service boundaries, PostgreSQL query analysis
- Security: least-privilege IAM, private database design, secrets management, audit logging

## Environment profiles

### Local development

```bash
cp .env.example .env
make local-up
make local-seed
```

### Preview environment

```bash
export CONTAINER_IMAGE=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brokerops-api:preview
export DATABASE_PASSWORD=replace-with-secure-preview-password
export WORKSPACE_API_KEY=replace-with-secure-preview-workspace-key
make preview-plan
make preview-up
make preview-smoke
make preview-down
```

`make preview-up` applies the preview profile and runs the database migration task inside ECS before smoke testing. `make preview-smoke` resolves the preview ALB DNS name from Terraform output, so validation targets the deployed service instead of a local process. Preview environments are intentionally short-lived. This is not because the system is incomplete. It is because non-production infrastructure should not create unnecessary idle cost.

### Production profile

```bash
export CONTAINER_IMAGE=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brokerops-api:production
export DATABASE_PASSWORD=replace-with-secure-production-password
export WORKSPACE_API_KEY=replace-with-secure-production-workspace-key
make production-plan
```

Production apply is intentionally manual through GitHub Actions.

## Local quickstart

```bash
cp .env.example .env
make local-up
make local-seed
make local-smoke
```

Then open:

- Web: http://localhost:3000
- API health: http://localhost:8080/health

## Demo workflow

After local startup and seeding, open the web app and run the guided sample workflow:

1. Confirm the API status reads `API connected`.
2. Sign in with the local demo admin credentials.
3. Select `Try sample workflow`.
4. Import the sample policy records or upload a policy CSV.
5. Import the sample carrier statement or upload a statement CSV.
6. Open an exception from the reconciliation queue.
7. Select `Create review` to save an evidence-grounded AI review.
8. Add a review note and save a status change.
9. Export the exception report.
10. Confirm the audit trail records the AI review and human review event.

If the web app shows `Demo API is not connected`, the frontend is running without a reachable API. Start the local API through Docker Compose or rebuild the Cloudflare Pages deployment with `NEXT_PUBLIC_API_URL` pointing at a deployed BrokerOps API.

Opening the API root at `http://localhost:8080/` returns service metadata, the configured web app URL, auth route, and the main workflow endpoints. Use the web app at `http://localhost:3000` for the operator demo.

## Auth and workspace boundary

Operational API routes require a bearer session token from `POST /auth/login`. Local development seeds a default admin user from `.env.example`:

```text
AUTH_ADMIN_EMAIL=ops@brokerops.local
AUTH_ADMIN_PASSWORD=brokerops-demo-password
```

The API still supports `x-brokerops-workspace-key` as an automation fallback for controlled smoke tests, but the end-user workflow signs in and sends an `Authorization: Bearer ...` token. Signed-in users are attached to an organization, and carriers, policy records, statement imports, exceptions, AI reviews, dashboard metrics, and exports are scoped to that organization.

## End-user frontend

The end-user dashboard is a static-export Next.js app that can be deployed to Cloudflare Pages. It reads `NEXT_PUBLIC_API_URL` at build time and calls the deployed BrokerOps API from the browser. The request-access CTA reads `NEXT_PUBLIC_REQUEST_ACCESS_URL`, which can be a paid-pilot form URL or a monitored email address.

```bash
export NEXT_PUBLIC_API_URL=https://api.example.com
export NEXT_PUBLIC_DEMO_EMAIL=ops@example.com
export NEXT_PUBLIC_WORKSPACE_NAME="BrokerOps Preview Workspace"
export NEXT_PUBLIC_REQUEST_ACCESS_URL=https://example.com/request-access
make web-build
```

If `NEXT_PUBLIC_REQUEST_ACCESS_URL` is not set, the CTA scrolls to the pilot section instead of pointing to a fake contact address.

The manual GitHub workflow `.github/workflows/deploy-web-cloudflare-pages.yml` publishes `apps/web/out` to Cloudflare Pages. It expects `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets, plus an optional `CLOUDFLARE_PAGES_PROJECT` repository variable. The default Pages project name is `brokerops-platform-web`. The workflow inputs include `workspace_name` and optional `demo_email`; the deployed API must have matching admin credentials configured through environment-specific secrets.

## Auth API

```bash
TOKEN=$(curl -fsS http://localhost:8080/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"ops@brokerops.local","password":"brokerops-demo-password"}' | jq -r .token)
```

## Statement import API

Local development supports JSON-wrapped CSV imports so the workflow can be exercised without cloud services:

```bash
curl -fsS http://localhost:8080/statements/import \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "carrierName": "Northstar Mutual",
    "fileName": "northstar-february.csv",
    "actor": "local-developer",
    "csv": "external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents\nPOL-1001,Acme Manufacturing,2026-02-15,100000,10%,10000"
  }'
```

Required CSV headers are `external_policy_id`, `account_name`, `payment_date`, `premium_cents`, `commission_rate`, and `commission_amount_cents`.

## Policy import API

Policy records can be loaded before statement reconciliation:

```bash
curl -fsS http://localhost:8080/policies/import \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "carrierName": "Northstar Mutual",
    "actor": "local-developer",
    "csv": "external_policy_id,account_name,expected_commission_rate,effective_date\nPOL-1001,Acme Manufacturing,10%,2025-01-01"
  }'
```

Required policy CSV headers are `external_policy_id`, `account_name`, `expected_commission_rate`, and `effective_date`.

## Human review API

Exceptions support review status changes with audit events:

```bash
curl -fsS -X PATCH http://localhost:8080/exceptions/$EXCEPTION_ID/review \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"status":"in_review","actor":"local-reviewer","note":"Investigating carrier rate change"}'
```

Allowed statuses are `open`, `in_review`, and `resolved`.

## Exception report export

Use the browser export button or fetch a CSV report directly:

```bash
curl -fsS http://localhost:8080/exceptions/report.csv \
  -H "authorization: Bearer $TOKEN" \
  -o brokerops-exception-report.csv
```

The report includes exception status, statement evidence, latest AI review summary, confidence, recommendation, and timestamps.

## Cost-conscious architecture

Cost control is treated as a platform requirement.

The platform separates always-on production design from cost-conscious preview infrastructure. Preview resources use smaller footprints, explicit TTL tags, teardown commands, and verification scripts. The production profile keeps the same architectural intent while adjusting defaults for an always-on environment.

## AI-assisted exception review

The AI layer is evidence-grounded. It summarizes reconciliation exceptions using only structured records from PostgreSQL and returns a structured response with summary, likely cause, recommended next step, evidence IDs, confidence, and missing information.

AI reviews also persist prompt version and provider/model metadata. If the structured evidence is incomplete, the AI path returns a controlled `not_enough_information` review instead of inventing context.

## Validation

Run local checks before opening a PR:

```bash
make validate-local
```

This runs Docker Compose configuration validation, TypeScript lint/type checks, tests, and Terraform formatting. It does not create AWS resources.

The preview deploy workflow builds `apps/api/Dockerfile`, pushes the API image to ECR, and passes the immutable image URI into Terraform. Terraform wires the ECS task to the RDS and ElastiCache endpoints, then GitHub Actions runs a one-shot ECS migration task before hitting the preview ALB with the smoke workflow. The Cloudflare Pages workflow separately deploys the static end-user frontend with `NEXT_PUBLIC_API_URL` pointing at the target API. Local `preview-up` and `production-plan` commands require explicit `CONTAINER_IMAGE`, `DATABASE_PASSWORD`, `WORKSPACE_API_KEY`, `AUTH_TOKEN_SECRET`, and `AUTH_ADMIN_PASSWORD` values so cost-bearing deployments do not use placeholder runtime inputs.

## Monetization direction

BrokerOps is not ready for self-serve paid signup yet. The credible monetization path is a paid pilot for a narrow operations workflow:

- starting price target: $750/month after setup for a guided pilot
- buyer: agency or MGA operations/finance owner
- measurable outcome: imported statements, exceptions detected, exceptions reviewed, audit trail captured
- paid-only surface later: real customer imports, saved reconciliation history, AI review, exports, team workflow, and retention history

Before charging broadly, add user authentication, customer administration, production-grade authorization, carrier-specific templates, customer data controls, and a production API URL behind HTTPS.
