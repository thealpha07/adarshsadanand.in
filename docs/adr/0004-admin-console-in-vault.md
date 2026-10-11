# All editing lives in the vault

Status: accepted, 11 Oct 2026

## Context

Each public site needs content editing, but every login form is attack surface.

## Decision

Public sites are read-only. Editors for Thoughts, Library and People live in the vault app behind the same 2FA sign-in.

## Alternatives not chosen

- **A login on each subdomain**: Browsers keep sessions per site, so that means four sign-ins and four times the auth code.

## Consequences

One secure origin. Public bundles carry no auth UI.
