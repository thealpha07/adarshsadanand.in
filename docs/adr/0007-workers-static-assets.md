# 0007. Host on Cloudflare Workers static assets (supersedes the Pages part of 0002)

**Status:** Accepted, 2026-10-11

## Context
Cloudflare's "Create application" now sets up a Worker with Workers Builds. It does not create a classic Pages project. The Worker flow has no "output directory" field. Instead it runs `npx wrangler deploy`, which needs a Wrangler config file.

## Decision
- Each app has an `apps/<app>/wrangler.jsonc` with **assets only** and no Worker script.
- `not_found_handling: "single-page-application"` serves `index.html` for unknown paths.
- Wrangler is pinned as a root dev dependency, so local and CI deploys use the same version.

## Alternatives not chosen
- **Classic Pages** (via the "Looking to deploy Pages?" link): still works, but Cloudflare is putting new features into Workers. Choosing Pages now would mean migrating later.
- **Root directory = `apps/<app>`:** the npm workspace install has to run at the repo root, so every command would need `cd ../..`. Using `--config` is simpler.
- **Keeping `_redirects` for the SPA fallback:** this duplicates `not_found_handling`, and a catch-all rewrite is the documented way to get redirect loops. Removed. `_headers` is still supported and is kept.

## Consequences
- The Worker name in the dashboard must match `name` in the config (`as-home`, and so on).
- Static asset requests are free and unlimited, so cost is unchanged.
