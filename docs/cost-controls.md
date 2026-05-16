# Cost Controls

Cost control is a platform requirement.

BrokerOps separates production capability from non-production operating cost. The preview profile uses the same core architecture path with smaller settings, TTL tags, and teardown verification.

## Cost-aware decisions

- Local development runs without cloud infrastructure.
- Preview environments are short-lived.
- Preview resources include TTL and ownership tags.
- Production profile is separate from preview profile.
- NAT Gateway is avoided in preview.
- RDS is sized differently between preview and production.
- ElastiCache-compatible cache is enabled through a separate module.
- Teardown verification checks for tagged resources.

## Tags

All AWS resources should include:

```text
Project = brokerops-platform
Environment = preview|production
Owner = aiden-rhaa
ManagedBy = terraform
TTL = 24h for preview
```

## Preview teardown

```bash
make preview-down
make verify-teardown
```

## Production cost posture

Production is intentionally not optimized the same way as preview. It prioritizes reliability, backups, observability, and availability. Cost decisions should be evaluated through sizing, reserved capacity, traffic patterns, and operational requirements rather than by weakening core architecture controls.

## Cost runbook

See `runbooks/cost-spike.md`.
