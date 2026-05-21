# Sellable MVP Demo Workflow

## What changed

The web app now presents BrokerOps as an insurance operations reconciliation product with a guided sample workflow, request-access CTA, API connectivity state, workspace authorization state, policy import form, statement import form, validation feedback, recent imports, exception queue, exception detail view, evidence-grounded AI review creation, human review status updates, audit trail visibility, and CSV exception report export.

The API runtime configuration now uses environment-aware CORS through `API_ALLOWED_ORIGINS`, refuses localhost database/cache fallbacks in preview and production profiles, and requires explicit automation fallback and auth secrets for cloud runtimes. Operational routes require a signed user session and scope carriers, policies, statements, exceptions, AI reviews, metrics, and report exports to the user's organization. Terraform passes the allowed frontend origins, public web app URL, automation fallback key, workspace name, and auth secrets into ECS tasks.

## Why it changed

The product-readiness audit showed that the platform logic existed, but a stranger could not understand or try the core workflow without curl commands and repo context. This change makes the smallest credible demo path visible through the existing frontend while keeping the deterministic reconciliation and audit-backed review model intact. Policy setup and report export were added because buyers need to see both the input source of truth and the output artifact.

## Tradeoff

This is not full paid SaaS readiness. Customer administration, carrier-specific onboarding, production-grade role management, and billing are intentionally deferred. The request-access CTA supports paid-pilot conversations without pretending that self-serve payments are implemented. If no request-access URL is configured, the CTA stays on-page instead of using a placeholder contact address.

## How to validate

```bash
pnpm --filter @brokerops/web typecheck
pnpm --filter @brokerops/api typecheck
pnpm -r test
NEXT_PUBLIC_API_URL=http://localhost:8080 NEXT_PUBLIC_DEMO_EMAIL=ops@brokerops.local pnpm --filter @brokerops/web build
```

For browser workflow validation, run local services and seed data:

```bash
make local-up
make local-seed
```

Then open `http://localhost:3000`, import the sample policy CSV, import the sample statement CSV, select an exception, create an AI review, save a human review status, export the report, and confirm audit events are visible.
