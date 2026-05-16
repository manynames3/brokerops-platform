# Cloudflare Pages Frontend

## What changed

The BrokerOps web app now supports a static Next.js export for Cloudflare Pages. The dashboard fetches operational data from `NEXT_PUBLIC_API_URL` in the browser, and the manual deployment workflow uploads `apps/web/out` to a Cloudflare Pages project.

## Why it changed

The end-user UI needs an independent frontend deployment path before preview or production API rollout. Cloudflare Pages gives the static dashboard a low-operations hosting target while the API remains on the AWS ECS/RDS/ElastiCache deployment path.

## Tradeoff

The first Cloudflare Pages path is static and client-side data driven. That avoids adding a Cloudflare server runtime now, but it means API CORS and the public API URL must be configured correctly for each environment.

## How to validate

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080 pnpm --filter @brokerops/web build
```

To deploy, run `.github/workflows/deploy-web-cloudflare-pages.yml` with the public BrokerOps API URL after configuring `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets.
