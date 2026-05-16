SHELL := /bin/bash
PNPM ?= npx --yes pnpm@9.12.3

.PHONY: local-up local-down local-reset local-seed local-smoke docker-config docker-build-api test lint typecheck terraform-fmt terraform-validate validate-local preview-plan preview-up preview-smoke preview-down production-plan verify-teardown evidence

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
	API_URL=http://localhost:8080 bash scripts/smoke-test.sh

docker-config:
	docker compose config

docker-build-api:
	docker build -f apps/api/Dockerfile -t brokerops-api:local .

test:
	$(PNPM) install
	$(PNPM) -r test

lint:
	$(PNPM) install
	$(PNPM) -r lint

typecheck:
	$(PNPM) install
	$(PNPM) -r typecheck

terraform-fmt:
	terraform fmt -check -recursive infra/terraform

terraform-validate:
	cd infra/terraform/environments/preview && terraform init -backend=false && terraform validate
	cd infra/terraform/environments/production && terraform init -backend=false && terraform validate

validate-local: docker-config lint typecheck test docker-build-api terraform-fmt

preview-plan:
	cd infra/terraform/environments/preview && terraform init && terraform plan -out preview.tfplan -var "container_image=$${CONTAINER_IMAGE:?Set CONTAINER_IMAGE to an API image URI}" -var "database_password=$${DATABASE_PASSWORD:?Set DATABASE_PASSWORD for preview planning}"

preview-up:
	cd infra/terraform/environments/preview && terraform init && terraform apply -auto-approve -var "container_image=$${CONTAINER_IMAGE:?Set CONTAINER_IMAGE to an API image URI}" -var "database_password=$${DATABASE_PASSWORD:?Set DATABASE_PASSWORD for preview apply}"

preview-smoke:
	bash scripts/smoke-test.sh

preview-down:
	cd infra/terraform/environments/preview && terraform destroy -auto-approve

production-plan:
	cd infra/terraform/environments/production && terraform init && terraform plan -out production.tfplan -var "container_image=$${CONTAINER_IMAGE:?Set CONTAINER_IMAGE to an API image URI}" -var "database_password=$${DATABASE_PASSWORD:?Set DATABASE_PASSWORD for production planning}"

verify-teardown:
	bash scripts/verify-teardown.sh

evidence:
	bash scripts/capture-evidence.sh
