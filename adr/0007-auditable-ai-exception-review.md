# ADR 0007: Auditable AI Exception Review

## Context

AI assistance in financial operations must be explainable, bounded, and reviewable.

## Decision

AI reviews use structured evidence, return structured outputs, and write prompt version, provider, evidence IDs, confidence, and missing information to PostgreSQL.

## Consequences

AI output can support human review without becoming an untraceable decision path.
