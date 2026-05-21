# Sellable MVP Demo Workflow

## What changed

The web app now presents BrokerOps as an insurance operations reconciliation product with a guided sample workflow, request-access CTA, API connectivity state, workspace authorization state, policy import form, statement import form, validation feedback, recent imports, exception queue, exception detail view, evidence-grounded AI review creation, human review status updates, audit trail visibility, and CSV exception report export.

The API runtime configuration now uses environment-aware CORS through `API_ALLOWED_ORIGINS`, refuses localhost database/cache fallbacks in preview and production profiles, and requires `WORKSPACE_API_KEY` for cloud runtimes. Operational routes require `x-brokerops-workspace-key` and scope carriers, policies, statements, exceptions, AI reviews, metrics, and report exports to the configured workspace organization. Terraform passes the allowed frontend origins, public web app URL, workspace key, and workspace name into ECS tasks.

## Why it changed

The product-readiness audit showed that the platform logic existed, but a stranger could not understand or try the core workflow without curl commands and repo context. This change makes the smallest credible demo path visible through the existing frontend while keeping the deterministic reconciliation and audit-backed review model intact. Policy setup and report export were added because buyers need to see both the input source of truth and the output artifact.

## Tradeoff

This is not full paid SaaS readiness. The workspace key is a controlled-demo boundary, not production user authentication, because the static frontend must know the key it sends. User authentication, customer administration, carrier-specific onboarding, production-grade authorization, and billing are intentionally deferred. The request-access CTA supports paid-pilot conversations without pretending that self-serve payments are implemented. If no request-access URL is configured, the CTA stays on-page instead of using a placeholder contact address.

## How to validate

```bash
pnpm --filter @brokerops/web typecheck
pnpm --filter @brokerops/api typecheck
pnpm -r test
NEXT_PUBLIC_API_URL=http://localhost:8080 NEXT_PUBLIC_WORKSPACE_KEY=brokerops-local-demo-key pnpm --filter @brokerops/web build
```

For browser workflow validation, run local services and seed data:

```bash
make local-up
make local-seed
```

Then open `http://localhost:3000`, import the sample policy CSV, import the sample statement CSV, select an exception, create an AI review, save a human review status, export the report, and confirm audit events are visible.
