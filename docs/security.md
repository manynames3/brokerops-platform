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
- manual approval for production deployment

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
