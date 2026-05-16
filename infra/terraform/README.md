# Terraform

BrokerOps infrastructure is organized around environment profiles and reusable modules.

## Environments

- `preview`: cost-conscious AWS validation path with explicit teardown expectations.
- `production`: always-on deployment profile with production-oriented defaults.

## Modules

- `network`: VPC, subnets, routes, optional NAT path.
- `rds-postgres`: RDS PostgreSQL profile.
- `cache`: ElastiCache-compatible caching profile.
- `ecs-service`: ECS cluster, service, target groups, and load balancer boundaries.
- `observability`: CloudWatch alarms and log groups.

## Cost-control expectations

Preview resources must be tagged, short-lived, and verified after teardown.

Production resources are sized and configured separately so cost controls do not weaken the production path.
