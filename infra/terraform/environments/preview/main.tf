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
  name = "brokerops-preview"
  tags = {
    Project     = "brokerops-platform"
    Environment = "preview"
    Owner       = "aiden-rhaa"
    TTL         = "24h"
    ManagedBy   = "terraform"
  }

  database_url = "postgres://${module.rds.username}:${urlencode(var.database_password)}@${module.rds.endpoint}/${module.rds.database_name}"
  redis_url    = "rediss://${module.cache.primary_endpoint_address}:6379"
}

module "network" {
  source             = "../../modules/network"
  name               = local.name
  enable_nat_gateway = false
  tags               = local.tags
}

resource "aws_security_group" "service" {
  name        = "${local.name}-runtime-service"
  description = "BrokerOps preview ECS service"
  vpc_id      = module.network.vpc_id
  tags        = merge(local.tags, { Name = "${local.name}-runtime-service" })
}

module "ecs_service" {
  source                    = "../../modules/ecs-service"
  name                      = local.name
  vpc_id                    = module.network.vpc_id
  subnet_ids                = module.network.public_subnet_ids
  container_image           = var.container_image
  desired_count             = 1
  cpu                       = 256
  memory                    = 512
  assign_public_ip          = true
  service_security_group_id = aws_security_group.service.id
  environment = {
    NODE_ENV            = "preview"
    AI_PROVIDER         = "local"
    DATABASE_URL        = local.database_url
    REDIS_URL           = local.redis_url
    API_ALLOWED_ORIGINS = join(",", var.api_allowed_origins)
    WEB_APP_URL         = var.web_app_url
    WORKSPACE_API_KEY   = var.workspace_api_key
    WORKSPACE_NAME      = var.workspace_name
  }
  tags = local.tags
}

module "rds" {
  source                     = "../../modules/rds-postgres"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [aws_security_group.service.id]
  instance_class             = "db.t4g.micro"
  allocated_storage          = 20
  multi_az                   = false
  backup_retention_period    = 1
  password                   = var.database_password
  tags                       = local.tags
}

module "cache" {
  source                     = "../../modules/cache"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [aws_security_group.service.id]
  node_type                  = "cache.t4g.micro"
  num_cache_clusters         = 1
  tags                       = local.tags
}

module "observability" {
  source                  = "../../modules/observability"
  name                    = local.name
  alb_arn_suffix          = module.ecs_service.alb_arn_suffix
  target_group_arn_suffix = module.ecs_service.blue_target_group_arn_suffix
  tags                    = local.tags
}
