import { useMemo, useState } from "react";
import { Empty, Failed, Loading, PageBand, SiteFooter } from "@site/ui";
import {
  byline, categoryLabel, creditNotes, formatLabel, listBooks, listGenres, seriesLabel, useAsync, volumesLabel,
  type Book, type BookFormat, type Genre, type Shelf,
} from "@site/data";
import "./books.css";

type View = Shelf | "all";

const shelfLabel: Record<Shelf, string> = { reading: "Reading", read: "Read", want: "Want to read" };
// "All" lists the present first, then the past, then the future.
const views: { key: View; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reading", label: shelfLabel.reading },
  { key: "read", label: shelfLabel.read },
  { key: "want", label: shelfLabel.want },
];
const shelfOrder: Record<Shelf, number> = { reading: 0, read: 1, want: 2 };

/** Case- and accent-insensitive, so "dostoevsky" finds "Dostoevsky" and "ogai" finds "Ōgai". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Everything the reader can narrow by. "genre" is a genre key, or "fiction" / "nonfiction" for a whole side. */
type Filters = { view: View; q: string; genre: string; format: BookFormat | "" };

/**
 * Filters live in the address (?shelf=read&genre=romance&q=murakami), so a view can be shared or bookmarked.
 * replaceState, not pushState: typing shouldn't fill the Back button with one entry per letter.
 */
function readUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  const shelf = p.get("shelf");
  const format = p.get("format") as BookFormat | null;
  return {
    view: views.some((v) => v.key === shelf) ? (shelf as View) : "all",
    q: p.get("q") ?? "",
    genre: p.get("genre") ?? "",
    format: format && format in formatLabel ? format : "",
  };
}
function writeUrl(f: Filters) {
  const p = new URLSearchParams();
  if (f.view !== "all") p.set("shelf", f.view);
  if (f.genre) p.set("genre", f.genre);
  if (f.format) p.set("format", f.format);
  if (f.q.trim()) p.set("q", f.q.trim());
  const search = p.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

/** Search covers both titles, the series and every credited name (authors, artists, translators). */
const haystack = (b: Book) => fold([b.title, b.original_title, b.series, ...b.credits.map((c) => c.name)].filter(Boolean).join(" "));
const inGenre = (b: Book, genre: string) =>
  !genre || (genre === "fiction" || genre === "nonfiction" ? b.category === genre : b.genres.includes(genre));

async function load() {
  const [books, genres] = await Promise.all([listBooks(), listGenres()]);
  return { books, genres };
}

export function App() {
  const { state } = useAsync(load);
  const books = state.status === "ready" ? state.data.books : [];
  const genres = state.status === "ready" ? state.data.genres : [];
  const reading = books.filter((b) => b.shelf === "reading");

  const [filters, setFilters] = useState<Filters>(readUrl);
  const update = (patch: Partial<Filters>) => setFilters((f) => { const next = { ...f, ...patch }; writeUrl(next); return next; });
  const { view, q: query, genre, format } = filters;
  const setView = (v: View) => update({ view: v });
  const setQuery = (q: string) => update({ q });

  // Search and filters first, then count per shelf, so each tab shows how many matches it holds.
  const matches = useMemo(() => {
    const q = fold(query.trim());
    return books.filter((b) => (!q || haystack(b).includes(q)) && inGenre(b, genre) && (!format || b.format === format));
  }, [books, query, genre, format]);
  const counts = useMemo(() => {
    const c: Record<View, number> = { all: matches.length, reading: 0, read: 0, want: 0 };
    for (const b of matches) c[b.shelf]++;
    return c;
  }, [matches]);
  const visible = view === "all"
    ? [...matches].sort((a, b) => shelfOrder[a.shelf] - shelfOrder[b.shelf]) // stable: keeps the newest-first order within a shelf
    : matches.filter((b) => b.shelf === view);

  const searching = query.trim() !== "";
  const narrowed = genre !== "" || format !== "";
  const viewLabel = views.find((v) => v.key === view)!.label;
  const genreName = (slug: string) => (slug === "fiction" || slug === "nonfiction" ? categoryLabel[slug] : genres.find((g) => g.slug === slug)?.name ?? slug);

  return (
    <div style={{ ["--site" as string]: "var(--teal)", ["--site-light" as string]: "#7fd0d6" }}>
      <PageBand
        site="library"
        tag="books.adarshsadanand.in"
        title="Library"
        ghost="Shelves"
        intro="Literature, manga, light novels and mythology. What I'm reading, what I've read, and what's next, with a note on each."
        actions={reading.length > 0 && <NowReading books={reading} />}
      />
      <main id="main" className="wrap" style={{ paddingTop: 56, paddingBottom: 96, display: "flex", flexDirection: "column", gap: 40 }}>
        <div className="shelf-bar">
          <div role="group" aria-label="Shelves" className="shelves">
            {views.map((v) => (
              <button key={v.key} type="button" aria-pressed={view === v.key} className="shelf" onClick={() => setView(v.key)}>
                <span className={v.key === "reading" ? "live-label" : undefined}>{v.label}</span> <span className="mono">{counts[v.key]}</span>
              </button>
            ))}
          </div>
          <div className="search" role="search">
            <label htmlFor="book-search" className="visually-hidden">Search by title, author or translator</label>
            <input
              id="book-search"
              type="search"
              placeholder="Search titles, authors, translators"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            />
            {searching && <button type="button" className="search-clear" onClick={() => setQuery("")}>Clear</button>}
          </div>
          <FilterBar books={books} genres={genres} genre={genre} format={format} onChange={update} />
        </div>

        <section aria-label={`${viewLabel}${searching ? `, search results for ${query.trim()}` : ""}`}>
          {/* One short sentence for screen readers and sighted readers alike, updated as you type. */}
          {state.status === "ready" && (
            <p className="mono muted result-count" role="status">
              {visible.length} {visible.length === 1 ? "book" : "books"}
              {genre && ` in ${genreName(genre)}`}
              {format && ` · ${formatLabel[format]}`}
              {searching && ` matching “${query.trim()}”`}
              {(searching || narrowed) && view !== "all" && counts.all > visible.length && (
                <> · <button type="button" className="link-button" onClick={() => setView("all")}>{counts.all} on all shelves</button></>
              )}
              {narrowed && <> · <button type="button" className="link-button" onClick={() => update({ genre: "", format: "" })}>Show all genres and formats</button></>}
            </p>
          )}
          {state.status === "loading" && <Loading label="Loading the shelves" />}
          {state.status === "error" && <Failed message={state.message} />}
          {state.status === "ready" && visible.length === 0 && (
            <Empty>{searching ? "No books match that. Try part of a title, an author's surname or a translator." : narrowed ? "Nothing here with those filters." : "Nothing on this shelf yet."}</Empty>
          )}
          {visible.length > 0 && (
            <ul className="book-grid">
              {visible.map((b) => <BookCard key={b.id} book={b} showShelf={view === "all"} />)}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * Genre and format, as two dropdowns: with 15 genres, a row of chips would crowd the shelf tabs.
 * Only genres and formats that some book actually has are offered, so no choice leads to an empty shelf.
 * The format menu appears once there is more than one format.
 */
function FilterBar({ books, genres, genre, format, onChange }: {
  books: Book[]; genres: Genre[]; genre: string; format: BookFormat | ""; onChange: (patch: Partial<Filters>) => void;
}) {
  const used = new Set(books.flatMap((b) => b.genres));
  const count = (slug: string) => books.filter((b) => inGenre(b, slug)).length;
  const group = (kind: Genre["kind"]) => genres.filter((g) => g.kind === kind && used.has(g.slug));
  const formats = (Object.keys(formatLabel) as BookFormat[]).filter((f) => books.some((b) => b.format === f));
  const hasSide = (side: "fiction" | "nonfiction") => books.some((b) => b.category === side);
  if (!genres.length || !books.length) return null;
  return (
    <div className="filters">
      <label className="filter">
        <span className="visually-hidden">Genre</span>
        <select value={genre} onChange={(e) => onChange({ genre: e.target.value })}>
          <option value="">All genres</option>
          {(["fiction", "nonfiction"] as const).filter(hasSide).map((side) => (
            <optgroup key={side} label={categoryLabel[side]}>
              <option value={side}>All {categoryLabel[side].toLowerCase()} ({count(side)})</option>
              {group(side).map((g) => <option key={g.slug} value={g.slug}>{g.name} ({count(g.slug)})</option>)}
            </optgroup>
          ))}
          {group("any").length > 0 && (
            <optgroup label="Either">
              {group("any").map((g) => <option key={g.slug} value={g.slug}>{g.name} ({count(g.slug)})</option>)}
            </optgroup>
          )}
        </select>
      </label>
      {formats.length > 1 && (
        <label className="filter">
          <span className="visually-hidden">Format</span>
          <select value={format} onChange={(e) => onChange({ format: e.target.value as BookFormat | "" })}>
            <option value="">All formats</option>
            {formats.map((f) => <option key={f} value={f}>{formatLabel[f]}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

/**
 * Every cover sits on a white mat (`.cover-frame`), like the book card on the homepage hero.
 * The image is scaled to fit inside it, never cropped: covers come in many shapes (manga, box sets, scans).
 * A missing or broken cover falls back to a typeset cover on the same mat, never a broken-image icon.
 */
function Cover({ book, className }: { book: Book; className: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`cover-frame ${className}`}>
      {book.cover_url && !failed ? (
        <img src={book.cover_url} alt={`Cover of ${book.title}`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="cover-empty" aria-hidden="true"><span className="grot">{book.title}</span></div>
      )}
    </div>
  );
}

/**
 * One book: the large card as before. Two or three: one card with a compact row per book, so the hero
 * band doesn't grow three cards tall. More than three: the first three, and a count that opens the shelf.
 */
const NOW_READING_MAX = 3;
function NowReading({ books }: { books: Book[] }) {
  const heading = <span className="mono now-heading"><span className="live-label">Reading now</span>{books.length > 1 && ` · ${books.length}`}</span>;
  if (books.length === 1) {
    const [book] = books;
    return (
      <div className="now-reading">
        <Cover book={book} className="now-cover" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }}>
          {heading}
          <span className="grot" style={{ fontSize: 20, lineHeight: "22px" }}>{book.title}</span>
          <span className="small body-2">{byline(book.credits)}</span>
        </div>
      </div>
    );
  }
  const shown = books.slice(0, NOW_READING_MAX);
  return (
    <div className="now-reading now-reading-many">
      {heading}
      <ul className="now-list">
        {shown.map((b) => (
          <li key={b.id} className="now-row">
            <Cover book={b} className="now-cover-small" />
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span className="grot now-title">{b.title}</span>
              <span className="small body-2">{byline(b.credits)}</span>
            </span>
          </li>
        ))}
      </ul>
      {books.length > NOW_READING_MAX && (
        <a className="small now-more" href="?shelf=reading">and {books.length - NOW_READING_MAX} more</a>
      )}
    </div>
  );
}

const STAR = "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z";
const Star = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <path d={STAR} />
  </svg>
);

/**
 * Ratings come in half steps (0.5 to 5). Each star is an outline with a filled copy on top,
 * cropped to 0 %, 50 % or 100 % of its width. Plain CSS clipping, so no SVG ids can clash between cards.
 */
function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`Rated ${rating} of 5`} className="stars">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.min(Math.max(rating - (i - 1), 0), 1);
        return (
          <span key={i} className="star">
            <Star filled={false} />
            {fill > 0 && <span className="star-fill" style={{ width: `${fill * 100}%` }}><Star filled /></span>}
          </span>
        );
      })}
      <span className="mono star-value" aria-hidden="true">{rating}</span>
    </span>
  );
}

/**
 * Card, top to bottom: where it sits (shelf, format, volumes, series), what it is (title, who made it,
 * who translated it), then what I thought (one-liner, stars, Recommended, note).
 */
function BookCard({ book, showShelf }: { book: Book; showShelf: boolean }) {
  const notes = creditNotes(book.credits);
  const meta = [
    // In "All", say which shelf each book is on; on a single shelf that would repeat the tab.
    showShelf && <span key="shelf" className={book.shelf === "reading" ? "live-label" : undefined}>{shelfLabel[book.shelf]}</span>,
    book.format !== "book" && <span key="format">{formatLabel[book.format]}</span>,
    volumesLabel(book.volumes_read, book.volumes_total) && <span key="vol">{volumesLabel(book.volumes_read, book.volumes_total)}</span>,
    book.series && book.format === "book" && <span key="series">{seriesLabel(book.series, book.series_number)}</span>,
  ].filter(Boolean);
  return (
    <li className="book">
      <Cover book={book} className="book-cover" />
      {meta.length > 0 && <span className="mono book-meta">{meta.flatMap((m, i) => (i ? [<span key={`dot${i}`} className="book-meta-dot" aria-hidden="true">·</span>, m] : [m]))}</span>}
      <span className="grot" style={{ fontSize: 18, lineHeight: "21px" }}>{book.title}</span>
      <span className="small body-2">{byline(book.credits)}</span>
      {notes && <span className="small muted credit-notes">{notes}</span>}
      {book.one_liner && <p className="small one-liner">“{book.one_liner}”</p>}
      {book.rating != null && <Stars rating={Number(book.rating)} />}
      {book.recommended && <span className="badge">✳ Recommended</span>}
      {book.note && (
        <details className="note">
          <summary>Read my note</summary>
          <p className="small body-2">{book.note}</p>
        </details>
      )}
    </li>
  );
}
