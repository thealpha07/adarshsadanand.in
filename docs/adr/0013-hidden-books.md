# 0013. Hidden books

**Status:** Accepted, 8 Nov 2026

## Context
The Library is both a personal record and a public listing. Some books belong in the record but not on the public page.

## Decision
- **`books.visibility`**, either `public` or `private`. These are the same field name and values as `people`, so both kinds of entry behave alike and share the `Visibility` type. The vault calls a private book **Hidden**, which is the plainer word.
- **New books default to public.** Unlike people, which default to private, most of the Library is meant to be seen, so hiding is the exception. Existing books stayed public.
- **The database does the hiding.** `books_public` returns only public books, so a hidden book never reaches a visitor's browser. That keeps it out of lists, shelf counts, search, the genre menu's counts, the homepage tile and the hero's book card.
- **`save_book()` keeps the current value when a save doesn't mention visibility.** A stale browser tab or a script can then never hide or un-hide a book by accident.
- **The vault** has a "Show in the public Library" switch in its own "Who can see it" section, and a Hidden badge in the book list.
- **Kept separate from `note_public`:** a public book can still have a private note.
- **`supabase/checks/security.sql`** reports whether `books_public` shows any private book. The expected answer is false.

## Alternatives not chosen
- **Hiding only in the page code** (filtering in React). The data would still go to every visitor, readable by anyone who opens the network tab.
- **A boolean such as `is_hidden`.** It's simpler, but it would mean two different words and shapes for the same idea across People and the Library.
- **Treating a missing value as public in `save_book()`.** An old vault tab would have quietly un-hidden books.

## Consequences
- Migration 0008 also drops the frozen `books.author` column, the "contract" step of ADR 0012. Authors live only in `book_credits` from here on.
- 0007 can't be re-run on a database where 0008 has run, because its backfill reads `books.author`. It never needs to be.
