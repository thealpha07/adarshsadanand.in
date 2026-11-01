import { useState } from "react";
import { Link } from "react-router";
import { PageHead, StateBadge, TableBox, usePageTitle } from "../components/ui";
import { catalog } from "../data/catalog";
import { fmt2 } from "../domain/scoring";
import type { ParamState } from "../domain/types";
import { STATE_LABEL } from "../domain/workflow";
import { useCci } from "../state/store";

export function Parameters() {
  usePageTitle("Parameters");
  const { state, score } = useCci();
  const [bu, setBu] = useState("all");
  const [status, setStatus] = useState("all");
  const buName = (id: string) => catalog.bus.find((b) => b.id === id)?.name ?? id;
  const rows = catalog.defs.filter((d) => (bu === "all" || d.buId === bu) && (status === "all" || state.params[d.id].state === status));

  return (
    <>
      <PageHead tag="23 parameters · Weights total 100" title="Parameters" />
      <div className="app-filters">
        <div className="field">
          <label htmlFor="f-bu" className="app-label">Business unit</label>
          <select id="f-bu" value={bu} onChange={(e) => setBu(e.target.value)}>
            <option value="all">All</option>
            {catalog.bus.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status" className="app-label">Status</label>
          <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            {(Object.keys(STATE_LABEL) as ParamState[]).map((s) => <option key={s} value={s}>{STATE_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <section className="card">
        <TableBox label="All parameters">
          <table className="app-table app-wide">
            <thead>
              <tr><th>#</th><th>Parameter</th><th>Business unit</th><th>Domain</th><th className="r">Weight</th><th className="r">Actual</th><th className="r">Points</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const s = score.parameters[d.id];
                return (
                  <tr key={d.id}>
                    <td className="num">{d.id}</td>
                    <td><Link to={`/app/parameters/${d.id}`} className="app-link">{d.name}</Link></td>
                    <td>{buName(d.buId)}</td>
                    <td className="num">{d.domain}</td>
                    <td className="r num">{d.weight}</td>
                    <td className="r num">{s.actualLabel}</td>
                    <td className="r num">{fmt2(s.points)}</td>
                    <td><StateBadge state={state.params[d.id].state} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="body-2">No parameters match these filters.</td></tr>}
              {bu === "all" && status === "all" && (
                <tr className="app-total">
                  <td /><td>Total</td><td /><td /><td className="r num">100</td><td /><td className="r num">{fmt2(score.total)}</td><td>{score.rating}</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableBox>
      </section>
    </>
  );
}
