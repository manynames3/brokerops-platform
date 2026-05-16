# ADR 0002: Cost-Conscious Preview Environments

## Context

Non-production cloud infrastructure can create hidden idle cost when it is left running without active validation work.

## Decision

Preview environments are short-lived, tagged, and verified after teardown.

## Consequences

The platform can prove the AWS deployment path while avoiding unnecessary non-production spend. Production capability remains separate from preview cost controls.
