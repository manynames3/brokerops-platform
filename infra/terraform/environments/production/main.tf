terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  name = "brokerops-production"
  tags = {
    Project     = "brokerops-platform"
    Environment = "production"
    Owner       = "aiden-rhaa"
    ManagedBy   = "terraform"
  }

  database_url = "postgres://${module.rds.username}:${urlencode(var.database_password)}@${module.rds.endpoint}/${module.rds.database_name}"
  redis_url    = "rediss://${module.cache.primary_endpoint_address}:6379"
}

module "network" {
  source             = "../../modules/network"
  name               = local.name
  enable_nat_gateway = true
  tags               = local.tags
}

resource "aws_security_group" "service" {
  name        = "${local.name}-runtime-service"
  description = "BrokerOps production ECS service"
  vpc_id      = module.network.vpc_id
  tags        = merge(local.tags, { Name = "${local.name}-runtime-service" })
}

module "ecs_service" {
  source                    = "../../modules/ecs-service"
  name                      = local.name
  vpc_id                    = module.network.vpc_id
  subnet_ids                = module.network.private_subnet_ids
  container_image           = var.container_image
  desired_count             = 2
  cpu                       = 512
  memory                    = 1024
  assign_public_ip          = false
  service_security_group_id = aws_security_group.service.id
  environment = {
    NODE_ENV            = "production"
    AI_PROVIDER         = "managed"
    DATABASE_URL        = local.database_url
    REDIS_URL           = local.redis_url
    API_ALLOWED_ORIGINS = join(",", var.api_allowed_origins)
    WEB_APP_URL         = var.web_app_url
    WORKSPACE_API_KEY   = var.workspace_api_key
    WORKSPACE_NAME      = var.workspace_name
    AUTH_TOKEN_SECRET   = var.auth_token_secret
    AUTH_ADMIN_EMAIL    = var.auth_admin_email
    AUTH_ADMIN_PASSWORD = var.auth_admin_password
  }
  tags = local.tags
}

module "rds" {
  source                     = "../../modules/rds-postgres"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [aws_security_group.service.id]
  instance_class             = "db.t4g.small"
  allocated_storage          = 50
  multi_az                   = true
  backup_retention_period    = 7
  password                   = var.database_password
  tags                       = local.tags
}

module "cache" {
  source                     = "../../modules/cache"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [aws_security_group.service.id]
  node_type                  = "cache.t4g.small"
  num_cache_clusters         = 2
  tags                       = local.tags
}

module "observability" {
  source                  = "../../modules/observability"
  name                    = local.name
  alb_arn_suffix          = module.ecs_service.alb_arn_suffix
  target_group_arn_suffix = module.ecs_service.blue_target_group_arn_suffix
  tags                    = local.tags
}
