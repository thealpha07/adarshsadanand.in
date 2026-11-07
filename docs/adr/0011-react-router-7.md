# 0011. React Router 7, declarative mode

**Status:** Accepted, 1 Nov 2026

## Context
- `react-router-dom` 6.30 had two moderate advisories. One is an open redirect through a backslash in `<Link>` and `useNavigate`; the other affects server-side rendering hydration.
- Neither was reachable here: links aren't built from visitor input, and nothing is server-rendered. The fix exists only in version 7, though, and staying on 6 means running unpatched code indefinitely.

## Decision
- Move the four apps that route (blog, people, vault, cci) to `react-router` 7.
- Import from `react-router` instead of `react-router-dom`. In version 7 the DOM package is only a re-export, so dropping it removes one dependency.
- Stay in **declarative mode**: `<BrowserRouter>`, `<Routes>`, `<Route>`, `<Link>`, `useParams` and `useNavigate`, exactly as before. No source change was needed beyond the import path.

## Alternatives not chosen
- **Stay on 6 and accept the advisories.** They don't apply today, but "doesn't apply" has to be re-argued every time the code changes. Upgrading closes the question.
- **Framework mode** (file routes, loaders, server rendering). It would fix the SEO trade-off in `architecture.md`, but it needs a build and hosting change. That should be its own decision, if search ranking ever matters.
- **Data mode** (`createBrowserRouter` with loaders). A good fit for data-heavy pages, but `useAsync` already handles loading states. Rewriting every page now gives no user-visible gain.

## Consequences
- Version 7 needs React 18 or later and Node 20 or later. Both were already true.
- State updates during navigation are wrapped in `startTransition`, as version 6's `v7_startTransition` future flag did. No page depended on the old timing.
- `npm audit --omit=dev` reports 0 vulnerabilities after this change and the DOMPurify patch.
