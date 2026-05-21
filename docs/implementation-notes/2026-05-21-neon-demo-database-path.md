# Neon Demo Database Path

## What changed

BrokerOps now documents Neon Postgres as the preferred hosted demo database while preserving RDS PostgreSQL as the production AWS target. The API recognizes `NODE_ENV=demo` as a cloud runtime profile, validates Neon SSL connection strings, and supports `MIGRATION_DATABASE_URL` so migrations can use a direct Neon connection while the runtime uses a pooled connection.

## Why it changed

The AWS ECS/RDS/ElastiCache preview path is useful for proving production architecture, but it can create meaningful idle cost. A public demo needs a cheaper database posture for intermittent traffic without weakening the intended production architecture.

## Tradeoff

Neon is appropriate for hosted demos and pilot walkthroughs, but it is not positioned as the production AWS database in this repo. The tradeoff is maintaining two documented database postures: Neon for low-idle-cost demos and RDS for AWS-native production operations.

## How to validate

```bash
pnpm -r lint
pnpm -r typecheck
pnpm -r test
```

For a live Neon demo, create a Neon project, set `DATABASE_URL` with `sslmode=require`, set `MIGRATION_DATABASE_URL` to the direct Neon URL, run `pnpm --filter @brokerops/api migrate`, then deploy the API with the same environment variables.
