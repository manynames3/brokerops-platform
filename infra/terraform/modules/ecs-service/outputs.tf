output "service_security_group_id" {
  value = local.service_security_group_id
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.api.arn
}

output "service_name" {
  value = aws_ecs_service.api.name
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "alb_arn_suffix" {
  value = aws_lb.this.arn_suffix
}

output "blue_target_group_arn" {
  value = aws_lb_target_group.blue.arn
}

output "blue_target_group_arn_suffix" {
  value = aws_lb_target_group.blue.arn_suffix
}

output "green_target_group_arn" {
  value = aws_lb_target_group.green.arn
}
