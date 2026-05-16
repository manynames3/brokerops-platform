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
- local CSV import path for reconciliation workflow testing
- audit-backed human review status updates

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
make validate-local
```

`make preview-plan`, `make preview-up`, and `make production-plan` require explicit `CONTAINER_IMAGE` and `DATABASE_PASSWORD` values. This keeps cost-bearing infrastructure commands environment-aware and avoids placeholder runtime deployments.

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
