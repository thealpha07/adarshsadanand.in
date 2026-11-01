import { useSearchParams } from "react-router";
import { PageHead, TableBox, fmtTime, usePageTitle } from "../components/ui";
import { catalog } from "../data/catalog";
import type { Actor } from "../domain/types";
import { ROLE_LABEL } from "../domain/workflow";
import { useCci } from "../state/store";

export function Audit() {
  usePageTitle("Audit trail");
  const { state } = useCci();
  const [params, setParams] = useSearchParams();
  const parameter = params.get("parameter") ?? "all";
  const actor = params.get("role") ?? "all";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key); else next.set(key, value);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const actors = [...new Set(state.audit.map((e) => e.actor))] as Actor[];
  const rows = [...state.audit].reverse().filter((e) => (parameter === "all" || e.targetId === parameter) && (actor === "all" || e.actor === actor));

  return (
    <>
      <PageHead tag="Read only · Entries are only added" title="Audit trail" />
      <p className="small body-2">Stored in this browser for the demo, so it can be reset. Production needs server-side, append-only storage.</p>
      <div className="app-filters">
        <div className="field">
          <label htmlFor="f-parameter" className="app-label">Parameter</label>
          <select id="f-parameter" value={parameter} onChange={(e) => update("parameter", e.target.value)}>
            <option value="all">All</option>
            {catalog.defs.map((d) => <option key={d.id} value={String(d.id)}>#{d.id} {d.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-who" className="app-label">Who</label>
          <select id="f-who" value={actor} onChange={(e) => update("role", e.target.value)}>
            <option value="all">All</option>
            {actors.map((a) => <option key={a} value={a}>{ROLE_LABEL[a]}</option>)}
          </select>
        </div>
      </div>
      <section className="card">
        <TableBox label="Audit trail entries">
          <table className="app-table app-wide">
            <thead><tr><th>#</th><th>Time</th><th>Who</th><th>Action</th><th>Record</th><th>Old value</th><th>New value</th><th>Comment</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.seq}>
                  <td className="num">{e.seq}</td>
                  <td className="num app-nowrap">{fmtTime(e.at)}</td>
                  <td>{ROLE_LABEL[e.actor]}</td>
                  <td>{e.action}</td>
                  <td>{e.target}</td>
                  <td className="num">{e.oldValue}</td>
                  <td className="num">{e.newValue}</td>
                  <td>{e.comment}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="body-2">No entries match these filters yet.</td></tr>}
            </tbody>
          </table>
        </TableBox>
      </section>
    </>
  );
}
