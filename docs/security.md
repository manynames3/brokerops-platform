# Security

BrokerOps uses security controls that are appropriate for a production-capable SaaS platform foundation.

## Controls

- private database design
- least-privilege IAM roles
- encrypted RDS storage
- encrypted cache storage and transit path
- secrets supplied through environment-specific configuration
- audit events for system actions
- provider and prompt version tracking for AI reviews
- provider/model metadata for AI reviews
- security group boundaries between ALB, service, database, and cache
- Cloudflare Pages static frontend with baseline browser security headers
- environment-aware API CORS allowlist through `API_ALLOWED_ORIGINS`
- signed user sessions for operational API routes
- workspace-scoped automation fallback through `x-brokerops-workspace-key`
- manual approval for production deployment

## Current product security boundary

The current end-user UI is suitable for local and controlled pilot workflows. Operational API routes require a signed user session and scope records to the user's configured organization. The workspace key remains only as an automation fallback for controlled smoke tests and should not be treated as an end-user production boundary.

The product is not ready for broad paid customer use until customer administration, invite/recovery flows, production-grade role management, data retention controls, and customer data handling policies are added.

Demo, preview, and production API runtimes must receive explicit `DATABASE_URL`, `REDIS_URL`, `API_ALLOWED_ORIGINS`, `WORKSPACE_API_KEY`, `AUTH_TOKEN_SECRET`, and `AUTH_ADMIN_PASSWORD` values. The API intentionally does not fall back to localhost database, cache, workspace, or auth defaults in cloud profiles. Neon-backed demos must use `sslmode=require` or `sslmode=verify-full` in `DATABASE_URL` and `MIGRATION_DATABASE_URL`.

The API root endpoint returns service metadata and the configured `WEB_APP_URL`. Do not put secrets, internal hostnames, or customer-specific details in that value.

## AI review guardrails

The AI-assisted review path uses structured evidence only. The system stores:

- exception ID
- evidence IDs
- prompt version
- provider
- model metadata
- confidence
- missing information
- generated summary
- recommended next step

This design keeps the AI layer reviewable and auditable.

If structured evidence is missing, the review path records a `not_enough_information` response and lists the missing fields instead of generating unsupported analysis.
