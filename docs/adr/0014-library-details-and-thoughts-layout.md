# 0014. Library details, vault list tools and the Thoughts layout

**Status:** Accepted, 10 Nov 2026

## Context
Friends who reviewed the site found that visitors couldn't do anything with the Library. Every card showed every field at once, so a grid of 70+ books read like a spreadsheet. In the vault, the book list had no search, and its large titles made both the Library and Thoughts lists long to scroll. On the blog, every post opened with its image straight under the title, and the index had one "Latest" post and then a plain list.

## Decision

**Library card.** Each card shows the cover, title, author line, stars and Recommended. "Reading ●" appears only in the All tab. Everything else (series, format, translator, one-liner, genres, note, dates) moves into the details.

**Library details.** The whole card is a link to `?book=<id>`. A plain click opens a native `<dialog>` with `showModal()`:
- The panel is centred, up to 720px wide and 85% of the screen tall, with a 16px margin on phones. It has a drop shadow, and the page behind it is blurred and dimmed with `::backdrop`.
- The browser keeps focus inside the panel, closes it on Esc, and blocks the page behind it.
- Opening a book adds one history entry, so Back closes the panel. Closing a book that was opened from a shared link only removes `?book` from the address.
- Previous / Next (and ← →) move through the books on screen, following the current shelf, search and filters.
- `books_public` already returns every field, so the panel opens without another request.

**Stars.** The filled layer of each star is now a flex box, and both SVGs are `display: block`. The filled copy was an inline SVG on the text baseline, which pushed it a few pixels below the outline.

**One search rule.** `packages/data/src/search.ts` (`searchText`, `matchesQuery`) is used by both the Library and the vault. A search is case- and accent-insensitive and needs every word, in any order.

**Vault Library.**
- Search, plus Shelf, Visibility and **Needs attention** (no cover, no genre or no ISBN) filters, and sorting: Recently added, Title, Author or Recently finished.
- All of it runs in the browser on the list the vault already loads.
- Everything is kept in the URL, and the editor's "← Library" link returns to the same list.
- Author sort uses the byline as written, because splitting out surnames would put Japanese names (family name first) in the wrong order.

**Compact vault rows (Library and Thoughts).** Titles are 16px on one line and end in "…" only when the column is full. The full title shows on hover. Thoughts rows show the second phrase in grey, as on the blog. On phones, titles wrap.

**Thoughts index.** The newest three posts are staggered cards: left, then right and a step lower, then left. Each card spans two grid rows, offset by one, so cards can never overlap whatever their heights. Excerpts are capped at four lines so the stagger stays even. Posts from the 4th onward are in the dated list, and "All thoughts" only appears when there is one.

**Thoughts post.** The cover image comes after the second paragraph. Quotes, headings, lists and code don't count as paragraphs. `splitAfterParagraphs()` splits on marked's own tokens, so a blank line inside a code block isn't mistaken for a paragraph break. If a post has two paragraphs or fewer, the image goes at the end.

## Alternatives not chosen
- **A page per book** (`/book/<slug>`). It's better for search engines, but it means slugs and more pages for a small shelf. `?book=` can be promoted to a page later.
- **A custom div modal.** Focus trapping and Esc handling are easy to get wrong; `<dialog>` does them natively.
- **Hover previews.** They don't work on touch screens.
- **Expanding a card in place.** It breaks the grid.
- **Searching on the server (`ilike`).** It's only worth it with thousands of rows, and it would add a loading state to every keystroke.
- **Wrapping long vault titles onto two lines.** Rows would be uneven and the list would grow again.
- **Staggering with negative margins.** Cards could overlap when one is much taller than the next.
- **A manual `[image]` marker in posts.** Postponed. Automatic placement needs no syntax to remember, and a marker can be added on top of it later.

## Consequences
- No database change.
- Rendering a post's Markdown in two parts means a reference-style link (`[text][1]`) must have its definition in the same half. Inline links are unaffected.
- The "All thoughts" heading now scales with the screen. At a fixed 56px it was 11px too wide for a 390px phone.
