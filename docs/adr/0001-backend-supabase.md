# Backend: Supabase

Status: accepted, 11 Oct 2026

## Context

One admin needs auth, a relational database and file storage, with no server to run or patch.

## Decision

Use Supabase (Postgres, Auth, Storage) in one project in Mumbai.

## Alternatives not chosen

- **Cloudflare D1 + R2 + Workers + Access**: Never pauses and is one vendor, but every API endpoint must be hand-written.
- **Firebase**: A NoSQL model fits posts and books less well than relational tables.
- **Own Node/Express server**: A server to host, patch and secure, which nothing here needs.

## Consequences

Free projects pause after 7 days idle, handled by the keep-alive workflow. SQL migrations are versioned in the repo.
