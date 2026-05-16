# 0009: Deterministic Reconciliation Before AI Review

## Status

Accepted

## Context

BrokerOps uses AI-assisted exception review, but insurance reconciliation decisions need auditability and repeatability. AI output should explain structured evidence, not decide whether a transaction matched policy expectations.

## Decision

CSV ingestion runs deterministic validation, normalization, policy matching, duplicate detection, account matching, and commission variance classification before any AI review is created.

AI review receives only structured database evidence for an existing exception. If required evidence is missing, the review path returns `not_enough_information` and records missing fields.

## Consequences

- Business logic can be tested without an AI provider.
- AI outputs remain evidence-grounded and auditable.
- Human reviewers can inspect deterministic exception records before reading an AI summary.
- Future external model providers can be added without changing reconciliation decisions.
