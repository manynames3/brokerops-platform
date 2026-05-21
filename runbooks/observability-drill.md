# Runbook: Observability Drill

## Purpose

Prove BrokerOps can be operated by following signals instead of guessing.

## Drill

1. Send a request with an explicit `x-request-id`.
2. Confirm the API returns the same `x-request-id` response header.
3. Confirm `/health` reports database reachability.
4. Confirm `/health/readiness` reports public table detection.
5. Run the authenticated smoke workflow.
6. Confirm audit events are created for statement import, AI review, and human review status change.
7. Review CloudWatch logs or local API logs for the request ID.

## Success criteria

- Every API response includes a request ID.
- Health and readiness checks are separated.
- The operator can connect a failed user action to API logs and audit events.
