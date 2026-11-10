/**
 * One search rule for books, shared by the public Library and the vault, so the same words find the
 * same books in both places.
 */

/** Case- and accent-insensitive, so "dostoevsky" finds "Dostoevsky" and "ogai" finds "Ōgai". */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** The fields a book search looks at: both titles, the series and every credited name. */
export type Searchable = {
  title: string;
  original_title?: string | null;
  series?: string | null;
  credits: { name: string }[];
};

/** Everything a search can match, folded once so filtering a list doesn't redo it per keystroke. */
export const searchText = (b: Searchable) =>
  fold([b.title, b.original_title, b.series, ...b.credits.map((c) => c.name)].filter(Boolean).join(" "));

/** True when every word of the query appears somewhere: "murakami wood" finds Norwegian Wood. */
export function matchesQuery(text: string, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return words.every((w) => text.includes(w));
}
