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
}

module "network" {
  source             = "../../modules/network"
  name               = local.name
  enable_nat_gateway = true
  tags               = local.tags
}

module "ecs_service" {
  source           = "../../modules/ecs-service"
  name             = local.name
  vpc_id           = module.network.vpc_id
  subnet_ids       = module.network.private_subnet_ids
  container_image  = var.container_image
  desired_count    = 2
  cpu              = 512
  memory           = 1024
  assign_public_ip = false
  environment = {
    NODE_ENV    = "production"
    AI_PROVIDER = "managed"
  }
  tags = local.tags
}

module "rds" {
  source                     = "../../modules/rds-postgres"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [module.ecs_service.service_security_group_id]
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
  allowed_security_group_ids = [module.ecs_service.service_security_group_id]
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
