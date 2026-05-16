# Deployment

BrokerOps supports local development, preview validation, and production deployment profiles.

## Preview path

```bash
make preview-plan
make preview-up
make preview-smoke
make evidence
make preview-down
make verify-teardown
```

## Production path

Production deployment is manual and approval-gated through GitHub Actions.

```bash
make production-plan
```

Production apply should happen through `.github/workflows/deploy-production.yml`.

## Release safety

The ECS module creates blue and green target groups. The rollout runbook explains the expected release path and rollback steps.

See `runbooks/rollback-blue-green.md`.
