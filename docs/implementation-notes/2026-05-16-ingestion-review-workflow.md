# Implementation Note: Ingestion and Review Workflow

## What Changed

BrokerOps now has a local end-to-end workflow for JSON-wrapped CSV statement imports, CSV validation, transaction normalization into PostgreSQL, deterministic reconciliation, exception creation, evidence-grounded AI review metadata, human review status changes, audit events, and dashboard summary metrics.

The preview deployment path now builds an API container image, pushes it to ECR from GitHub Actions, and passes the immutable image URI into Terraform. Cost-bearing Terraform commands require explicit image and database inputs.

## Why It Changed

The platform claims needed executable behavior behind the core insurance reconciliation workflow. The deterministic reconciliation layer now runs before AI review, giving the AI path structured evidence instead of open-ended input.

## Tradeoff

The first import API accepts CSV inside a JSON request body instead of multipart upload. That keeps local development and smoke testing simple without adding upload middleware. A later production-facing UI can add multipart or object-storage-backed ingestion without changing the normalized reconciliation model.

The API Dockerfile keeps the first image build focused on the API service. CI builds that image before deploy workflows run. A later deployment slice can split web and worker images when the preview environment needs the full multi-service runtime.

Preview teardown verification is intentionally strict: tagged preview resources and preview-prefixed ECR images both fail the check.

## How To Validate

Run:

```bash
make validate-local
```

For full local workflow validation, run:

```bash
make local-up
make local-seed
make local-smoke
```

Do not run `make preview-up` unless AWS resource creation and cost are intended.
