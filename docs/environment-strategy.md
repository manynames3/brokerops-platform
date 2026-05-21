# Environment Strategy

BrokerOps is designed around three deployment profiles.

## Local development

Full application stack through Docker Compose.

Goals:

- fast onboarding
- deterministic data
- no cloud dependency for routine development
- hot reload for web and API services
- local PostgreSQL and Redis-compatible cache
- local workspace key for controlled demo data

## Preview

AWS deployment with cost-conscious defaults.

Goals:

- validate infrastructure path
- run release verification
- capture operational evidence
- verify smoke tests and health checks
- tear down when validation is complete
- require explicit workspace key configuration

Preview environments are intentionally short-lived. This is a platform decision that prevents idle non-production infrastructure from becoming a hidden operating cost.

## Production

Always-on AWS deployment profile.

Goals:

- production-oriented scaling
- private database access
- managed cache
- CloudWatch alarms
- backup retention
- blue-green release path
- explicit workspace key configuration until full authentication is implemented
- operational runbooks
- manual deployment approval
