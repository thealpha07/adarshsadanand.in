# Setup guide

Do these once, in order. Each step says what it is for, so you know what breaks if it's skipped.

## 1. Point the domain at Cloudflare

**Why:** Cloudflare must answer for the domain before it can serve the five sites over HTTPS.

1. In GoDaddy: **My Products → adarshsadanand.in → DNS → Nameservers → Change nameservers**.
2. Choose **"I'll use my own nameservers"** and enter exactly the two Cloudflare gave you:
   `jaziel.ns.cloudflare.com` and `mariah.ns.cloudflare.com`.
3. Save. This replaces GoDaddy's `ns51/ns52.domaincontrol.com`.

> Adding NS rows in the DNS *records* table does nothing. Nameservers are a separate setting.

4. In Cloudflare's DNS page, **delete** the old records that pointed at GitHub Pages:
   the four `A @ 185.199.10x.153` rows and `CNAME www → thealpha07.github.io`.
   Pages will create the right records in step 5.
5. Wait for Cloudflare to email "adarshsadanand.in is now active" (minutes to 24 hours).

## 2. Create the database

**Why:** tables, the privacy views and the security rules all come from these files.

In Supabase: **SQL Editor → New query**. Paste and run each file, in this order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_storage.sql`
3. `supabase/seed.sql`

Each should end with "Success. No rows returned".

## 3. Lock down sign-up

**Why:** only you should ever have an account.

**Authentication → Sign In / Providers → Email**: keep Email enabled, turn **off** "Allow new users to sign up".

## 4. Create your admin account

**Why:** the database only lets listed admins write, and only after 2FA.

1. **Authentication → Users → Add user → Create new user**. Email: `adarshsadanand79@gmail.com`, a strong password, tick **Auto confirm**.
2. Copy that user's **UID**.
3. **SQL Editor**, run (paste your UID):
   ```sql
   insert into public.admins (user_id) values ('PASTE-UID-HERE');
   ```
4. **Authentication → Multi-Factor** (or Settings → MFA): make sure **TOTP** is enabled.

The first time you sign in to the vault it shows a QR code. Scan it with an authenticator app
(Google Authenticator, Microsoft Authenticator, 1Password, Aegis). Every sign-in after that asks for its 6-digit code.

## 5. Host the five sites on Cloudflare Pages

**Why:** each push to `main` then rebuilds and publishes every site automatically.

Create **five** Pages projects, all from the same repo. For each:
**Workers & Pages → Create → Pages → Connect to Git → thealpha07/adarshsadanand.in**

| Project name | Build command | Output directory | Custom domain |
| --- | --- | --- | --- |
| `as-home` | `npm run build -w @site/home` | `apps/home/dist` | `adarshsadanand.in` and `www.adarshsadanand.in` |
| `as-blog` | `npm run build -w @site/blog` | `apps/blog/dist` | `blog.adarshsadanand.in` |
| `as-books` | `npm run build -w @site/books` | `apps/books/dist` | `books.adarshsadanand.in` |
| `as-people` | `npm run build -w @site/people` | `apps/people/dist` | `characters.adarshsadanand.in` |
| `as-vault` | `npm run build -w @site/vault` | `apps/vault/dist` | `files.adarshsadanand.in` |

For every project:
- Framework preset: **None**. Root directory: leave **empty** (the repo root).
- Environment variable: `NODE_VERSION` = `22`.
- After the first deploy: **Custom domains → Set up a domain** with the domain from the table.

The Supabase URL and publishable key have safe defaults in `packages/data/src/client.ts`;
set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only if they ever change.

## 6. Let Supabase accept sign-ins from the vault

**Authentication → URL Configuration**: Site URL `https://files.adarshsadanand.in`.

## 7. Check it works

- [ ] adarshsadanand.in shows the hero, and the "Lately" tiles show the post, the book and Lighthouse.
- [ ] blog.adarshsadanand.in lists "Are we really the same person?".
- [ ] files.adarshsadanand.in asks for a password, then a code, then shows Files.
- [ ] Upload a small PDF, download it, delete it.
- [ ] In GitHub → Actions, run "Keep Supabase awake" once by hand; it should pass.
