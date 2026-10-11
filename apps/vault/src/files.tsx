import { useRef, useState, type DragEvent } from "react";
import { Empty, Failed, Loading } from "@site/ui";
import { formatBytes, formatDate, supabase, useAsync, type VaultFile } from "@site/data";
import { ConfirmButton } from "./fields";

const MAX_BYTES = 50 * 1024 * 1024;
const QUOTA_BYTES = 1024 * 1024 * 1024; // free plan storage, shared with blog images
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.heic,.zip,.txt,.md";
const ALLOWED = new Set(ACCEPT.split(",").map((e) => e.slice(1)));

const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

async function listFiles(): Promise<VaultFile[]> {
  const { data, error } = await supabase.from("vault_files").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

type Upload = { name: string; status: "uploading" | "done" | "failed"; message?: string };

export function FilesPage() {
  const { state, reload } = useAsync(listFiles);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const files = state.status === "ready" ? state.data : [];
  const used = files.reduce((sum, f) => sum + f.size_bytes, 0);
  const shown = files.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()));

  const setUpload = (name: string, patch: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.name === name ? { ...u, ...patch } : u)));

  async function upload(list: FileList | File[]) {
    for (const file of Array.from(list)) {
      // Check here for a fast, clear message; the bucket enforces the same limits regardless.
      if (!ALLOWED.has(extension(file.name))) {
        setUploads((u) => [...u, { name: file.name, status: "failed", message: "This file type isn't allowed." }]);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploads((u) => [...u, { name: file.name, status: "failed", message: `Too large: ${formatBytes(file.size)}. The limit is 50 MB.` }]);
        continue;
      }
      setUploads((u) => [...u, { name: file.name, status: "uploading" }]);
      // A random folder per upload means two files with the same name never collide.
      const path = `${crypto.randomUUID()}/${file.name}`;
      const { error: upErr } = await supabase.storage.from("vault").upload(path, file, { contentType: file.type || undefined });
      if (upErr) { setUpload(file.name, { status: "failed", message: upErr.message }); continue; }
      const { error: rowErr } = await supabase.from("vault_files").insert({ name: file.name, storage_path: path, size_bytes: file.size, mime_type: file.type || null });
      if (rowErr) {
        await supabase.storage.from("vault").remove([path]); // keep storage and records in step
        setUpload(file.name, { status: "failed", message: rowErr.message });
        continue;
      }
      setUpload(file.name, { status: "done" });
    }
    reload();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  }

  async function download(f: VaultFile) {
    const { data, error } = await supabase.storage.from("vault").createSignedUrl(f.storage_path, 60, { download: f.name });
    if (error) return alert(`Couldn't create a download link: ${error.message}`);
    window.location.assign(data.signedUrl);
  }

  async function rename(f: VaultFile) {
    const name = prompt("New name", f.name)?.trim();
    if (!name || name === f.name) return;
    const { error } = await supabase.from("vault_files").update({ name }).eq("id", f.id);
    if (error) alert(error.message);
    reload();
  }

  async function remove(f: VaultFile) {
    const { error } = await supabase.storage.from("vault").remove([f.storage_path]);
    if (error) return alert(error.message);
    await supabase.from("vault_files").delete().eq("id", f.id);
    reload();
  }

  return (
    <div className="stack-28">
      <div className="page-head">
        <h1 className="grot" style={{ fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.9 }}>Files</h1>
        <div className="meter">
          <span className="small"><strong>{formatBytes(used)}</strong> <span className="muted">of 1 GB used</span></span>
          <div className="bar" role="progressbar" aria-label="Storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((used / QUOTA_BYTES) * 100)}>
            <span style={{ width: `${Math.min(100, (used / QUOTA_BYTES) * 100)}%` }} />
          </div>
        </div>
      </div>

      <section
        aria-label="Upload"
        className={`dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div>
          <p className="grot" style={{ fontSize: 22, lineHeight: "24px" }}>Drop files to upload</p>
          <p className="small body-2">Up to 50 MB each · PDF, Word, Excel, PowerPoint, images, ZIP, TXT, MD</p>
        </div>
        <button className="btn btn-dark" type="button" onClick={() => input.current?.click()}>Choose files</button>
        <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={(e) => e.target.files && upload(e.target.files)} />
      </section>

      {uploads.length > 0 && (
        <ul className="upload-list" aria-live="polite">
          {uploads.map((u, i) => (
            <li key={`${u.name}-${i}`} className={`upload ${u.status}`}>
              <span style={{ fontWeight: 700 }}>{u.name}</span>
              <span className="mono">{u.status === "uploading" ? "Uploading…" : u.status === "done" ? "✓ Uploaded" : `✕ ${u.message}`}</span>
            </li>
          ))}
          <li><button className="btn btn-line" type="button" onClick={() => setUploads([])}>Clear list</button></li>
        </ul>
      )}

      <section aria-labelledby="list-h" className="stack-16">
        <div className="page-head">
          <h2 id="list-h" className="grot" style={{ fontSize: 40, lineHeight: "40px" }}>All files <span className="mono muted">{files.length}</span></h2>
          <div className="field" style={{ flex: "0 1 320px" }}>
            <label htmlFor="search">Search files</label>
            <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {state.status === "loading" && <Loading />}
        {state.status === "error" && <Failed message={state.message} />}
        {state.status === "ready" && shown.length === 0 && <Empty>{files.length ? "No files match that search." : "No files yet. Drop one above to start."}</Empty>}
        {shown.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Size</th><th scope="col">Uploaded</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{f.name}</td>
                    <td><span className="type">{extension(f.name).toUpperCase()}</span></td>
                    <td className="mono-cell">{formatBytes(f.size_bytes)}</td>
                    <td className="small body-2">{formatDate(f.created_at)}</td>
                    <td>
                      <span className="row-actions">
                        <button className="btn btn-line btn-small" type="button" onClick={() => download(f)}>Download</button>
                        <button className="btn btn-line btn-small" type="button" onClick={() => rename(f)}>Rename</button>
                        <ConfirmButton label="Delete" confirmLabel={`Delete ${f.name}?`} onConfirm={() => remove(f)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small body-2">Downloads open through a private link that expires after 60 seconds.</p>
      </section>
    </div>
  );
}
