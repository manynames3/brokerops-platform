# ADR 0003: ECS for Service Runtime

## Context

The platform needs an AWS container runtime aligned with a modern SaaS infrastructure stack.

## Decision

Use ECS with Fargate task definitions for the API service path.

## Consequences

The application can deploy as containerized services without managing EC2 hosts. Preview can use small task sizes. Production can scale desired count and task size separately.
