# GitHub Repository Presentation

## What changed

The README now opens with GitHub workflow badges, the Cloudflare Pages landing page, repository links, reviewer quick path, and direct links to architecture, deployment, cost controls, security, and runbooks. The repository presentation guidance is documented in `docs/github-repository.md`.

## Why it changed

The GitHub first impression needs to communicate the product and platform value before a reviewer reads implementation details. The landing page link gives hiring managers and pilot prospects a direct way to inspect the end-user workflow.

## Tradeoff

The GitHub About homepage points to the static Cloudflare Pages frontend, not an always-on AWS API. This keeps non-production infrastructure cost-conscious while still exposing the product surface. The README documents that the hosted frontend requires a correctly configured API URL and authenticated API access for live operational data.

## How to validate

```bash
curl -I https://brokerops-platform-web.pages.dev
gh repo view manynames3/brokerops-platform --json description,homepageUrl,repositoryTopics
```
