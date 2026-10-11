# Architecture

## High-level design

```
                ┌──────────────── Cloudflare ────────────────┐
Visitor ──DNS──►│  adarshsadanand.in        → Pages: home    │
                │  blog.adarshsadanand.in   → Pages: blog    │──static files (HTML, JS, CSS, images)
                │  books.…                  → Pages: books   │
                │  characters.…             → Pages: people  │
Me ────────────►│  files.…                  → Pages: vault   │
                └────────────────────────────────────────────┘
                         │ browser calls Supabase directly (HTTPS + publishable key)
                         ▼
                ┌──────────── Supabase (Mumbai) ─────────────┐
                │ Postgres: tables + *_public views + RLS    │
                │ Auth: one admin, password + TOTP (aal2)    │
                │ Storage: blog-images (public), vault (private)
                └────────────────────────────────────────────┘
GitHub ── push ──► CI (typecheck, build) and Cloudflare Pages (deploy)
GitHub Actions cron ──► Supabase every 3 days (keeps the free project awake)
```

**Pattern:** JAMstack. Static frontends on a CDN, and a managed backend called straight from the browser.
*Analogy:* a shop window (CDN) in front of a bank vault (Supabase). The window never holds anything valuable.

## Trust boundaries

| Who | Can do | Enforced by |
| --- | --- | --- |
| Visitor (`anon`) | Read the four `*_public` views | `GRANT select` on views only; base tables revoked |
| Signed in, no 2FA (`aal1`) | Nothing | `is_admin()` requires `aal = 'aal2'` |
| Admin with 2FA (`aal2`) | Read and write everything | RLS policies `using (is_admin())` |
| Vault files | Downloads through signed URLs, valid 60 s | Private bucket + storage policies |

The UI never decides privacy. If a page has a bug, the database still refuses.

## Low-level design: data

| Table | Purpose | Public through |
| --- | --- | --- |
| `posts` | Thoughts: title, subtitle, slug, Markdown body, tags, draft/published | `posts_public`: published and dated in the past |
| `books` | Library: shelf, rating, recommendation, note, dates | `books_public`: note hidden unless `note_public` |
| `people` | Alias, context, symbol, impression, visibility, private initials | `people_public`: public rows, no initials |
| `anecdotes` | Dated stories, one person to many anecdotes | `anecdotes_public`: public anecdote of a public person |
| `vault_files` | Name, storage path, size, type of each vault file | Never public |
| `admins` | User ids allowed to write | Never readable through the API |

Constraints live in the schema: slug format, rating 1–5, shelf and status enums, a 50 MB file cap,
and "published needs a date".

## Low-level design: code

- `packages/ui` is presentation only: tokens, base CSS, header and menu, page band, footer, and the loading/empty/error states.
- `packages/data` is data only: the Supabase client, row types, read queries against public views, `useAsync`, and markdown rendering (sanitised).
- Each app is a thin composition of the two. The vault adds write paths and auth.
- Content that changes rarely (homepage words, projects) is code (`content.ts`). Content that changes often is data (Supabase).

## Known trade-offs

- **Bundle size**: around 130 KB gzipped per app, most of it `supabase-js`. The public sites could use plain `fetch` against the REST API to cut this to around 50 KB. Do it if load time ever matters.
- **SEO**: pages render in the browser, so search engines see content only after JavaScript runs. Fine for a personal site; pre-rendering the blog is the upgrade path.
- **Free tier**: about 1 GB storage and 5 GB transfer a month. The vault shows usage against 1 GB.
