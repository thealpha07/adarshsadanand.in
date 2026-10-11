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
   Adding custom domains in step 5 creates the right records.
5. Wait for Cloudflare to email "adarshsadanand.in is now active" (minutes to 24 hours).

## 2. Create the database

**Why:** tables, the privacy views and the security rules all come from these files.

In Supabase: **SQL Editor → New query**. Paste and run each file, in this order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_storage.sql`
3. `supabase/migrations/0003_harden_grants.sql`
4. `supabase/seed.sql`
5. `supabase/migrations/0004_learning.sql` (the homepage's "What I'm learning"; it adds Node.js and Risk management as starting topics)

Each should end with "Success. No rows returned".

Then run `supabase/checks/security.sql` (read-only). Every table must show `anon_can_select = false`
and every `_public` view `true`.

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

## 5. Host the five sites on Cloudflare (Workers)

**Why:** after this, each push to `main` rebuilds and republishes every site automatically.

Create **five** applications from the same repo. For each one, go to
**Workers & Pages → Create application → Import a repository → thealpha07/adarshsadanand.in**.

| Project name | Build command | Deploy command | Custom domain |
| --- | --- | --- | --- |
| `as-home` | `npm run build -w @site/home` | `npx wrangler deploy --config apps/home/wrangler.jsonc` | `adarshsadanand.in`, `www.adarshsadanand.in` |
| `as-blog` | `npm run build -w @site/blog` | `npx wrangler deploy --config apps/blog/wrangler.jsonc` | `blog.adarshsadanand.in` |
| `as-books` | `npm run build -w @site/books` | `npx wrangler deploy --config apps/books/wrangler.jsonc` | `books.adarshsadanand.in` |
| `as-people` | `npm run build -w @site/people` | `npx wrangler deploy --config apps/people/wrangler.jsonc` | `characters.adarshsadanand.in` |
| `as-vault` | `npm run build -w @site/vault` | `npx wrangler deploy --config apps/vault/wrangler.jsonc` | `files.adarshsadanand.in` |

Do the following for every project:
- **Project name** must match exactly, because it is the `name` in that app's `wrangler.jsonc`.
- Open **Advanced settings**:
  - Leave the root directory as `/`.
  - Add the build variable `NODE_VERSION` = `22`.
- Leave the non-production branch deploy command as `npx wrangler versions upload --config apps/<app>/wrangler.jsonc`, or turn it off.
- After the first deploy, once the zone is Active, go to **Settings → Domains & Routes → Add → Custom domain** and add the domain from the table.

The Supabase URL and publishable key have safe defaults in `packages/data/src/client.ts`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only if they ever change.

## 6. Let Supabase accept sign-ins from the vault

**Authentication → URL Configuration**: Site URL `https://files.adarshsadanand.in`.

## 7. Check it works

- [ ] adarshsadanand.in shows the hero, and the "Lately" tiles show the post, the book and Lighthouse.
- [ ] blog.adarshsadanand.in lists "Are we really the same person?".
- [ ] files.adarshsadanand.in asks for a password, then a code, then shows Files.
- [ ] Upload a small PDF, download it, delete it.
- [ ] In GitHub → Actions, run "Keep Supabase awake" once by hand; it should pass.
