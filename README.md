# BrokerOps Platform

BrokerOps Platform is a production-capable insurance back-office reconciliation platform built with TypeScript, Node.js, Next.js, PostgreSQL, Redis-compatible caching, Terraform, ECS, RDS PostgreSQL, CI/CD, blue-green deployment support, observability, AI-assisted exception review, and operational runbooks.

The system models carrier statement ingestion, transaction normalization, reconciliation exceptions, audit history, AI-assisted review, and operational dashboards.

BrokerOps uses environment-aware architecture: local development runs the full application stack through Docker Compose, preview environments validate the AWS deployment path with cost-conscious defaults, and the production profile supports an always-on ECS/RDS/ElastiCache deployment.

## Core workflow

1. Carrier statements are ingested from structured CSV data.
2. CSV rows are validated before any database writes occur.
3. Rows are normalized into PostgreSQL.
4. Reconciliation logic matches statement rows against expected policy records.
5. Exceptions are created for mismatches, missing records, duplicate payments, account mismatches, and unexpected amounts.
6. The AI-assisted review layer explains exceptions using structured evidence only.
7. Human review decisions and system events are written to an audit trail.
8. Dashboards and metrics expose workflow health and infrastructure health.

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

## End-user frontend

The end-user dashboard is a static-export Next.js app that can be deployed to Cloudflare Pages. It reads `NEXT_PUBLIC_API_URL` at build time and calls the deployed BrokerOps API from the browser.

```bash
export NEXT_PUBLIC_API_URL=https://api.example.com
make web-build
```

The manual GitHub workflow `.github/workflows/deploy-web-cloudflare-pages.yml` publishes `apps/web/out` to Cloudflare Pages. It expects `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets, plus an optional `CLOUDFLARE_PAGES_PROJECT` repository variable. The default Pages project name is `brokerops-platform-web`.

## Statement import API

Local development supports JSON-wrapped CSV imports so the workflow can be exercised without cloud services:

```bash
curl -fsS http://localhost:8080/statements/import \
  -H 'content-type: application/json' \
  -d '{
    "carrierName": "Northstar Mutual",
    "fileName": "northstar-february.csv",
    "actor": "local-developer",
    "csv": "external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents\nPOL-1001,Acme Manufacturing,2026-02-15,100000,10%,10000"
  }'
```

Required CSV headers are `external_policy_id`, `account_name`, `payment_date`, `premium_cents`, `commission_rate`, and `commission_amount_cents`.

## Human review API

Exceptions support review status changes with audit events:

```bash
curl -fsS -X PATCH http://localhost:8080/exceptions/$EXCEPTION_ID/review \
  -H 'content-type: application/json' \
  -d '{"status":"in_review","actor":"local-reviewer","note":"Investigating carrier rate change"}'
```

Allowed statuses are `open`, `in_review`, and `resolved`.

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

The preview deploy workflow builds `apps/api/Dockerfile`, pushes the API image to ECR, and passes the immutable image URI into Terraform. Terraform wires the ECS task to the RDS and ElastiCache endpoints, then GitHub Actions runs a one-shot ECS migration task before hitting the preview ALB with the smoke workflow. The Cloudflare Pages workflow separately deploys the static end-user frontend with `NEXT_PUBLIC_API_URL` pointing at the target API. Local `preview-up` and `production-plan` commands require explicit `CONTAINER_IMAGE` and `DATABASE_PASSWORD` values so cost-bearing deployments do not use placeholder runtime inputs.
