# One monorepo with shared packages

Status: accepted, 11 Oct 2026

## Context

Five apps must look and behave like one site.

## Decision

npm workspaces: apps/* plus packages/ui and packages/data.

## Alternatives not chosen

- **Five repos**: Design tokens and the header would be copied five times and drift apart.
- **Turborepo or Nx**: Build orchestration that five small apps don't need yet.

## Consequences

One install, one CI job. A change to the header updates every site.
