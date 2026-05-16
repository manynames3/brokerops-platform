output "alb_dns_name" {
  value = module.ecs_service.alb_dns_name
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "cache_endpoint" {
  value     = module.cache.primary_endpoint_address
  sensitive = true
}
