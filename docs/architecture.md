# Architecture

## High-level design

```
                ┌──────────────── Cloudflare ─────────────────┐
Visitor ──DNS──►│  adarshsadanand.in        → Worker: as-home   │
                │  blog.adarshsadanand.in   → Worker: as-blog   │──static files (HTML, JS, CSS, fonts, images)
                │  books.…                  → Worker: as-books  │  + security headers from each _headers file
                │  characters.…             → Worker: as-people │
                │  cci.…                    → Worker: as-cci    │  (no backend: demo data in localStorage, ADR 0009)
Me ────────────►│  files.…                  → Worker: as-vault  │
                └─────────────────────────────────────────────┘
                         │ browser calls Supabase directly (HTTPS + publishable key)
                         ▼
                ┌──────────── Supabase (Mumbai) ─────────────┐
                │ Postgres: tables + *_public views + RLS    │
                │ Auth: one admin, password + TOTP (aal2)    │
                │ Storage: blog-images (public), vault (private)
                └────────────────────────────────────────────┘
GitHub ── push ──► CI (typecheck, build) and Workers Builds (wrangler deploy, ADR 0007)
GitHub Actions cron ──► Supabase every 3 days (keeps the free project awake)
```

**Pattern:** JAMstack. Static frontends on a CDN, and a managed backend called straight from the browser.
The Workers hold assets only (no Worker script), so Cloudflare serves files and headers and runs none of our code.
*Analogy:* a shop window (CDN) in front of a bank vault (Supabase). The window never holds anything valuable.

## Trust boundaries

| Who | Can do | Enforced by |
| --- | --- | --- |
| Visitor (`anon`) | Read the four `*_public` views | `GRANT select` on views only; base tables revoked |
| Signed in, no 2FA (`aal1`) | Nothing | `is_admin()` requires `aal = 'aal2'` |
| Admin with 2FA (`aal2`) | Read and write everything | RLS policies `using (is_admin())` |
| Vault files | Downloads through signed URLs, valid 60 s | Private bucket + storage policies |
| Any page's JavaScript | Run only our own bundled scripts; talk only to Supabase | Content-Security-Policy in each `_headers` (ADR 0010) |

The UI never decides privacy. If a page has a bug, the database still refuses.

## Low-level design: data

| Table | Purpose | Public through |
| --- | --- | --- |
| `posts` | Thoughts: title, subtitle, slug, Markdown body, tags, draft/published | `posts_public`: published and dated in the past |
| `books` | Library: format, fiction or non-fiction, shelf, rating, one-liner, recommendation, note, translation, series, dates | `books_public`: note hidden unless `note_public`; credits and genre keys folded in |
| `book_credits` | Who made each book: name, role (author, story, art, translator, editor), order | Through `books_public` only |
| `genres`, `book_genres` | The genre list and which books have which | `genres` readable by everyone (for the filter) |
| `people` | Alias, context, symbol, impression, visibility, private initials | `people_public`: public rows, no initials |
| `anecdotes` | Dated stories, one person to many anecdotes | `anecdotes_public`: public anecdote of a public person |
| `vault_files` | Name, storage path, size, type of each vault file | Never public |
| `admins` | User ids allowed to write | Never readable through the API |

Constraints live in the schema: slug format, rating 0.5–5 in half steps, one-liner up to 160 characters, volumes read ≤ total, genres from the list, shelf and status enums, a 50 MB file cap,
and "published needs a date".

## Low-level design: code

- `packages/ui` is presentation only: tokens, base CSS, header and menu, page band, footer, and the loading/empty/error states.
- `packages/data` is data only: the Supabase client, row types, read queries against public views, `useAsync`, and markdown rendering (sanitised).
- Each app is a thin composition of the two. The vault adds write paths and auth.
- Routing is React Router 7 in declarative mode (`<BrowserRouter>`, `<Routes>`), imported from `react-router` (ADR 0011).
- Fonts are npm packages (`@fontsource…`) imported in `packages/ui/src/styles/base.css`, so Vite bundles them with each site.
- Content that changes rarely (homepage words, projects) is code (`content.ts`). Content that changes often is data (Supabase).

## Known trade-offs

- **Bundle size**: around 130–145 KB of JavaScript gzipped per data-backed app (the CCI demo, which has no Supabase client, is about 80 KB), most of it `supabase-js`. The public sites could use plain `fetch` against the REST API to cut this to around 50 KB. Do it if load time ever matters.
- **SEO**: pages render in the browser, so search engines see content only after JavaScript runs. Fine for a personal site; pre-rendering the blog is the upgrade path.
- **Free tier**: about 1 GB storage and 5 GB transfer a month. The vault shows usage against 1 GB.
