import { useEffect, useState, type FormEvent } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Empty, Failed, Loading, siteUrl } from "@site/ui";
import { blogImageUrl, formatDate, renderMarkdown, supabase, useAsync, type Post } from "@site/data";
import { Area, ConfirmButton, FormActions, Select, Text, listToText, slugify, textToList } from "./fields";

export function PostsPage() {
  return (
    <Routes>
      <Route index element={<PostList />} />
      <Route path=":id" element={<PostEditor />} />
    </Routes>
  );
}

async function listAll(): Promise<Post[]> {
  const { data, error } = await supabase.from("posts").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

function PostList() {
  const { state } = useAsync(listAll);
  return (
    <div className="stack-28">
      <div className="page-head">
        <h1 className="grot" style={{ fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.9 }}>Thoughts</h1>
        <Link className="btn btn-dark" to="new">New thought</Link>
      </div>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && <Failed message={state.message} />}
      {state.status === "ready" && state.data.length === 0 && <Empty>No thoughts yet. Start with "New thought".</Empty>}
      {state.status === "ready" && state.data.length > 0 && (
        <ul className="edit-list">
          {state.data.map((p) => (
            <li key={p.id}>
              <Link to={p.id} className="edit-row">
                <span className="grot" style={{ fontSize: 22, lineHeight: "25px" }}>{p.title}</span>
                <span className={`status ${p.status}`}>{p.status === "published" ? "Published" : "Draft"}</span>
                <span className="small muted">Edited {formatDate(p.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const empty = { title: "", subtitle: "", slug: "", excerpt: "", body_md: "", tags: "", status: "draft" as Post["status"], cover_path: null as string | null, published_at: null as string | null };

function PostEditor() {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [loaded, setLoaded] = useState(isNew);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase.from("posts").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) return setError(error.message);
      setForm({ ...data, subtitle: data.subtitle ?? "", excerpt: data.excerpt ?? "", tags: listToText(data.tags) });
      setLoaded(true);
    });
  }, [id, isNew]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })); };

  async function uploadCover(file: File) {
    const path = `covers/${crypto.randomUUID()}-${slugify(file.name.replace(/\.\w+$/, ""))}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file, { contentType: file.type });
    if (error) return setError(error.message);
    set("cover_path", path);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt.trim() || null,
      body_md: form.body_md,
      tags: textToList(form.tags),
      status: form.status,
      cover_path: form.cover_path,
      // Publishing stamps the date once; it doesn't move on later edits.
      published_at: form.status === "published" ? form.published_at ?? new Date().toISOString() : form.published_at,
    };
    const res = isNew ? await supabase.from("posts").insert(row).select("id").single() : await supabase.from("posts").update(row).eq("id", id).select("id").single();
    setBusy(false);
    if (res.error) return setError(res.error.message.includes("duplicate") ? "Another thought already uses that web address (slug)." : res.error.message);
    setSaved(true);
    setForm((f) => ({ ...f, published_at: row.published_at, slug: row.slug }));
    if (isNew) navigate(`../${res.data.id}`, { replace: true });
  }

  async function remove() {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return setError(error.message);
    navigate("..");
  }

  if (!loaded) return error ? <Failed message={error} /> : <Loading />;
  const cover = blogImageUrl(form.cover_path);

  return (
    <form onSubmit={save} className="editor">
      <Link to=".." className="mono muted">← All thoughts</Link>
      <h1 className="grot" style={{ fontSize: 48, lineHeight: "48px" }}>{isNew ? "New thought" : "Edit thought"}</h1>
      <Text id="title" label="Title" required value={form.title} onChange={(v) => { set("title", v); if (!slugTouched) set("slug", slugify(v)); }} />
      <Text id="subtitle" label="Second phrase (shown in grey)" value={form.subtitle} onChange={(v) => set("subtitle", v)} hint="Optional. Example: “The me you see and the me I know”." />
      <Text id="slug" label="Web address" value={form.slug} onChange={(v) => { setSlugTouched(true); set("slug", slugify(v)); }} hint={`blog.adarshsadanand.in/${form.slug || "…"}`} />
      <Area id="excerpt" label="Excerpt" rows={3} value={form.excerpt} onChange={(v) => set("excerpt", v)} hint="One or two sentences for the list page." />
      <div className="field">
        <span className="label-row">
          <label htmlFor="body">Body (Markdown)</label>
          <button type="button" className="btn btn-line btn-small" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>{preview ? "Edit" : "Preview"}</button>
        </span>
        {preview ? (
          <div className="preview prose-lite" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body_md) }} />
        ) : (
          <textarea id="body" rows={18} value={form.body_md} onChange={(e) => set("body_md", e.target.value)} className="mono-area" aria-describedby="body-hint" />
        )}
        <span id="body-hint" className="hint">Blank line between paragraphs. ## for a heading, &gt; for a quote, **bold**, [link](https://…).</span>
      </div>
      <Text id="tags" label="Tags" value={form.tags} onChange={(v) => set("tags", v)} hint="Separate with commas: identity, perception" />
      <div className="field">
        <label htmlFor="cover">Cover image</label>
        {cover && <img src={cover} alt="" style={{ maxWidth: 360, borderRadius: 4 }} />}
        <input id="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
        {cover && <button type="button" className="btn btn-line btn-small" onClick={() => set("cover_path", null)}>Remove cover</button>}
      </div>
      <Select id="status" label="Status" value={form.status} onChange={(v) => set("status", v)} options={[{ value: "draft", label: "Draft: only you can see it" }, { value: "published", label: "Published: visible to everyone" }]} />
      <FormActions error={error} saved={saved}>
        <button className="btn btn-dark" type="submit" disabled={busy || !form.title.trim()}>{busy ? "Saving…" : "Save"}</button>
        {!isNew && form.status === "published" && <a className="btn btn-line" href={siteUrl("thoughts", `/${form.slug}`)} target="_blank" rel="noreferrer">View live ↗</a>}
        {!isNew && <ConfirmButton label="Delete" confirmLabel="Delete this thought?" onConfirm={remove} />}
      </FormActions>
    </form>
  );
}
