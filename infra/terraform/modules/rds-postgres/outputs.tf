output "endpoint" {
  value = aws_db_instance.this.endpoint
}

output "database_name" {
  value = var.database_name
}

output "username" {
  value = var.username
}

output "security_group_id" {
  value = aws_security_group.db.id
}
