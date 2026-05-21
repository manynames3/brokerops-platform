# Database Strategy

BrokerOps supports three database postures:

- local Docker PostgreSQL for repeatable development
- Neon Postgres for low-cost hosted demos
- AWS RDS PostgreSQL for production AWS deployments

## Hosted Demo: Neon Postgres

Neon is used for hosted demos because it provides managed Postgres with low or zero idle cost, making it appropriate for portfolio/demo environments that receive intermittent traffic. RDS remains the recommended production option when the system needs AWS-native private networking, mature operational controls, backups, RDS Proxy, compliance alignment, and predictable always-on workloads.

Use Neon for:

- public portfolio demos
- paid-pilot walkthrough environments with scrubbed or synthetic data
- intermittent traffic where an always-on RDS instance would idle expensively
- fast teardown/recreate workflows outside the AWS preview stack

BrokerOps uses the standard `DATABASE_URL` pattern, so Neon does not require a new database driver. The API uses `node-postgres` (`pg`) connection pools. Neon connection strings must include `sslmode=require` or `sslmode=verify-full`.

Runtime example:

```bash
export NODE_ENV=demo
export DATABASE_URL='postgresql://USER:PASSWORD@EP-NAME-pooler.REGION.aws.neon.tech/neondb?sslmode=require'
export REDIS_URL='redis://example-cache:6379'
export API_ALLOWED_ORIGINS='https://brokerops-platform-web.pages.dev'
export WEB_APP_URL='https://brokerops-platform-web.pages.dev'
export WORKSPACE_API_KEY='replace-with-demo-automation-fallback-key'
export AUTH_TOKEN_SECRET='replace-with-demo-auth-token-secret'
export AUTH_ADMIN_EMAIL='ops@example.com'
export AUTH_ADMIN_PASSWORD='replace-with-demo-admin-password'
```

For a small long-running API process, either Neon direct or pooled connections can work. Prefer the pooled Neon hostname (`-pooler`) for hosted web runtimes that may create multiple concurrent connections. Keep the direct hostname available for migrations and admin operations.

## Production: AWS RDS PostgreSQL

RDS remains the intended production database for the AWS deployment path. The Terraform production profile provisions RDS inside the AWS network and wires the ECS task definition to the generated `DATABASE_URL`.

Use RDS for:

- production workloads that should stay within AWS private networking
- mature operational controls, backup retention, and restore workflows
- compliance-aligned infrastructure review
- predictable always-on traffic
- future RDS Proxy integration and deeper AWS-native observability

The RDS path is intentionally preserved in `infra/terraform/environments/production`. Neon does not replace the production architecture.

## Local Development

Local development stays unchanged:

```bash
cp .env.example .env
make local-up
make local-seed
```

Docker Compose runs PostgreSQL locally and initializes SQL migrations through `packages/db/migrations`.

## Safe Neon Migrations

BrokerOps migrations are plain SQL files in `packages/db/migrations` and run through `pnpm --filter @brokerops/api migrate`.

For Neon, use a direct connection string for migrations:

```bash
export NODE_ENV=demo
export DATABASE_URL='postgresql://USER:PASSWORD@EP-NAME-pooler.REGION.aws.neon.tech/neondb?sslmode=require'
export MIGRATION_DATABASE_URL='postgresql://USER:PASSWORD@EP-NAME.REGION.aws.neon.tech/neondb?sslmode=require'
pnpm --filter @brokerops/api migrate
```

`MIGRATION_DATABASE_URL` is optional for local and RDS environments. It is recommended for Neon so the API can use a pooled runtime URL while migrations use a direct database URL. Do not run migrations against production or customer data until the target database, branch, and credentials are confirmed.

## SSL Compatibility

Neon requires SSL for normal application connections. BrokerOps validates Neon URLs at startup and fails fast when a Neon `DATABASE_URL` or `MIGRATION_DATABASE_URL` is missing `sslmode=require` or `sslmode=verify-full`.

The app uses `pg` with a connection string. `node-postgres` supports SSL parameters in the connection string, including `sslmode=require`, and Neon documents `sslmode=require` in its standard connection URL.

References:

- Neon connection strings: https://neon.com/docs/get-started/connect-neon
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- node-postgres SSL behavior: https://node-postgres.com/features/ssl
