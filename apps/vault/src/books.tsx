import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router";
import { Empty, Failed, Loading } from "@site/ui";
import {
  byline, categoryLabel, formatLabel, hasVolumes, listGenres, roleLabel, supabase, useAsync,
  type BookCategory, type BookFormat, type Credit, type CreditRole, type Genre, type Shelf, type Visibility,
} from "@site/data";
import { Area, Check, ConfirmButton, FormActions, Select, Text } from "./fields";
import { toWebp } from "./images";

export function BooksPage() {
  return (
    <Routes>
      <Route index element={<BookList />} />
      <Route path=":id" element={<BookEditor />} />
    </Routes>
  );
}

const shelfLabel: Record<Shelf, string> = { want: "Want to read", reading: "Reading", read: "Read" };

type CreditRow = { position: number; name: string; role: CreditRole };
type BookRow = { id: string; title: string; shelf: Shelf; visibility: Visibility; book_credits: CreditRow[] };

/** The list shows each book's byline, built from its credits like everywhere else. */
async function listAll(): Promise<BookRow[]> {
  const { data, error } = await supabase.from("books").select("id, title, shelf, visibility, book_credits(name, role, position)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as BookRow[];
}
const sortCredits = (rows: CreditRow[]): Credit[] => [...rows].sort((a, b) => a.position - b.position).map(({ name, role }) => ({ name, role }));

function BookList() {
  const { state } = useAsync(listAll);
  return (
    <div className="stack-28">
      <div className="page-head">
        <h1 className="grot" style={{ fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.9 }}>Library</h1>
        <Link className="btn btn-dark" to="new">Add a book</Link>
      </div>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && <Failed message={state.message} />}
      {state.status === "ready" && state.data.length === 0 && <Empty>No books yet.</Empty>}
      {state.status === "ready" && state.data.length > 0 && (
        <ul className="edit-list">
          {state.data.map((b) => (
            <li key={b.id}>
              <Link to={b.id} className="edit-row">
                <span className="grot" style={{ fontSize: 20, lineHeight: "23px" }}>{b.title}</span>
                <span className="small body-2">
                  {byline(sortCredits(b.book_credits))}
                  {b.visibility === "private" && <span className="hidden-badge">Hidden</span>}
                </span>
                <span className={`status${b.shelf === "reading" ? " live" : ""}`}>{shelfLabel[b.shelf]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const empty = {
  title: "", original_title: "", format: "book" as BookFormat, category: "" as BookCategory | "",
  isbn: "", cover_url: "", series: "", series_number: "",
  translated_from: "",
  shelf: "want" as Shelf, rating: "", started_on: "", finished_on: "", volumes_read: "", volumes_total: "",
  one_liner: "", recommended: false, note: "", note_public: false,
  // New books start public; hiding is the exception (ADR 0013).
  visibility: "public" as Visibility,
};
type Form = typeof empty;
type EditCredit = Credit & { key: string };
const newCredit = (role: CreditRole = "author"): EditCredit => ({ key: crypto.randomUUID(), name: "", role });

/**
 * Cover sources, best first: an image you upload, a URL you paste, then Open Library by ISBN.
 * Open Library covers are scans of real copies (worn edges, yellowed paper), so they're the fallback.
 * `?default=false` makes Open Library answer "not found" instead of a blank 1-pixel image.
 */
const coverFromIsbn = (isbn: string) => (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[^0-9X]/gi, "")}-L.jpg?default=false` : "");
const COVERS = "book-covers";

/** 5, 4.5 … 0.5, matching the database rule in 0006_half_star_ratings.sql. Stars show the value at a glance. */
const ratingOptions = [
  { value: "", label: "Not rated" },
  ...Array.from({ length: 10 }, (_, i) => (10 - i) / 2).map((n) => ({
    value: String(n),
    label: `${"★".repeat(Math.floor(n))}${n % 1 ? "½" : ""}  ${n} of 5`,
  })),
];
const ONE_LINER_MAX = 160; // same limit as the database (0007)
const LANGUAGES = ["Japanese", "Korean", "Chinese", "Kannada", "Hindi", "Tamil", "Malayalam", "Bengali", "Russian", "French", "German", "Spanish", "Italian", "Portuguese", "Ancient Greek", "Latin", "Sanskrit"];

/** The database's rule names, said plainly. Anything else is shown as the database wrote it. */
function friendly(message: string): string {
  if (message.includes("books_volumes_check")) return "Volumes read can't be more than the total.";
  if (message.includes("books_one_liner_length")) return `Keep the one-liner to ${ONE_LINER_MAX} characters.`;
  if (message.includes("books_series_number_check")) return "Add the series name before its number.";
  if (message.includes("book_genres_genre_fkey")) return "One of the genres isn't in the list any more. Reload the page and pick again.";
  return message;
}

function BookEditor() {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState<Form>(empty);
  const [credits, setCredits] = useState<EditCredit[]>([newCredit()]);
  const [picked, setPicked] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [askTranslator, setAskTranslator] = useState(false);

  useEffect(() => { listGenres().then(setGenres).catch((e) => setError(e.message)); }, []);

  useEffect(() => {
    if (isNew) return;
    supabase.from("books").select("*, book_credits(name, role, position), book_genres(genre)").eq("id", id).single().then(({ data, error }) => {
      if (error) return setError(error.message);
      const text = (v: unknown) => (v == null ? "" : String(v));
      setForm({
        title: text(data.title), original_title: text(data.original_title), format: data.format, category: data.category ?? "",
        isbn: text(data.isbn), cover_url: text(data.cover_url), series: text(data.series), series_number: text(data.series_number),
        translated_from: text(data.translated_from), shelf: data.shelf,
        // Number() first: "4.0" and 4 must both match the option value "4".
        rating: data.rating != null ? String(Number(data.rating)) : "",
        started_on: text(data.started_on), finished_on: text(data.finished_on),
        volumes_read: text(data.volumes_read), volumes_total: text(data.volumes_total),
        one_liner: text(data.one_liner), recommended: data.recommended, note: text(data.note), note_public: data.note_public,
        visibility: data.visibility,
      });
      const rows = sortCredits(data.book_credits as CreditRow[]).map((c) => ({ ...c, key: crypto.randomUUID() }));
      setCredits(rows.length ? rows : [newCredit()]);
      setPicked((data.book_genres as { genre: string }[]).map((g) => g.genre));
      setLoaded(true);
    });
  }, [id, isNew]);

  const edited = () => { setSaved(false); setAskTranslator(false); };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { edited(); setForm((f) => ({ ...f, [k]: v })); };
  const setCredit = (key: string, patch: Partial<Credit>) => { edited(); setCredits((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c))); };
  const addCredit = (role: CreditRole) => { edited(); setCredits((cs) => [...cs, newCredit(role)]); };
  const removeCredit = (key: string) => { edited(); setCredits((cs) => (cs.length > 1 ? cs.filter((c) => c.key !== key) : cs)); };
  const moveUp = (i: number) => { edited(); setCredits((cs) => (i === 0 ? cs : [...cs.slice(0, i - 1), cs[i], cs[i - 1], ...cs.slice(i + 1)])); };
  const toggleGenre = (slug: string) => { edited(); setPicked((p) => (p.includes(slug) ? p.filter((g) => g !== slug) : [...p, slug])); };

  /** Manga credit a story writer and an artist: if nothing is filled in yet, offer those two rows. */
  function changeFormat(format: BookFormat) {
    set("format", format);
    if (format === "manga" && credits.every((c) => !c.name.trim())) setCredits([newCredit("story"), newCredit("art")]);
    if (format !== "manga" && credits.every((c) => !c.name.trim())) setCredits([newCredit("author")]);
  }
  /** Choosing a language adds an empty Translator row, so the name has somewhere to go. */
  function changeLanguage(language: string) {
    set("translated_from", language);
    if (language.trim() && !credits.some((c) => c.role === "translator")) setCredits((cs) => [...cs, newCredit("translator")]);
  }

  const hasCreator = credits.some((c) => (c.role === "author" || c.role === "story") && c.name.trim());
  const missingTranslator = form.translated_from.trim() !== "" && !credits.some((c) => c.role === "translator" && c.name.trim());

  async function save(e?: FormEvent, translatorConfirmed = false) {
    e?.preventDefault();
    if (saving) return; // a double-click would otherwise add the same new book twice
    if (missingTranslator && !translatorConfirmed) return setAskTranslator(true);
    setError(null);
    setAskTranslator(false);
    setSaving(true);
    const cover = form.cover_url.trim() || coverFromIsbn(form.isbn.trim());
    const book = { ...form, cover_url: cover, rating: form.rating, recommended: form.recommended, note_public: form.note_public };
    const creditList = credits.filter((c) => c.name.trim()).map(({ name, role }) => ({ name: name.trim(), role }));
    // Genres that don't fit the chosen side (a fiction genre on a non-fiction book) are dropped on save.
    const genreList = picked.filter((slug) => fits(genres.find((g) => g.slug === slug)));
    let res;
    try {
      res = await supabase.rpc("save_book", { p_id: isNew ? null : id, p_book: book, p_credits: creditList, p_genres: genreList });
    } catch (err) {
      return setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
    if (res.error) return setError(friendly(res.error.message));
    // Show the cover the database now holds (the ISBN fallback may have filled it in).
    // setForm, not set(): set() marks the form as edited, which would hide "Saved" straight away.
    setForm((f) => ({ ...f, cover_url: cover }));
    setPicked(genreList);
    setSaved(true);
    setSavedAt(new Date());
    if (isNew) navigate(`../${res.data}`, { replace: true });
  }

  const [uploading, setUploading] = useState(false);
  async function uploadCover(file: File) {
    setError(null);
    setUploading(true);
    try {
      const blob = await toWebp(file);
      const path = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from(COVERS).upload(path, blob, { contentType: "image/webp" });
      if (error) throw new Error(error.message);
      set("cover_url", supabase.storage.from(COVERS).getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) return setError(error.message);
    navigate("..");
  }

  // Show the genres that fit the chosen side, plus the "either" ones; with no side chosen, show all.
  const fits = (g?: Genre) => !!g && (form.category === "" || g.kind === "any" || g.kind === form.category);
  const genreGroups = useMemo(() => {
    const groups: { label: string; items: Genre[] }[] = [
      { label: categoryLabel.fiction, items: genres.filter((g) => g.kind === "fiction") },
      { label: categoryLabel.nonfiction, items: genres.filter((g) => g.kind === "nonfiction") },
      { label: "Either", items: genres.filter((g) => g.kind === "any") },
    ];
    return groups.map((gr) => ({ ...gr, items: gr.items.filter((g) => fits(g)) })).filter((gr) => gr.items.length);
  }, [genres, form.category]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return error ? <Failed message={error} /> : <Loading />;
  const cover = form.cover_url || coverFromIsbn(form.isbn);
  const volumes = hasVolumes(form.format);

  return (
    <form onSubmit={save} className="editor">
      <Link to=".." className="mono muted">← Library</Link>
      <h1 className="grot" style={{ fontSize: 48, lineHeight: "48px" }}>{isNew ? "Add a book" : "Edit book"}</h1>

      <fieldset className="editor-section">
        <legend>The book</legend>
        <div className="editor-columns">
          <div className="stack-20">
            <Text id="title" label="Title" required value={form.title} onChange={(v) => set("title", v)} />
            <Text id="original-title" label="Original title" value={form.original_title} onChange={(v) => set("original_title", v)} hint="For translated books, e.g. ノルウェイの森. Search finds either title." />
            <div className="editor-columns">
              <Select id="format" label="Format" value={form.format} onChange={changeFormat} options={(Object.keys(formatLabel) as BookFormat[]).map((f) => ({ value: f, label: formatLabel[f] }))} />
              <Select id="category" label="Fiction or non-fiction" value={form.category} onChange={(v) => set("category", v)}
                options={[{ value: "", label: "Not set" }, { value: "fiction", label: categoryLabel.fiction }, { value: "nonfiction", label: categoryLabel.nonfiction }]} />
            </div>
            <div className="editor-columns">
              <Text id="series" label="Series" value={form.series} onChange={(v) => set("series", v)} hint={volumes ? "For manga, usually the title." : "e.g. Morisaki Bookshop"} />
              {!volumes && <Text id="series-number" label="Number in series" type="number" value={form.series_number} onChange={(v) => set("series_number", v)} />}
            </div>
            <Text id="isbn" label="ISBN" value={form.isbn} onChange={(v) => set("isbn", v)} hint="Fills in the cover automatically from Open Library." />
            <div className="field">
              <label htmlFor="cover-file">Upload a cover</label>
              <input id="cover-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
                onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} aria-describedby="cover-file-hint" />
              <span id="cover-file-hint" className="hint">{uploading ? "Uploading…" : "Best quality. Resized to 600 px wide WebP. Remember to Save."}</span>
            </div>
            <Text id="cover" label="…or cover image URL" value={form.cover_url} onChange={(v) => set("cover_url", v)} hint="Leave both empty to use the ISBN cover." />
          </div>
          {cover && <img src={cover} alt="Cover preview" className="cover-preview" />}
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>Who made it</legend>
        <p className="hint" id="credits-hint">In the order they appear on the cover. {form.format === "manga" ? "Same person for story and art? Add them twice; the card names them once." : "Add a translator for translated books."}</p>
        <ol className="credit-list" aria-describedby="credits-hint">
          {credits.map((c, i) => (
            <li key={c.key} className="credit-row">
              <input aria-label={`Name ${i + 1}`} value={c.name} placeholder="Name" onChange={(e) => setCredit(c.key, { name: e.target.value })} />
              <select aria-label={`Role of ${c.name || `name ${i + 1}`}`} value={c.role} onChange={(e) => setCredit(c.key, { role: e.target.value as CreditRole })}>
                {(Object.keys(roleLabel) as CreditRole[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
              <button type="button" className="btn btn-line btn-small" onClick={() => moveUp(i)} disabled={i === 0} aria-label={`Move ${c.name || `name ${i + 1}`} up`}>↑</button>
              <button type="button" className="btn btn-line btn-small" onClick={() => removeCredit(c.key)} disabled={credits.length === 1} aria-label={`Remove ${c.name || `name ${i + 1}`}`}>Remove</button>
            </li>
          ))}
        </ol>
        <div className="row-8">
          <button type="button" className="btn btn-line btn-small" onClick={() => addCredit(form.format === "manga" ? "story" : "author")}>Add a person</button>
          <button type="button" className="btn btn-line btn-small" onClick={() => addCredit("translator")}>Add a translator</button>
        </div>
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="translated-from">Translated from</label>
          <input id="translated-from" list="languages" value={form.translated_from} onChange={(e) => changeLanguage(e.target.value)} aria-describedby="translated-from-hint" />
          <datalist id="languages">{LANGUAGES.map((l) => <option key={l} value={l} />)}</datalist>
          <span id="translated-from-hint" className="hint">Leave empty if it was written in English.</span>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>Genres</legend>
        {genreGroups.length === 0 && <p className="hint">Loading genres…</p>}
        {genreGroups.map((gr) => (
          <div key={gr.label} className="genre-group" role="group" aria-label={`${gr.label} genres`}>
            <span className="mono muted genre-group-label">{gr.label}</span>
            <div className="genre-chips">
              {gr.items.map((g) => (
                <label key={g.slug} className="genre-chip">
                  <input type="checkbox" checked={picked.includes(g.slug)} onChange={() => toggleGenre(g.slug)} />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <p className="hint">{form.category === "" ? "Choose fiction or non-fiction above to narrow the list." : "Pick one or more."}</p>
      </fieldset>

      <fieldset className="editor-section">
        <legend>Your reading</legend>
        <div className="editor-columns">
          <Select id="shelf" label="Shelf" value={form.shelf} onChange={(v) => set("shelf", v)} options={(["want", "reading", "read"] as Shelf[]).map((s) => ({ value: s, label: shelfLabel[s] }))} />
          <Select id="rating" label="Rating" value={form.rating} onChange={(v) => set("rating", v)} options={ratingOptions} />
        </div>
        {volumes && (
          <div className="editor-columns">
            <Text id="volumes-read" label="Volumes read" type="number" value={form.volumes_read} onChange={(v) => set("volumes_read", v)} />
            <Text id="volumes-total" label="Volumes in the series" type="number" value={form.volumes_total} onChange={(v) => set("volumes_total", v)} hint="Leave empty if it's still running." />
          </div>
        )}
        <div className="editor-columns">
          <Text id="started" label="Started" type="date" value={form.started_on} onChange={(v) => set("started_on", v)} />
          <Text id="finished" label="Finished" type="date" value={form.finished_on} onChange={(v) => set("finished_on", v)} />
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>What you thought</legend>
        <div className="field">
          <label htmlFor="one-liner">One-liner</label>
          <input id="one-liner" value={form.one_liner} maxLength={ONE_LINER_MAX} onChange={(e) => set("one_liner", e.target.value)} aria-describedby="one-liner-hint" />
          <span id="one-liner-hint" className="hint">Shown on the book's card. {form.one_liner.length}/{ONE_LINER_MAX}</span>
        </div>
        <Check id="rec" label="Recommend this book" hint="(adds a Recommended badge)" checked={form.recommended} onChange={(v) => set("recommended", v)} />
        <Area id="note" label="Note" value={form.note} onChange={(v) => set("note", v)} />
        <Check id="notepub" label="Show my note publicly" hint="(off: only you see it)" checked={form.note_public} onChange={(v) => set("note_public", v)} />
      </fieldset>

      <fieldset className="editor-section">
        <legend>Who can see it</legend>
        <Check id="visible" label="Show in the public Library" hint="(off: only you see it, here in the vault)"
          checked={form.visibility === "public"} onChange={(v) => set("visibility", v ? "public" : "private")} />
        {form.visibility === "private" && (
          <p className="hint">Hidden from books.adarshsadanand.in: its card, the shelf counts, search, and the homepage.</p>
        )}
      </fieldset>

      <FormActions error={error} saved={saved} savedAt={savedAt}>
        <button className="btn btn-dark" type="submit" disabled={saving || uploading || !form.title.trim() || !hasCreator}>{saving ? "Saving…" : "Save"}</button>
        {!isNew && <ConfirmButton label="Delete" confirmLabel="Delete this book?" onConfirm={remove} />}
      </FormActions>
      {!hasCreator && <p className="hint">Add at least one {form.format === "manga" ? "story writer" : "author"} to save.</p>}
      {askTranslator && (
        <div className="confirm" role="alertdialog" aria-label="No translator added">
          <span className="small">It's translated from {form.translated_from}, but no translator is named. Save anyway?</span>
          <button type="button" className="btn btn-dark btn-small" onClick={() => save(undefined, true)}>Save anyway</button>
          <button type="button" className="btn btn-line btn-small" onClick={() => { setAskTranslator(false); document.querySelector<HTMLInputElement>(".credit-row:last-child input")?.focus(); }} autoFocus>Add the translator</button>
        </div>
      )}
    </form>
  );
}
