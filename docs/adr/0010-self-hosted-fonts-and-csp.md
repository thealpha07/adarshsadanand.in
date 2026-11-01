# 0010. Self-hosted fonts and a Content-Security-Policy

**Status:** Accepted, 1 Nov 2026

## Context
- The status check on 1 Nov 2026 found that no site sent a Content-Security-Policy (CSP). The vault matters most: it holds the admin session.
- Fonts were loaded with a CSS `@import` from Google Fonts. That is a chained, render-blocking request: the browser fetches our CSS, then Google's CSS, then the font files, from two more origins.
- Those two problems are linked. A strict CSP is simplest when every script, style and font comes from our own origin.

*Analogy:* the existing headers lock the doors. A CSP is the guest list for who may run code or be contacted once inside.

## Decision

**Fonts**
- Archivo (variable, with the width axis), Atkinson Hyperlegible (400, 400 italic, 700) and JetBrains Mono (400) come from the `@fontsource` npm packages.
- `packages/ui/src/styles/base.css` imports them, so Vite bundles the files with each site. The display family name is now `"Archivo Variable"` in `tokens.css`.
- Each `vite.config.ts` sets `assetsInlineLimit` so font files are never inlined as `data:` URLs, which `font-src 'self'` would block.

**CSP** (in each `apps/*/public/_headers`)

| Directive | Value | Why |
| --- | --- | --- |
| `default-src` | `'self'` | Anything not listed below comes only from our own origin. |
| `script-src` | `'self'` | Only our bundled JavaScript runs. No inline scripts exist, so none are allowed. |
| `style-src` | `'self'` | Only our bundled CSS. React `style` props are set through the DOM and are not affected. |
| `font-src` | `'self'` | Fonts are self-hosted now. |
| `img-src` | `'self' data: https:` | Book covers can be any pasted URL or Open Library; posts can embed images. Images cannot run code, so allowing any HTTPS image is a low-risk trade. The CCI page uses `'self' data:` only. |
| `connect-src` | `'self'` + the Supabase project URL | The only API the sites talk to. The CCI page has no backend, so `'self'` only. |
| `object-src` | `'none'` | No plugins. |
| `base-uri`, `form-action` | `'self'` | An injected `<base>` or `<form>` cannot redirect links or submissions elsewhere. |
| `frame-ancestors` | `'none'` | Nobody can frame the sites (clickjacking). Modern twin of `X-Frame-Options: DENY`, which stays for old browsers. |
| `upgrade-insecure-requests` | | Any stray `http://` image is fetched over HTTPS. |

The vault gets the same policy. Its extra protection comes from `noindex` and `no-store`, which it already had.

## Alternatives not chosen
- **Keep Google Fonts and allow `fonts.googleapis.com` and `fonts.gstatic.com` in the CSP.** It works, but it keeps two third-party origins and the chained request, and it tells Google about every visitor.
- **Preconnect plus a `<link>` tag for Google Fonts.** Faster than `@import`, but the privacy and third-party points still stand.
- **Copy the font files into `public/` by hand.** Same result with no version tracking. The npm packages update like any other dependency.
- **A nonce-based CSP.** Needs a server to generate a fresh nonce per request. These sites are static, and with no inline scripts there is nothing that needs a nonce.
- **Ship as `Content-Security-Policy-Report-Only` first.** Normally the safe path. Here every site was loaded in headless Chrome with the real headers, with zero violations, so enforcing straight away was justified.
- **Allow only listed image hosts** (Supabase, Open Library). Pasting a cover from any other site would then break silently.

## Consequences
- If the Supabase project URL changes, `connect-src` must change in every `_headers` file. `.env.example` and `docs/setup.md` say so.
- A new third-party script, iframe or API needs a CSP change first, which is deliberate friction.
- Inline `style` attributes inside post Markdown are now ignored by the browser. Use classes in `blog.css` instead.
- Fonts add about 27 font files to each build (woff2 plus woff fallbacks). Browsers download only the subsets a page uses (`unicode-range`).
- To check after a deploy, open the browser console on each site: there should be no "Content Security Policy" errors.
