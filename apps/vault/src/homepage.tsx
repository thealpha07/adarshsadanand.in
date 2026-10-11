import { useEffect, useState, type FormEvent } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Empty, Failed, Loading } from "@site/ui";
import { learningStageLabel, supabase, useAsync, type Learning, type LearningStage } from "@site/data";
import { Check, ConfirmButton, FormActions, Select, Text } from "./fields";

/**
 * Homepage tab: the parts of adarshsadanand.in that change often enough to edit without a deploy.
 * Today that is "What I'm learning"; later homepage settings belong here too.
 */
export function HomepagePage() {
  return (
    <Routes>
      <Route index element={<LearningList />} />
      <Route path="learning/:id" element={<LearningEditor />} />
    </Routes>
  );
}

const stages = Object.keys(learningStageLabel) as LearningStage[];

async function listAll(): Promise<Learning[]> {
  const { data, error } = await supabase.from("learning").select("*").order("sort_order").order("topic");
  if (error) throw new Error(error.message);
  return data;
}

function LearningList() {
  const { state, reload } = useAsync(listAll);
  const [error, setError] = useState<string | null>(null);

  /** Swap order with a neighbour. Two small writes; the list reloads from the database afterwards. */
  async function move(items: Learning[], index: number, by: -1 | 1) {
    const a = items[index], b = items[index + by];
    if (!a || !b) return;
    setError(null);
    // If two rows share a number, spread them out first so the swap is visible.
    const [oa, ob] = a.sort_order === b.sort_order ? [a.sort_order + by, a.sort_order] : [b.sort_order, a.sort_order];
    const r1 = await supabase.from("learning").update({ sort_order: oa }).eq("id", a.id);
    const r2 = await supabase.from("learning").update({ sort_order: ob }).eq("id", b.id);
    if (r1.error || r2.error) setError((r1.error ?? r2.error)!.message);
    reload();
  }

  return (
    <div className="stack-28">
      <div className="page-head">
        <h1 className="grot" style={{ fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.9 }}>Homepage</h1>
      </div>
      <section className="stack-20" aria-labelledby="learn-h">
        <div className="page-head">
          <div className="stack-8">
            <h2 id="learn-h" className="grot" style={{ fontSize: 28, lineHeight: "30px" }}>What I'm learning</h2>
            <p className="small body-2">Shown on the homepage in this order. Hidden topics stay here but leave the site.</p>
          </div>
          <Link className="btn btn-dark" to="learning/new">Add a topic</Link>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        {state.status === "loading" && <Loading />}
        {state.status === "error" && <Failed message={state.message} />}
        {state.status === "ready" && state.data.length === 0 && <Empty>Nothing yet. The section is hidden on the homepage until you add a topic.</Empty>}
        {state.status === "ready" && state.data.length > 0 && (
          <ul className="edit-list">
            {state.data.map((l, i) => (
              <li key={l.id} className="order-row">
                <Link to={`learning/${l.id}`} className="edit-row">
                  <span className="grot" style={{ fontSize: 20, lineHeight: "23px" }}>{l.topic}</span>
                  <span className="small body-2">{learningStageLabel[l.stage]}</span>
                  <span className="status">{l.visible ? "On homepage" : "Hidden"}</span>
                </Link>
                <span className="order-buttons">
                  <button type="button" className="btn btn-line btn-small" disabled={i === 0} onClick={() => move(state.data, i, -1)} aria-label={`Move ${l.topic} up`}>↑</button>
                  <button type="button" className="btn btn-line btn-small" disabled={i === state.data.length - 1} onClick={() => move(state.data, i, 1)} aria-label={`Move ${l.topic} down`}>↓</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const empty = { topic: "", focus: "", stage: "started" as LearningStage, started_on: "", link: "", visible: true };

function LearningEditor() {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState(empty);
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase.from("learning").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) return setError(error.message);
      setForm({
        topic: data.topic, focus: data.focus ?? "", stage: data.stage, started_on: data.started_on ?? "",
        link: data.link ?? "", visible: data.visible,
      });
      setLoaded(true);
    });
  }, [id, isNew]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })); };
  const linkOk = !form.link.trim() || /^https:\/\//.test(form.link.trim());

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const row = {
      topic: form.topic.trim(), focus: form.focus.trim() || null, stage: form.stage,
      started_on: form.started_on || null, link: form.link.trim() || null, visible: form.visible,
    };
    let res;
    if (isNew) {
      // New topics go to the end of the list.
      const { data: last } = await supabase.from("learning").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      res = await supabase.from("learning").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 }).select("id").single();
    } else {
      res = await supabase.from("learning").update(row).eq("id", id).select("id").single();
    }
    if (res.error) return setError(res.error.message);
    setSaved(true);
    if (isNew) navigate(`/homepage/learning/${res.data.id}`, { replace: true });
  }

  async function remove() {
    const { error } = await supabase.from("learning").delete().eq("id", id);
    if (error) return setError(error.message);
    navigate("/homepage");
  }

  if (!loaded) return error ? <Failed message={error} /> : <Loading />;

  return (
    <form onSubmit={save} className="editor">
      <Link to="/homepage" className="mono muted">← Homepage</Link>
      <h1 className="grot" style={{ fontSize: 48, lineHeight: "48px" }}>{isNew ? "Add a topic" : "Edit topic"}</h1>
      <Text id="topic" label="Topic" required value={form.topic} onChange={(v) => set("topic", v)} hint="Short, like “Node.js”. Up to 60 characters." />
      <Text id="focus" label="What exactly, in one line" value={form.focus} onChange={(v) => set("focus", v)} hint="Up to 240 characters." />
      <div className="editor-columns">
        <Select id="stage" label="Stage" value={form.stage} onChange={(v) => set("stage", v)} options={stages.map((s) => ({ value: s, label: learningStageLabel[s] }))} />
        <Text id="started" label="Started" type="date" value={form.started_on} onChange={(v) => set("started_on", v)} hint="Shown as month and year." />
      </div>
      <Text id="link" label="Link (optional)" value={form.link} onChange={(v) => set("link", v)} hint={linkOk ? "A course, repo or notes. Must start with https://" : "This must start with https://"} />
      <Check id="visible" label="Show on the homepage" checked={form.visible} onChange={(v) => set("visible", v)} />
      <FormActions error={error} saved={saved}>
        <button className="btn btn-dark" type="submit" disabled={!form.topic.trim() || !linkOk}>Save</button>
        {!isNew && <ConfirmButton label="Delete" confirmLabel="Delete this topic?" onConfirm={remove} />}
      </FormActions>
    </form>
  );
}
