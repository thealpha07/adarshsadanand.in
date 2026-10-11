# adarshsadanand.in

My personal platform: one portfolio and four subdomains, built as one system.

| Site | Address | Who can see it |
| --- | --- | --- |
| Portfolio | adarshsadanand.in | Everyone |
| Thoughts | blog.adarshsadanand.in | Everyone (published posts) |
| Library | books.adarshsadanand.in | Everyone (notes only if marked public) |
| People | characters.adarshsadanand.in | Everyone (only people marked public) |
| Vault and console | files.adarshsadanand.in | Only me, with 2FA |

## How it fits together

```
Browser ──► Cloudflare (DNS, HTTPS, CDN) ──► 5 static sites (Cloudflare Pages)
                                                   │
                                                   ▼
                              Supabase: Postgres + Auth + Storage
                              (Row Level Security decides who sees what)
```

There is no server of our own. Each site is a static React app; the browser talks to Supabase directly.
All editing happens in the vault console, so the four public sites have no login code at all.
Details: [docs/architecture.md](docs/architecture.md). Decisions and their alternatives: [docs/adr](docs/adr).

## Repository layout

```
apps/
  home/      Portfolio. Words live in src/content.ts
  blog/      Thoughts (list and post pages)
  books/     Library (shelves)
  people/    People journal (grid and person pages)
  vault/     Private files plus the editors for every site
packages/
  ui/        Design tokens, base styles, header, menu, footer
  data/      Supabase client, row types, read queries, markdown
supabase/
  migrations/  Schema, views and security rules (run in order)
  seed.sql     First real content
docs/        Setup guide, architecture, decisions
```

## Working on it

```bash
npm install
cp .env.example .env.local     # optional: the defaults already point at the live project
npm run dev:home               # http://localhost:5170  (blog 5171, books 5172, people 5173, vault 5174)
npm run typecheck
npm run build                  # builds all five
```

First-time setup of DNS, the database and hosting: [docs/setup.md](docs/setup.md).

## Editing content

- **Homepage words**: `apps/home/src/content.ts`, then push.
- **Thoughts, books, people, files**: sign in at files.adarshsadanand.in. Changes are live immediately; no deploy needed.

## Rules this codebase keeps

- Real content only: no invented numbers, logos or testimonials.
- WCAG 2.2 AA: keyboard reachable, visible focus, 4.5:1 text contrast, works at 360 px.
- The database enforces privacy. The UI never has to remember to hide something.
- Every decision that has an alternative gets an ADR.

## Icons

Every site icon is generated from one drawing ("Buta A": an A whose crossbar is the gold buta from the hero kurta), on that site's colour. Edit `scripts/make-icons.mjs` and run `node scripts/make-icons.mjs`; never hand-edit the generated `favicon.svg` or `apple-touch-icon.png` files.
