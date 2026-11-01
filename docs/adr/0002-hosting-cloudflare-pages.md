# Hosting: Cloudflare Pages

Status: superseded in part by [0007](0007-workers-static-assets.md), 11 Oct 2026. Cloudflare DNS still stands; the sites are served by Workers static assets, not Pages.

## Context

Five sites on one domain and its subdomains, deployed from one repo.

## Decision

Cloudflare Pages, one project per app, with Cloudflare DNS for the domain.

## Alternatives not chosen

- **GitHub Pages**: One custom domain per repo, so this would need five repos.
- **Vercel**: Works well, but adds a second vendor next to the DNS.

## Consequences

Nameservers move from GoDaddy to Cloudflare. Five Pages projects share one repo.
