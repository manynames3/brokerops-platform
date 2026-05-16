# Developer Experience

BrokerOps treats developer experience as part of the platform.

## Local setup

```bash
cp .env.example .env
make local-up
make local-seed
make local-smoke
```

The local path should give an engineer a working web app, API, worker, PostgreSQL database, cache, seeded data, and health checks.

## Developer goals

- one-command startup
- seeded workflow data
- repeatable database reset
- fast API feedback
- simple smoke checks
- no cloud dependency for routine development
- clear documentation for environment variables

## Commands

```bash
make local-up
make local-down
make local-reset
make local-seed
make local-smoke
make test
make lint
```

## Quality gates

CI should run:

- TypeScript checks
- unit tests
- database migration check
- seed verification
- API smoke check
- Terraform format and validation for infrastructure changes
