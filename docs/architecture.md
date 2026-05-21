# Architecture

BrokerOps Platform separates product workflow concerns from platform concerns.

## Product workflow

- Carrier statement ingestion
- Policy record import
- CSV validation
- Transaction normalization
- Policy matching
- Reconciliation exception creation
- AI-assisted exception review
- Human review and audit history
- Exception report export

## Platform responsibilities

- repeatable infrastructure through Terraform
- local developer experience through Docker Compose
- service deployment through ECS
- database persistence through RDS PostgreSQL
- cache path through Redis-compatible infrastructure
- release safety through blue-green target groups and smoke tests
- observability through logs, metrics, alarms, and PostgreSQL query analysis
- operational readiness through runbooks

## Service boundaries

```text
Browser
  -> Cloudflare Pages static Next.js web
  -> Workspace-scoped operational API requests
  -> Node.js API
  -> PostgreSQL
  -> Redis-compatible cache
  -> Worker
```

The end-user dashboard is exported as static assets and deployed through Cloudflare Pages. The browser calls the deployed BrokerOps API through a build-time `NEXT_PUBLIC_API_URL`, keeping frontend delivery separate from the PostgreSQL-backed API runtime. Operators sign in through `POST /auth/login`; operational requests include a bearer session token, and the API scopes dashboard metrics, policy records, statement files, exceptions, AI reviews, and exports to the signed-in user's organization. The first user-facing workflow supports policy record import, CSV file upload, sample statement import, validation feedback, reconciliation queue review, evidence-grounded AI review creation, human status updates, audit trail inspection, and exception report export.

AWS profile:

```text
GitHub Actions
  -> ECR
  -> ECS service
  -> ALB
  -> RDS PostgreSQL
  -> ElastiCache-compatible cache
  -> CloudWatch
```

## Data model

Primary tables:

- carriers
- organizations
- app_users
- policies
- statement_files
- statement_rows
- reconciliation_exceptions
- ai_reviews
- audit_events

## API workflow boundaries

- `POST /statements/import` validates CSV input, normalizes statement rows into PostgreSQL, runs deterministic reconciliation, creates exceptions, and records audit events in a single transaction.
- `POST /auth/login` verifies operator credentials and returns a signed session token.
- `POST /policies/import` validates expected policy records and upserts them before statement reconciliation.
- `GET /dashboard/summary` exposes operational counts for the dashboard.
- `POST /exceptions/:id/ai-review` creates an evidence-grounded review from database records only.
- `PATCH /exceptions/:id/review` records human workflow status changes and audit metadata.
- `GET /exceptions/report.csv` exports the current exception queue with latest AI review evidence for follow-up.

All operational workflow endpoints require an authenticated user session. `GET /health`, `GET /health/readiness`, `GET /auth/bootstrap`, and `GET /` remain public so deployment automation can verify service health and discover metadata without customer data access.

## AI review boundary

The AI review layer receives structured evidence. It does not query unrestricted data. Outputs are stored with evidence IDs, provider, prompt version, provider/model metadata, confidence, and missing information. If required evidence is absent, the service returns `not_enough_information` and records the missing fields.

## Release path

Blue and green target groups are part of the ECS service module. The rollout process requires:

1. build image
2. push image
3. apply environment-aware Terraform
4. run database migrations from an ECS task in the target VPC
5. update inactive target group
6. verify health checks
7. run smoke tests against the deployed ALB
8. shift listener traffic
9. monitor alarms
10. rollback if health checks fail
