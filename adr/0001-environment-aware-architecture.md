# ADR 0001: Environment-Aware Architecture

## Context

BrokerOps needs to support fast local development, cloud validation, and always-on production deployment without treating every environment the same.

## Decision

Use separate local development, preview, and production profiles.

## Consequences

Local development stays fast and inexpensive. Preview validates the AWS path with cost-conscious defaults. Production keeps production-oriented defaults for availability, observability, and operational controls.
