# ADR 0008: Blue-Green Release Boundaries

## Context

Platform releases should reduce risk when API changes are deployed.

## Decision

Provision blue and green target groups and use health checks plus smoke tests before traffic shifts.

## Consequences

The platform has a clear rollout and rollback path. The release process is operationally documented instead of being an ad hoc command sequence.
