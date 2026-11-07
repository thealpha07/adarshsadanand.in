import type { BookCategory, BookFormat, Credit, CreditRole } from "./types";

/**
 * How a book's credits read in a sentence. One place for it, so the Library, the vault and the
 * homepage always phrase them the same way. Design: docs/adr/0012-library-catalogue.md
 */

export const formatLabel: Record<BookFormat, string> = {
  book: "Book",
  manga: "Manga",
  light_novel: "Light novel",
  graphic_novel: "Graphic novel",
};

export const categoryLabel: Record<BookCategory, string> = { fiction: "Fiction", nonfiction: "Non-fiction" };

export const roleLabel: Record<CreditRole, string> = {
  author: "Author",
  story: "Story",
  art: "Art",
  translator: "Translator",
  editor: "Editor",
};

/** Formats that come in volumes, so the vault asks for "volumes read of total". */
export const hasVolumes = (format: BookFormat) => format !== "book";

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const namesFor = (credits: Credit[], role: CreditRole) => credits.filter((c) => c.role === role).map((c) => c.name);

/**
 * Who made it, in one line:
 *   authors only            → "Ichiro Kishimi and Fumitake Koga"
 *   one person, story + art → "Tatsuki Fujimoto"
 *   different people        → "Story by A · Art by B"
 *   authors plus an artist  → "A · Art by B"
 * Translators and editors are left out here; see creditNotes().
 */
export function byline(credits: Credit[]): string {
  const authors = namesFor(credits, "author");
  const story = namesFor(credits, "story");
  const art = namesFor(credits, "art");
  const parts: string[] = [];
  if (authors.length) parts.push(joinNames(authors));
  const sameStoryAndArt = story.length > 0 && story.length === art.length && story.every((n) => art.includes(n));
  if (sameStoryAndArt) {
    parts.push(joinNames(story));
  } else {
    if (story.length) parts.push(`Story by ${joinNames(story)}`);
    if (art.length) parts.push(`Art by ${joinNames(art)}`);
  }
  return parts.join(" · ");
}

/** The second line: "translated by Jay Rubin", "edited by X". Empty when there's nothing to add. */
export function creditNotes(credits: Credit[]): string {
  const translators = namesFor(credits, "translator");
  const editors = namesFor(credits, "editor");
  return [
    translators.length ? `translated by ${joinNames(translators)}` : "",
    editors.length ? `edited by ${joinNames(editors)}` : "",
  ].filter(Boolean).join(" · ");
}

/** "Morisaki Bookshop #2", or just the series name. */
export const seriesLabel = (series: string | null, n: number | null) => (series ? `${series}${n ? ` #${n}` : ""}` : "");

/** "Vol. 7 of 12", "7 volumes read", "12 volumes". */
export function volumesLabel(read: number | null, total: number | null): string {
  if (read != null && total != null) return `Vol. ${read} of ${total}`;
  if (read != null) return `${read} ${read === 1 ? "volume" : "volumes"} read`;
  if (total != null) return `${total} ${total === 1 ? "volume" : "volumes"}`;
  return "";
}
