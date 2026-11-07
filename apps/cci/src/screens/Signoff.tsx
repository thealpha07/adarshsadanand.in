import { useState } from "react";
import { Link, NavLink, useParams } from "react-router";
import { Badge, PageHead, StateBadge, TableBox, fmtDateTime, usePageTitle } from "../components/ui";
import { catalog } from "../data/catalog";
import { fmt2, roundTo } from "../domain/scoring";
import { buProgress, buStatus, compareEvidence, ROLE_LABEL } from "../domain/workflow";
import { useCci } from "../state/store";

export function Signoff() {
  const { id } = useParams();
  const bu = catalog.bus.find((b) => b.id === id);
  const { state, score, dispatch, announce } = useCci();
  const [confirmed, setConfirmed] = useState(false);
  const [returning, setReturning] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  usePageTitle(bu ? `${bu.name} sign-off` : "Business unit not found");

  if (!bu) return <div className="card"><p>There is no such business unit. <Link to="/app/bu/cso" className="app-link">Open Cyber Security Ops</Link>.</p></div>;

  const members = catalog.defs.filter((d) => d.buId === bu.id);
  const status = buStatus(state, bu.id, catalog);
  const progress = buProgress(state, bu.id, catalog);
  const earned = roundTo(members.reduce((s, d) => s + score.parameters[d.id].points, 0), 2);
  const max = members.reduce((s, d) => s + d.weight, 0);
  const isChief = state.role === "chief" && state.cycleState !== "declared";

  const evidenceLabel = (paramId: number) => {
    const def = members.find((d) => d.id === paramId)!;
    const r = state.params[paramId];
    const check = compareEvidence(def, r, catalog).status;
    if (check === "none") return "None yet";
    if (check === "mismatch") return r.mismatchReason ? "Differs, reason given" : "Differs";
    const corrected = state.audit.some((e) => e.targetId === String(paramId) && e.action.startsWith("Evidence now matches"));
    return corrected ? "Matches, corrected" : "Matches";
  };

  return (
    <>
      <nav className="app-tabs" aria-label="Business units">
        {catalog.bus.map((b) => <NavLink key={b.id} to={`/app/bu/${b.id}`}>{b.name}</NavLink>)}
      </nav>
      <PageHead
        tag={`Whole-BU sign-off · ${members.length} parameters · ${fmt2(earned)} of ${max} points`}
        title={bu.name}
        side={
          status === "signed" ? <Badge tone="is-ok">Signed</Badge>
            : status === "ready" ? <Badge tone="is-wait">All {members.length} approved, ready to sign</Badge>
            : <Badge>{progress.done} of {progress.total} approved</Badge>
        }
      />
      <section className="card" aria-labelledby="p-h">
        <h2 id="p-h" className="app-h2">Parameters in this BU</h2>
        <p className="small body-2">Returning one parameter leaves the others approved. This BU stays unsigned until it comes back.</p>
        <TableBox label="Parameters in this business unit">
          <table className="app-table app-wide">
            <thead><tr><th>#</th><th>Parameter</th><th className="r">Weight</th><th className="r">Points</th><th>Evidence</th><th>Status</th>{isChief && <th>Action</th>}</tr></thead>
            <tbody>
              {members.map((d) => {
                const canReturn = isChief && state.params[d.id].state === "approved";
                return (
                  <tr key={d.id}>
                    <td className="num">{d.id}</td>
                    <td><Link to={`/app/parameters/${d.id}`} className="app-link">{d.name}</Link></td>
                    <td className="r num">{d.weight}</td>
                    <td className="r num">{fmt2(score.parameters[d.id].points)}</td>
                    <td>{evidenceLabel(d.id)}</td>
                    <td><StateBadge state={state.params[d.id].state} /></td>
                    {isChief && <td>{canReturn && <button className="btn btn-line app-btn" aria-label={`Return ${d.name}`} onClick={() => { setReturning(d.id); setComment(""); setError(""); }}>Return</button>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      </section>

      {returning !== null && (
        <section className="card" aria-labelledby="ret-h">
          <h2 id="ret-h" className="app-h2">Return #{returning} to the Team Member</h2>
          <div className="field app-area">
            <label htmlFor="ret">Comment</label>
            <span className="hint">Required, so the Team Member knows what to fix.</span>
            <textarea id="ret" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div className="app-actions">
            <button
              className="btn btn-dark app-btn"
              onClick={() => {
                const refused = dispatch({ type: "chiefReturn", id: returning, comment });
                setError(refused ?? "");
                if (!refused) { announce(`Parameter ${returning} returned.`); setReturning(null); setConfirmed(false); }
              }}
            >
              Return this parameter
            </button>
            <button className="btn btn-line app-btn" onClick={() => setReturning(null)}>Cancel</button>
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
        </section>
      )}

      {status === "signed" ? (
        <p className="app-match">Signed {fmtDateTime(state.signedBus[bu.id])}. All {members.length} values are locked.</p>
      ) : (
        <section className="card" aria-labelledby="s-h">
          <h2 id="s-h" className="app-h2">Sign this business unit</h2>
          {status === "open" && (
            <p className="small body-2">
              Cannot sign yet. Outstanding:{" "}
              {progress.outstanding.map((d, i) => <span key={d.id}>{i > 0 && ", "}<Link to={`/app/parameters/${d.id}`} className="app-link">#{d.id} {d.name}</Link></span>)}.
            </p>
          )}
          {isChief ? (
            <>
              <label className="app-check">
                <input type="checkbox" checked={confirmed} disabled={status !== "ready"} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>I confirm these {members.length} values are correct for my business unit.</span>
              </label>
              <div className="app-actions">
                <button
                  className="btn btn-dark app-btn"
                  disabled={status !== "ready" || !confirmed}
                  onClick={() => {
                    const refused = dispatch({ type: "signBu", buId: bu.id, confirmed });
                    setError(refused ?? "");
                    if (!refused) announce(`${bu.name} signed and locked.`);
                  }}
                >
                  Sign and lock {members.length} parameters
                </button>
                <span className="small body-2">Values cannot be edited after signing.</span>
              </div>
            </>
          ) : <p className="small body-2">Read-only for the {ROLE_LABEL[state.role]}. Switch to BU Chief to sign.</p>}
          {error && returning === null && <p className="error-text" role="alert">{error}</p>}
        </section>
      )}
    </>
  );
}
