resource "aws_security_group" "cache" {
  name        = "${var.name}-cache"
  description = "BrokerOps cache access"
  vpc_id      = var.vpc_id
  tags        = merge(var.tags, { Name = "${var.name}-cache" })
}

resource "aws_security_group_rule" "cache_ingress" {
  count                    = length(var.allowed_security_group_ids)
  type                     = "ingress"
  security_group_id        = aws_security_group.cache.id
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_ids[count.index]
}

resource "aws_security_group_rule" "cache_egress" {
  type              = "egress"
  security_group_id = aws_security_group.cache.id
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-cache"
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = var.name
  description                = "BrokerOps cache"
  engine                     = "redis"
  node_type                  = var.node_type
  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.cache.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  tags                       = merge(var.tags, { Name = var.name })
}
