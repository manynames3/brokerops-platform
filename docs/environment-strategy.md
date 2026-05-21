# Environment Strategy

BrokerOps is designed around local, hosted demo, preview, and production profiles.

## Local development

Full application stack through Docker Compose.

Goals:

- fast onboarding
- deterministic data
- no cloud dependency for routine development
- hot reload for web and API services
- local PostgreSQL and Redis-compatible cache
- local admin credentials for authenticated demo data

## Preview

AWS deployment with cost-conscious defaults.

Goals:

- validate infrastructure path
- run release verification
- capture operational evidence
- verify smoke tests and health checks
- tear down when validation is complete
- require explicit workspace and auth configuration

Preview environments are intentionally short-lived. This is a platform decision that prevents idle non-production infrastructure from becoming a hidden operating cost.

## Hosted demo

Low-idle-cost online demo backed by Neon Postgres and the existing API runtime.

Goals:

- keep a public product demo available without running RDS continuously
- use standard `DATABASE_URL` configuration
- require explicit auth, workspace, database, and cache configuration
- preserve the AWS RDS path for production
- run migrations through a direct Neon URL before public walkthroughs

Hosted demos are for portfolio review, buyer walkthroughs, and short paid-pilot evaluation. They are not a replacement for the production AWS profile.

## Production

Always-on AWS deployment profile.

Goals:

- production-oriented scaling
- private database access
- managed cache
- CloudWatch alarms
- backup retention
- blue-green release path
- explicit workspace and auth configuration for production access
- operational runbooks
- manual deployment approval
