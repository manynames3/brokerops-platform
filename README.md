# BrokerOps Platform

BrokerOps Platform is a production-capable insurance back-office reconciliation platform built with TypeScript, Node.js, Next.js, PostgreSQL, Redis-compatible caching, Terraform, ECS, RDS PostgreSQL, CI/CD, blue-green deployment support, observability, AI-assisted exception review, and operational runbooks.

The system models carrier statement ingestion, transaction normalization, reconciliation exceptions, audit history, AI-assisted review, and operational dashboards.

BrokerOps uses environment-aware architecture: local development runs the full application stack through Docker Compose, preview environments validate the AWS deployment path with cost-conscious defaults, and the production profile supports an always-on ECS/RDS/ElastiCache deployment.

## Core workflow

1. Carrier statements are ingested from structured CSV data.
2. Rows are normalized into PostgreSQL.
3. Reconciliation logic matches statement rows against expected policy records.
4. Exceptions are created for mismatches, missing records, duplicates, and unexpected amounts.
5. The AI-assisted review layer explains exceptions using structured evidence only.
6. Review decisions and system events are written to an audit trail.
7. Dashboards and metrics expose workflow health and infrastructure health.

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
make preview-plan
make preview-up
make preview-smoke
make preview-down
```

Preview environments are intentionally short-lived. This is not because the system is incomplete. It is because non-production infrastructure should not create unnecessary idle cost.

### Production profile

```bash
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

## Cost-conscious architecture

Cost control is treated as a platform requirement.

The platform separates always-on production design from cost-conscious preview infrastructure. Preview resources use smaller footprints, explicit TTL tags, teardown commands, and verification scripts. The production profile keeps the same architectural intent while adjusting defaults for an always-on environment.

## AI-assisted exception review

The AI layer is evidence-grounded. It summarizes reconciliation exceptions using only structured records from PostgreSQL and returns a structured response with summary, likely cause, recommended next step, evidence IDs, confidence, and missing information.
