# Cloudflare Pages Frontend

## What changed

The BrokerOps web app now supports a static Next.js export for Cloudflare Pages. The dashboard fetches operational data from `NEXT_PUBLIC_API_URL` in the browser, sends `NEXT_PUBLIC_WORKSPACE_KEY` with operational requests, and the manual deployment workflow uploads `apps/web/out` to a Cloudflare Pages project.

## Why it changed

The end-user UI needs an independent frontend deployment path before preview or production API rollout. Cloudflare Pages gives the static dashboard a low-operations hosting target while the API remains on the AWS ECS/RDS/ElastiCache deployment path.

## Tradeoff

The first Cloudflare Pages path is static and client-side data driven. That avoids adding a Cloudflare server runtime now, but it means API CORS, the public API URL, and the workspace key must be configured correctly for each environment. The workspace key is a controlled-demo boundary, not production user authentication.

## How to validate

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080 NEXT_PUBLIC_WORKSPACE_KEY=brokerops-local-demo-key pnpm --filter @brokerops/web build
```

To deploy, run `.github/workflows/deploy-web-cloudflare-pages.yml` with the public BrokerOps API URL and matching workspace inputs after configuring `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets.
