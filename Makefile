SHELL := /bin/bash
PNPM ?= npx --yes pnpm@9.12.3

.PHONY: local-up local-down local-reset local-seed local-smoke docker-config docker-build-api web-build test lint typecheck terraform-fmt terraform-validate validate-local preview-plan preview-up preview-migrate preview-smoke preview-down production-plan production-migrate verify-teardown evidence

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

web-build:
	NEXT_PUBLIC_API_URL=$${NEXT_PUBLIC_API_URL:-http://localhost:8080} $(PNPM) --filter @brokerops/web build

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
	$(MAKE) preview-migrate

preview-migrate:
	export ECS_CLUSTER_NAME="$$(terraform -chdir=infra/terraform/environments/preview output -raw ecs_cluster_name)" && \
	export ECS_TASK_DEFINITION_ARN="$$(terraform -chdir=infra/terraform/environments/preview output -raw ecs_task_definition_arn)" && \
	export ECS_SUBNET_IDS="$$(terraform -chdir=infra/terraform/environments/preview output -raw ecs_service_subnet_ids_csv)" && \
	export ECS_SECURITY_GROUP_ID="$$(terraform -chdir=infra/terraform/environments/preview output -raw ecs_service_security_group_id)" && \
	export ECS_ASSIGN_PUBLIC_IP="$$(terraform -chdir=infra/terraform/environments/preview output -raw ecs_assign_public_ip)" && \
	bash scripts/run-ecs-migration.sh

preview-smoke:
	API_URL=http://$$(terraform -chdir=infra/terraform/environments/preview output -raw alb_dns_name) bash scripts/smoke-test.sh

preview-down:
	cd infra/terraform/environments/preview && terraform destroy -auto-approve

production-plan:
	cd infra/terraform/environments/production && terraform init && terraform plan -out production.tfplan -var "container_image=$${CONTAINER_IMAGE:?Set CONTAINER_IMAGE to an API image URI}" -var "database_password=$${DATABASE_PASSWORD:?Set DATABASE_PASSWORD for production planning}"

production-migrate:
	export ECS_CLUSTER_NAME="$$(terraform -chdir=infra/terraform/environments/production output -raw ecs_cluster_name)" && \
	export ECS_TASK_DEFINITION_ARN="$$(terraform -chdir=infra/terraform/environments/production output -raw ecs_task_definition_arn)" && \
	export ECS_SUBNET_IDS="$$(terraform -chdir=infra/terraform/environments/production output -raw ecs_service_subnet_ids_csv)" && \
	export ECS_SECURITY_GROUP_ID="$$(terraform -chdir=infra/terraform/environments/production output -raw ecs_service_security_group_id)" && \
	export ECS_ASSIGN_PUBLIC_IP="$$(terraform -chdir=infra/terraform/environments/production output -raw ecs_assign_public_ip)" && \
	bash scripts/run-ecs-migration.sh

verify-teardown:
	bash scripts/verify-teardown.sh

evidence:
	bash scripts/capture-evidence.sh
