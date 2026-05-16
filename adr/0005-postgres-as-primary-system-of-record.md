# ADR 0005: PostgreSQL as Primary System of Record

## Context

Reconciliation workflows need relational integrity, queryability, audit history, and transactional consistency.

## Decision

Use PostgreSQL as the primary system of record.

## Consequences

The system can model carriers, policies, statement rows, exceptions, AI reviews, and audit events with relational constraints. PostgreSQL observability becomes part of the platform.
