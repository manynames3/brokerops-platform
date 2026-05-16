SHELL := /bin/bash

.PHONY: local-up local-down local-reset local-seed local-smoke test lint preview-plan preview-up preview-smoke preview-down production-plan verify-teardown evidence

local-up:
	docker compose up --build

local-down:
	docker compose down

local-reset:
	docker compose down -v
	docker compose up --build

local-seed:
	docker compose exec api pnpm --filter @brokerops/db seed

local-smoke:
	curl -fsS http://localhost:8080/health
	curl -fsS http://localhost:8080/exceptions

test:
	corepack enable
	pnpm install
	pnpm -r test

lint:
	corepack enable
	pnpm install
	pnpm -r lint

preview-plan:
	cd infra/terraform/environments/preview && terraform init && terraform plan -out preview.tfplan

preview-up:
	cd infra/terraform/environments/preview && terraform init && terraform apply -auto-approve

preview-smoke:
	bash scripts/smoke-test.sh

preview-down:
	cd infra/terraform/environments/preview && terraform destroy -auto-approve

production-plan:
	cd infra/terraform/environments/production && terraform init && terraform plan -out production.tfplan

verify-teardown:
	bash scripts/verify-teardown.sh

evidence:
	bash scripts/capture-evidence.sh
