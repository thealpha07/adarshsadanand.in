# Privacy is enforced by the database

Status: accepted, 11 Oct 2026

## Context

Drafts, private notes, private people and initials must never leak, even through a UI bug.

## Decision

Row Level Security on every table, visitors read only *_public views, writes need admin plus aal2 (2FA).

## Alternatives not chosen

- **Filter in the frontend**: One missed filter leaks data, and anyone can call the API directly anyway.

## Consequences

A stolen password alone can't write. The views must be updated whenever a column is added.
