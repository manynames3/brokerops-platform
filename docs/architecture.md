# Architecture

BrokerOps Platform separates product workflow concerns from platform concerns.

## Product workflow

- Carrier statement ingestion
- CSV validation
- Transaction normalization
- Policy matching
- Reconciliation exception creation
- AI-assisted exception review
- Human review and audit history

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
  -> Next.js web
  -> Node.js API
  -> PostgreSQL
  -> Redis-compatible cache
  -> Worker
```

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
- policies
- statement_files
- statement_rows
- reconciliation_exceptions
- ai_reviews
- audit_events

## API workflow boundaries

- `POST /statements/import` validates CSV input, normalizes statement rows into PostgreSQL, runs deterministic reconciliation, creates exceptions, and records audit events in a single transaction.
- `GET /dashboard/summary` exposes operational counts for the dashboard.
- `POST /exceptions/:id/ai-review` creates an evidence-grounded review from database records only.
- `PATCH /exceptions/:id/review` records human workflow status changes and audit metadata.

## AI review boundary

The AI review layer receives structured evidence. It does not query unrestricted data. Outputs are stored with evidence IDs, provider, prompt version, provider/model metadata, confidence, and missing information. If required evidence is absent, the service returns `not_enough_information` and records the missing fields.

## Release path

Blue and green target groups are part of the ECS service module. The rollout process requires:

1. build image
2. push image
3. update inactive target group
4. verify health checks
5. run smoke tests
6. shift listener traffic
7. monitor alarms
8. rollback if health checks fail
