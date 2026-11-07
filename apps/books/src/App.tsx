import { useMemo, useState } from "react";
import { Empty, Failed, Loading, PageBand, SiteFooter } from "@site/ui";
import { listBooks, useAsync, type Book, type Shelf } from "@site/data";
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

/**
 * Shelf and search live in the address (?shelf=read&q=murakami), so a search can be shared or bookmarked.
 * replaceState, not pushState: typing shouldn't fill the Back button with one entry per letter.
 */
function readUrl(): { view: View; q: string } {
  const p = new URLSearchParams(window.location.search);
  const shelf = p.get("shelf");
  return { view: views.some((v) => v.key === shelf) ? (shelf as View) : "all", q: p.get("q") ?? "" };
}
function writeUrl(view: View, q: string) {
  const p = new URLSearchParams();
  if (view !== "all") p.set("shelf", view);
  if (q.trim()) p.set("q", q.trim());
  const search = p.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

export function App() {
  const { state } = useAsync(listBooks);
  const books = state.status === "ready" ? state.data : [];
  const reading = books.filter((b) => b.shelf === "reading");

  const [view, setViewState] = useState<View>(() => readUrl().view);
  const [query, setQueryState] = useState(() => readUrl().q);
  const setView = (v: View) => { setViewState(v); writeUrl(v, query); };
  const setQuery = (q: string) => { setQueryState(q); writeUrl(view, q); };

  // Search first, then count per shelf, so each tab shows how many matches it holds.
  const matches = useMemo(() => {
    const q = fold(query.trim());
    return q ? books.filter((b) => fold(b.title).includes(q) || fold(b.author).includes(q)) : books;
  }, [books, query]);
  const counts = useMemo(() => {
    const c: Record<View, number> = { all: matches.length, reading: 0, read: 0, want: 0 };
    for (const b of matches) c[b.shelf]++;
    return c;
  }, [matches]);
  const visible = view === "all"
    ? [...matches].sort((a, b) => shelfOrder[a.shelf] - shelfOrder[b.shelf]) // stable: keeps the newest-first order within a shelf
    : matches.filter((b) => b.shelf === view);

  const searching = query.trim() !== "";
  const viewLabel = views.find((v) => v.key === view)!.label;

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
            <label htmlFor="book-search" className="visually-hidden">Search by title or author</label>
            <input
              id="book-search"
              type="search"
              placeholder="Search by title or author"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            />
            {searching && <button type="button" className="search-clear" onClick={() => setQuery("")}>Clear</button>}
          </div>
        </div>

        <section aria-label={`${viewLabel}${searching ? `, search results for ${query.trim()}` : ""}`}>
          {/* One short sentence for screen readers and sighted readers alike, updated as you type. */}
          {state.status === "ready" && (
            <p className="mono muted result-count" role="status">
              {searching ? `${visible.length} ${visible.length === 1 ? "book matches" : "books match"} “${query.trim()}”` : `${visible.length} ${visible.length === 1 ? "book" : "books"}`}
              {searching && view !== "all" && counts.all > visible.length && (
                <> · <button type="button" className="link-button" onClick={() => setView("all")}>{counts.all} on all shelves</button></>
              )}
            </p>
          )}
          {state.status === "loading" && <Loading label="Loading the shelves" />}
          {state.status === "error" && <Failed message={state.message} />}
          {state.status === "ready" && visible.length === 0 && (
            <Empty>{searching ? "No books match that. Try part of a title or an author's surname." : "Nothing on this shelf yet."}</Empty>
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
          <span className="small body-2">{book.author}</span>
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
              <span className="small body-2">{b.author}</span>
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

function BookCard({ book, showShelf }: { book: Book; showShelf: boolean }) {
  return (
    <li className="book">
      <Cover book={book} className="book-cover" />
      {/* In "All", say which shelf each book is on; on a single shelf that would repeat the tab. */}
      {showShelf && <span className={`mono book-shelf${book.shelf === "reading" ? " live-label" : ""}`}>{shelfLabel[book.shelf]}</span>}
      <span className="grot" style={{ fontSize: 18, lineHeight: "21px" }}>{book.title}</span>
      <span className="small body-2">{book.author}</span>
      {book.rating != null && <Stars rating={Number(book.rating)} />}
      {book.recommended && (
        <>
          <span className="badge">✳ Recommended</span>
          {book.recommend_reason && <span className="small body-2">{book.recommend_reason}</span>}
        </>
      )}
      {book.note && (
        <details className="note">
          <summary>Read my note</summary>
          <p className="small body-2">{book.note}</p>
        </details>
      )}
    </li>
  );
}
