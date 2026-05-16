# ADR 0004: Avoid NAT Gateway in Preview

## Context

NAT Gateway can create meaningful baseline cost in short-lived non-production environments.

## Decision

Avoid NAT Gateway in the preview profile. Keep NAT Gateway available in the production profile where private subnet egress may be required.

## Consequences

Preview has a lower baseline cost. Production keeps a more complete private networking path.
