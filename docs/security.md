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
- workspace-scoped operational API routes through `x-brokerops-workspace-key`
- manual approval for production deployment

## Current product security boundary

The current end-user UI is suitable for local and controlled demo workflows. Operational API routes require `x-brokerops-workspace-key` and scope records to a configured organization. This prevents the product demo from operating against a global shared queue, but it is not a replacement for production user authentication or customer-level authorization because the static frontend must know the workspace key it sends.

The product is not ready for broad paid customer use until user authentication, customer administration, production-grade authorization, data retention controls, and customer data handling policies are added.

Preview and production API runtimes must receive explicit `DATABASE_URL`, `REDIS_URL`, `API_ALLOWED_ORIGINS`, and `WORKSPACE_API_KEY` values. The API intentionally does not fall back to localhost database, cache, or workspace defaults in cloud profiles.

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
