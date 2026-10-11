import { useEffect, useState, type FormEvent } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Empty, Failed, Loading } from "@site/ui";
import { supabase, useAsync, type Anecdote, type Person } from "@site/data";
import { Area, Check, ConfirmButton, FormActions, Select, Text, listToText, slugify, textToList } from "./fields";

export function PeoplePage() {
  return (
    <Routes>
      <Route index element={<PeopleList />} />
      <Route path=":id" element={<PersonEditor />} />
    </Routes>
  );
}

async function listAll(): Promise<Person[]> {
  const { data, error } = await supabase.from("people").select("*").order("sort_order").order("created_at");
  if (error) throw new Error(error.message);
  return data;
}

function PeopleList() {
  const { state } = useAsync(listAll);
  return (
    <div className="stack-28">
      <div className="page-head">
        <h1 className="grot" style={{ fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.9 }}>People</h1>
        <Link className="btn btn-dark" to="new">Add a person</Link>
      </div>
      {state.status === "loading" && <Loading />}
      {state.status === "error" && <Failed message={state.message} />}
      {state.status === "ready" && state.data.length === 0 && <Empty>No one here yet.</Empty>}
      {state.status === "ready" && state.data.length > 0 && (
        <ul className="edit-list">
          {state.data.map((p) => (
            <li key={p.id}>
              <Link to={p.id} className="edit-row">
                <span className="grot" style={{ fontSize: 22, lineHeight: "25px" }}>{p.alias}</span>
                <span className="small body-2">{p.context}</span>
                <span className={`status ${p.visibility === "public" ? "published" : "draft"}`}>{p.visibility === "public" ? "Public" : "Private"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const empty = {
  alias: "", slug: "", initials: "", context: "", met_label: "", impression_headline: "", first_impression: "",
  traits: "", match_kind: "", match_value: "", match_reason: "", visibility: "private" as "private" | "public", sort_order: "100",
};

const checklist = [
  "No real name, nickname or initials in any public field",
  "No photo, workplace, college name or exact place",
  "No contact details or social handles",
  "They wouldn't be hurt if they recognised themselves",
];

function PersonEditor() {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState(empty);
  const [loaded, setLoaded] = useState(isNew);
  const [checks, setChecks] = useState<boolean[]>(checklist.map(() => false));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase.from("people").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) return setError(error.message);
      setForm({
        ...empty, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])),
        traits: listToText(data.traits), sort_order: String(data.sort_order),
      } as typeof empty);
      // An already-public person passed the checklist when first published.
      if (data.visibility === "public") setChecks(checklist.map(() => true));
      setLoaded(true);
    });
  }, [id, isNew]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })); };
  const checklistDone = checks.every(Boolean);
  const blockedPublic = form.visibility === "public" && !checklistDone;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (blockedPublic) return setError("Tick every item in the privacy checklist before making this person public.");
    setError(null);
    const row = {
      alias: form.alias.trim(), slug: form.slug || slugify(form.alias), initials: form.initials.trim() || null,
      context: form.context.trim() || null, met_label: form.met_label.trim() || null,
      impression_headline: form.impression_headline.trim() || null, first_impression: form.first_impression.trim() || null,
      traits: textToList(form.traits), match_kind: form.match_kind.trim() || null, match_value: form.match_value.trim() || null,
      match_reason: form.match_reason.trim() || null, visibility: form.visibility, sort_order: Number(form.sort_order) || 100,
    };
    const res = isNew ? await supabase.from("people").insert(row).select("id").single() : await supabase.from("people").update(row).eq("id", id).select("id").single();
    if (res.error) return setError(res.error.message);
    setSaved(true);
    if (isNew) navigate(`../${res.data.id}`, { replace: true });
  }

  async function remove() {
    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) return setError(error.message);
    navigate("..");
  }

  if (!loaded) return error ? <Failed message={error} /> : <Loading />;

  return (
    <div className="stack-48">
      <form onSubmit={save} className="editor">
        <Link to=".." className="mono muted">← People</Link>
        <h1 className="grot" style={{ fontSize: 48, lineHeight: "48px" }}>{isNew ? "Add a person" : form.alias || "Edit person"}</h1>
        <div className="editor-columns">
          <Text id="alias" label="Alias" required value={form.alias} onChange={(v) => { set("alias", v); if (isNew) set("slug", slugify(v)); }} hint="A name you give them, like “Lighthouse”." />
          <Text id="initials" label="Initials (private)" value={form.initials} onChange={(v) => set("initials", v)} hint="Never shown publicly. Helps you remember who this is." />
        </div>
        <div className="editor-columns">
          <Text id="context" label="Where you met" value={form.context} onChange={(v) => set("context", v)} hint="General only: College, Work, Travel, Since I was born." />
          <Text id="met" label="When" value={form.met_label} onChange={(v) => set("met_label", v)} hint="Year or month: 2000, Oct 2026." />
        </div>
        <Text id="headline" label="Impression headline" value={form.impression_headline} onChange={(v) => set("impression_headline", v)} />
        <Area id="impression" label="First impression" rows={4} value={form.first_impression} onChange={(v) => set("first_impression", v)} />
        <Text id="traits" label="Traits" value={form.traits} onChange={(v) => set("traits", v)} hint="Separate with commas." />
        <fieldset className="fieldset">
          <legend>Their symbol</legend>
          <div className="editor-columns">
            <Text id="kind" label="Kind" value={form.match_kind} onChange={(v) => set("match_kind", v)} hint="Anything: an animal, an object, a lighthouse." />
            <Text id="value" label="Symbol" value={form.match_value} onChange={(v) => set("match_value", v)} />
          </div>
          <Text id="reason" label="Why it fits" value={form.match_reason} onChange={(v) => set("match_reason", v)} />
        </fieldset>
        <Select id="vis" label="Visibility" value={form.visibility} onChange={(v) => set("visibility", v)} options={[{ value: "private", label: "Private: only you" }, { value: "public", label: "Public: anonymised card on the site" }]} />
        {form.visibility === "public" && (
          <fieldset className="fieldset">
            <legend>Before publishing, confirm</legend>
            {checklist.map((c, i) => (
              <Check key={c} id={`chk-${i}`} label={c} checked={checks[i]} onChange={(v) => setChecks((list) => list.map((x, j) => (j === i ? v : x)))} />
            ))}
          </fieldset>
        )}
        <Text id="order" label="Order on the page" type="number" value={form.sort_order} onChange={(v) => set("sort_order", v)} hint="Lower numbers appear first." />
        <FormActions error={error} saved={saved}>
          <button className="btn btn-dark" type="submit" disabled={!form.alias.trim() || blockedPublic}>Save</button>
          {!isNew && <ConfirmButton label="Delete" confirmLabel="Delete this person and their anecdotes?" onConfirm={remove} />}
        </FormActions>
      </form>
      {!isNew && <Anecdotes personId={id} />}
    </div>
  );
}

function Anecdotes({ personId }: { personId: string }) {
  const load = async (): Promise<Anecdote[]> => {
    const { data, error } = await supabase.from("anecdotes").select("*").eq("person_id", personId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  };
  const { state, reload } = useAsync(load, [personId]);
  const [body, setBody] = useState("");
  const [label, setLabel] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("anecdotes").insert({ person_id: personId, body: body.trim(), occurred_label: label.trim() || null, is_public: isPublic });
    if (error) return setError(error.message);
    setBody(""); setLabel(""); setIsPublic(false); setError(null);
    reload();
  }

  async function toggle(a: Anecdote) {
    await supabase.from("anecdotes").update({ is_public: !a.is_public }).eq("id", a.id);
    reload();
  }

  async function remove(a: Anecdote) {
    await supabase.from("anecdotes").delete().eq("id", a.id);
    reload();
  }

  return (
    <section aria-labelledby="anec-h" className="editor">
      <h2 id="anec-h" className="grot" style={{ fontSize: 36, lineHeight: "38px" }}>Anecdotes</h2>
      {state.status === "ready" && state.data.length > 0 && (
        <ul className="edit-list">
          {state.data.map((a) => (
            <li key={a.id} className="anecdote-row">
              <span className="mono muted">{a.occurred_label}</span>
              <p>{a.body}</p>
              <span className="row-actions">
                <button type="button" className="btn btn-line btn-small" onClick={() => toggle(a)} aria-pressed={a.is_public}>{a.is_public ? "Public" : "Private"}</button>
                <ConfirmButton label="Delete" confirmLabel="Delete?" onConfirm={() => remove(a)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="stack-20">
        <Area id="new-body" label="New anecdote" rows={3} value={body} onChange={setBody} />
        <Text id="new-label" label="When" value={label} onChange={setLabel} hint="Oct 2026, Summer 2019…" />
        <Check id="new-pub" label="Public" hint="(only shows if the person is public too)" checked={isPublic} onChange={setIsPublic} />
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn btn-dark" type="submit" disabled={!body.trim()}>Add anecdote</button>
      </form>
    </section>
  );
}
