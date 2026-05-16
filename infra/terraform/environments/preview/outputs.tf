output "alb_dns_name" {
  value = module.ecs_service.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.ecs_service.cluster_name
}

output "ecs_task_definition_arn" {
  value = module.ecs_service.task_definition_arn
}

output "ecs_service_name" {
  value = module.ecs_service.service_name
}

output "ecs_service_security_group_id" {
  value = aws_security_group.service.id
}

output "ecs_service_subnet_ids_csv" {
  value = join(",", module.network.public_subnet_ids)
}

output "ecs_assign_public_ip" {
  value = "ENABLED"
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "cache_endpoint" {
  value     = module.cache.primary_endpoint_address
  sensitive = true
}
