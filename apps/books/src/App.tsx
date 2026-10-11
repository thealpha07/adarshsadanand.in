import { useMemo, useState } from "react";
import { Empty, Failed, Loading, PageBand, SiteFooter } from "@site/ui";
import { listBooks, useAsync, type Book, type Shelf } from "@site/data";
import "./books.css";

const shelves: { key: Shelf; label: string }[] = [
  { key: "want", label: "Want to read" },
  { key: "reading", label: "Reading" },
  { key: "read", label: "Read" },
];

export function App() {
  const { state } = useAsync(listBooks);
  const books = state.status === "ready" ? state.data : [];
  const current = books.find((b) => b.shelf === "reading");

  // Default shelf: "Read" if anything is there, otherwise the first shelf with books.
  const counts = useMemo(() => Object.fromEntries(shelves.map((s) => [s.key, books.filter((b) => b.shelf === s.key).length])) as Record<Shelf, number>, [books]);
  const [chosen, setChosen] = useState<Shelf | null>(null);
  const shelf: Shelf = chosen ?? (counts.read ? "read" : counts.reading ? "reading" : "want");
  const visible = books.filter((b) => b.shelf === shelf);

  return (
    <div style={{ ["--site" as string]: "var(--teal)", ["--site-light" as string]: "#7fd0d6" }}>
      <PageBand
        site="library"
        tag="books.adarshsadanand.in"
        title="Library"
        ghost="Shelves"
        intro="Literature, manga, light novels and mythology. What I'm reading, what I've read, and what's next, with a note on each."
        actions={current && <NowReading book={current} />}
      />
      <main id="main" className="wrap" style={{ paddingTop: 56, paddingBottom: 96, display: "flex", flexDirection: "column", gap: 40 }}>
        <div className="shelf-bar">
          <div role="group" aria-label="Shelves" className="shelves">
            {shelves.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={shelf === s.key}
                className="shelf"
                onClick={() => setChosen(s.key)}
              >
                {s.label} <span className="mono">{counts[s.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <section aria-label={`${shelves.find((x) => x.key === shelf)?.label} shelf`} aria-live="polite">
          {state.status === "loading" && <Loading label="Loading the shelves" />}
          {state.status === "error" && <Failed message={state.message} />}
          {state.status === "ready" && visible.length === 0 && <Empty>Nothing on this shelf yet.</Empty>}
          {visible.length > 0 && (
            <ul className="book-grid">
              {visible.map((b) => <BookCard key={b.id} book={b} />)}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Cover({ book, className }: { book: Book; className: string }) {
  return book.cover_url ? (
    <img src={book.cover_url} alt={`Cover of ${book.title}`} className={className} loading="lazy" />
  ) : (
    <div className={`${className} cover-empty`} aria-hidden="true"><span className="grot">{book.title}</span></div>
  );
}

function NowReading({ book }: { book: Book }) {
  return (
    <div className="now-reading">
      <Cover book={book} className="now-cover" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }}>
        <span className="mono" style={{ color: "var(--teal)", fontWeight: 700 }}>✳ Reading now</span>
        <span className="grot" style={{ fontSize: 20, lineHeight: "22px" }}>{book.title}</span>
        <span className="small body-2">{book.author}</span>
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`Rated ${rating} of 5`} style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= rating ? "#0b0f14" : "none"} stroke="#0b0f14" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <li className="book">
      <Cover book={book} className="book-cover" />
      <span className="grot" style={{ fontSize: 18, lineHeight: "21px" }}>{book.title}</span>
      <span className="small body-2">{book.author}</span>
      {book.rating && <Stars rating={book.rating} />}
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
