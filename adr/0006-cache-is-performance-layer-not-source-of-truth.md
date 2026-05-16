# ADR 0006: Cache Is Performance Layer, Not Source of Truth

## Context

Caching can improve dashboard and workflow responsiveness, but reconciliation correctness should not depend on cache availability.

## Decision

Use Redis-compatible caching as a performance layer only. PostgreSQL remains the source of truth.

## Consequences

The system can tolerate cache degradation while preserving workflow correctness.
