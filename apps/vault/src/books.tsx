import { useEffect, useState, type FormEvent } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Empty, Failed, Loading } from "@site/ui";
import { supabase, useAsync, type Book, type Shelf } from "@site/data";
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

async function listAll(): Promise<Book[]> {
  const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

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
                <span className="small body-2">{b.author}</span>
                <span className="status">{shelfLabel[b.shelf]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const empty = {
  title: "", author: "", isbn: "", cover_url: "", shelf: "want" as Shelf, rating: "", recommended: false,
  recommend_reason: "", note: "", note_public: false, started_on: "", finished_on: "",
};

/**
 * Cover sources, best first: an image you upload, a URL you paste, then Open Library by ISBN.
 * Open Library covers are scans of real copies (worn edges, yellowed paper), so they're the fallback.
 * `?default=false` makes Open Library answer "not found" instead of a blank 1-pixel image.
 */
const coverFromIsbn = (isbn: string) => (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[^0-9X]/gi, "")}-L.jpg?default=false` : "");
const COVERS = "book-covers";

function BookEditor() {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState(empty);
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase.from("books").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) return setError(error.message);
      setForm({
        ...empty, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])),
        rating: data.rating ? String(data.rating) : "", recommended: data.recommended, note_public: data.note_public,
      } as typeof empty);
      setLoaded(true);
    });
  }, [id, isNew]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })); };

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const row = {
      title: form.title.trim(), author: form.author.trim(), isbn: form.isbn.trim() || null,
      cover_url: form.cover_url.trim() || coverFromIsbn(form.isbn.trim()) || null,
      shelf: form.shelf, rating: form.rating ? Number(form.rating) : null,
      recommended: form.recommended, recommend_reason: form.recommend_reason.trim() || null,
      note: form.note.trim() || null, note_public: form.note_public,
      started_on: form.started_on || null, finished_on: form.finished_on || null,
    };
    const res = isNew ? await supabase.from("books").insert(row).select("id").single() : await supabase.from("books").update(row).eq("id", id).select("id").single();
    if (res.error) return setError(res.error.message);
    setSaved(true);
    set("cover_url", row.cover_url ?? "");
    if (isNew) navigate(`../${res.data.id}`, { replace: true });
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

  if (!loaded) return error ? <Failed message={error} /> : <Loading />;
  const cover = form.cover_url || coverFromIsbn(form.isbn);

  return (
    <form onSubmit={save} className="editor">
      <Link to=".." className="mono muted">← Library</Link>
      <h1 className="grot" style={{ fontSize: 48, lineHeight: "48px" }}>{isNew ? "Add a book" : "Edit book"}</h1>
      <div className="editor-columns">
        <div className="stack-20">
          <Text id="title" label="Title" required value={form.title} onChange={(v) => set("title", v)} />
          <Text id="author" label="Author" required value={form.author} onChange={(v) => set("author", v)} />
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
      <Select id="shelf" label="Shelf" value={form.shelf} onChange={(v) => set("shelf", v)} options={(["want", "reading", "read"] as Shelf[]).map((s) => ({ value: s, label: shelfLabel[s] }))} />
      <Select id="rating" label="Rating" value={form.rating} onChange={(v) => set("rating", v)} options={[{ value: "", label: "Not rated" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} of 5` }))]} />
      <div className="editor-columns">
        <Text id="started" label="Started" type="date" value={form.started_on} onChange={(v) => set("started_on", v)} />
        <Text id="finished" label="Finished" type="date" value={form.finished_on} onChange={(v) => set("finished_on", v)} />
      </div>
      <Check id="rec" label="Recommend this book" checked={form.recommended} onChange={(v) => set("recommended", v)} />
      {form.recommended && <Text id="reason" label="Why, in one line" value={form.recommend_reason} onChange={(v) => set("recommend_reason", v)} />}
      <Area id="note" label="Note" value={form.note} onChange={(v) => set("note", v)} />
      <Check id="notepub" label="Show my note publicly" hint="(off: only you see it)" checked={form.note_public} onChange={(v) => set("note_public", v)} />
      <FormActions error={error} saved={saved}>
        <button className="btn btn-dark" type="submit" disabled={!form.title.trim() || !form.author.trim()}>Save</button>
        {!isNew && <ConfirmButton label="Delete" confirmLabel="Delete this book?" onConfirm={remove} />}
      </FormActions>
    </form>
  );
}
