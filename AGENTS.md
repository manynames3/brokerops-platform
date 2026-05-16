# BrokerOps Platform - Agent Instructions

## Product Identity

BrokerOps Platform is a production-capable insurance back-office reconciliation platform.

Use serious platform language: production-capable, environment-aware, operationally documented, preview environment, production profile, local development, cost-conscious non-production infrastructure, deployment path, reliability, observability, and runbooks.

Do not describe it as a lightweight exercise, placeholder, or throwaway build.

## Target Audience

The system should impress a hiring manager evaluating a first Platform Engineer candidate for a fast-growing SaaS company using TypeScript, Node.js, React, Next.js, PostgreSQL, Redis-compatible caching, AWS ECS, AWS RDS PostgreSQL, Terraform, CI/CD, monitoring and alerting, blue-green deployment support, developer experience improvements, and cost-conscious architecture.

## Core Product Workflow

Build around this workflow:

1. Carrier statement ingestion
2. CSV validation
3. Transaction normalization into PostgreSQL
4. Reconciliation against expected policy/account records
5. Exception detection
6. Evidence-grounded AI exception review
7. Human review workflow
8. Audit trail
9. Operational dashboard
10. System health visibility

The platform layer is as important as the application layer.

## Engineering Principles

Prioritize clear domain modeling, deterministic reconciliation logic before AI, evidence-grounded AI outputs, PostgreSQL-first data design, observable workflows, repeatable local development, environment-aware architecture, cost-conscious preview infrastructure, production-capable Terraform modules, runbooks for failure modes, tests around critical business logic, and small reviewable commits.

Avoid unsupported claims, fake enterprise scale language, unnecessary complexity, always-on cloud assumptions for non-production environments, committed secrets, AI features that invent facts, and infrastructure changes without documentation.

## AI Feature Boundaries

The AI feature must explain reconciliation exceptions using only structured evidence from the database.

AI responses must include summary, likely cause, recommended next step, evidence IDs, confidence, missing information, prompt version, and provider/model metadata.

AI output must be saved to an audit table. If evidence is missing, the AI path should return a controlled "not enough information" response.

## Environment Strategy

The system supports:

1. Local development through Docker Compose
2. Preview AWS deployment path with cost-conscious defaults
3. Production ECS/RDS/ElastiCache-capable infrastructure profile with operational controls

Position preview cost controls as responsible non-production architecture, not as a limitation.

## Documentation Expectations

When making meaningful changes, update the relevant README, docs, runbooks, and ADRs.

Add a short implementation note explaining what changed, why it changed, what tradeoff was made, and how to validate it. Provide concise implementation rationale only.

## Validation Expectations

After changes, run the most relevant available checks:

- `pnpm install` if needed
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`
- `docker compose config`
- `make local-up` when practical
- `make local-smoke` when available

Do not run `make preview-up`, `terraform apply`, or production deploy commands unless the user explicitly approves AWS resource creation and cost.
