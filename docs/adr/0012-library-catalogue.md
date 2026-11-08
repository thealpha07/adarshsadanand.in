# 0012. Library catalogue: format, genres, credits, translation, series

**Status:** Accepted, 8 Nov 2026

## Context
With 39 books loaded, one free-text `author` column and no way to group books stopped fitting the shelf:
- Manga credit a story writer and an artist; many books have two or more authors.
- About a third of the books are translated, and the translator shapes the book.
- There was no way to browse by kind of book or by subject.
- A one-line comment was possible only on recommended books.

## Decision

**Format** (`books.format`): Book, Manga, Light novel, Graphic novel. It describes how the item is made (who is credited, whether it comes in volumes). It is a separate field from genre, so that a manga *about* history can be described.

**Fiction or non-fiction** (`books.category`), then **genres** from a fixed list (`genres`, linked through `book_genres`), one or more per book. A genre is fiction, non-fiction or either. The list starts with 15 entries; a new genre is one row in `genres` (a vault screen for it can follow). For non-fiction, the genre is the domain, so there is no separate domain field.

**Credits** (`book_credits`): a name and a role (author, story, art, translator, editor), in order. The card's byline is built from them, e.g. "A and B", "Story by A · Art by B", or "A" when one person did both. Translators show as "translated by X".

**Translation**: `translated_from` (language) and `original_title`. Search matches either title. The vault adds a translator row when a language is chosen and warns, without blocking, if the row is left empty.

**Series**: `series` plus `series_number` for numbered books (Morisaki Bookshop #2). Manga and light novels are one entry per series, with `volumes_read` of `volumes_total`.

**One-liner** (`books.one_liner`, renamed from `recommend_reason`): for every book, at most 160 characters. Recommended stays a separate badge.

**Saving**: the vault calls `save_book(id, book, credits, genres)`, one database function and one transaction. It runs as the caller, so row-level security still limits it to the admin.

**Reading**: `books_public` returns each book with `credits` (JSON) and `genres` (genre keys), so a page still loads in one request. Visitors read the `genres` list directly for the filter; credit and link tables stay closed to them.

## Alternatives not chosen
- **Manga as a genre.** It mixes two questions (how the book is made, and what it is about), and "a manga about history" could no longer be said.
- **Free-text tags.** They drift ("Self help", "Self-help", "selfhelp") and split the filter. A fixed list you can extend keeps one spelling.
- **Genres in a text-array column.** Simpler, but the database couldn't refuse a genre that doesn't exist, and renaming one means editing every book.
- **An `illustrator` column next to `author`.** It covers manga, but not three authors or a translator.
- **A separate People table for creators**, so "Haruki Murakami" is one record. It allows author pages, but it's more than the shelf needs today; credits can be promoted to it later.
- **One entry per manga volume.** Twelve near-identical cards would crowd the shelf.
- **Saving the book, then credits, then genres as three requests.** A dropped connection could leave a book with half its credits.
- **A database rule requiring a translator for translated books.** Some editions don't credit one, so the vault nudges instead.

## Consequences
- **Expand, then contract.** `books.author` was kept, nullable and no longer written, for one release; migration 0008 dropped it (ADR 0013). Migration 0007 copies every existing author string into Author credits (split on commas and "and").
- **Release order.** Run 0007, then merge straight away. Until the new vault is deployed, the old vault can't save books (it writes `recommend_reason`, which 0007 renames).
- **New genres** are rows in `genres`. Renaming a genre's key cascades to the books that use it.
- **Search** covers title, original title, every credited name and the series.
