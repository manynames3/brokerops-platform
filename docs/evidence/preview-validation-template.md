# Preview Validation Template

Use this template after a cost-approved preview deployment. Do not run preview apply commands unless AWS resource creation is intended.

## Required evidence

- Git commit SHA under validation
- Terraform plan summary
- ECS service name, task definition ARN, and stable service status
- RDS endpoint identifier without credentials
- Cache endpoint identifier without credentials
- ALB DNS name or HTTPS API URL
- `/health` response
- `/health/readiness` response
- Authenticated smoke test output
- Cloudflare Pages deployment URL
- CloudWatch alarm state
- Teardown command output
- Teardown verification output

## Capture command

```bash
API_URL=https://api.example.com \
WEB_URL=https://brokerops-platform-web.pages.dev \
bash scripts/capture-preview-evidence.sh
```

## Acceptance criteria

- API health and readiness return successful JSON responses.
- Smoke test proves sign-in, policy import, statement import, exception creation, AI review, human review, audit trail, and export readiness.
- Preview resources are torn down when validation is complete.
- Evidence file is committed without secrets.
