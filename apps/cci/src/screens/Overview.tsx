import { useState } from "react";
import { Link } from "react-router";
import { Badge, Bar, PageHead, TableBox, usePageTitle } from "../components/ui";
import { catalog } from "../data/catalog";
import { fmt2, rankGaps } from "../domain/scoring";
import { allBusSigned, buProgress, buStatus, ROLE_LABEL } from "../domain/workflow";
import { useCci } from "../state/store";

export const DOMAIN_NAME = { GV: "Govern", ID: "Identify", PR: "Protect", DE: "Detect", RS: "Respond", Overall: "Overall (#22, #23)" } as const;

export function ScoreNote() {
  const { state, score } = useCci();
  if (score.failedDomains.length) {
    return <p className="small app-danger"><strong>Fail applied.</strong> {score.failedDomains.map((d) => DOMAIN_NAME[d]).join(", ")} is below its cutoff. The total alone would be {score.bandRating}.</p>;
  }
  if (state.cycleState === "declared") return <p className="small body-2">Declared by the MD/CEO. The cycle is locked.</p>;
  if (score.unanswered) return <p className="small body-2">Provisional. Unanswered parameters ({score.unanswered}) count as 0. Domains with missing answers are not judged against their cutoffs yet.</p>;
  if (catalog.bus.every((b) => state.signedBus[b.id])) return <p className="small body-2">All BUs are signed. Awaiting the MD/CEO's declaration. No domain is below its placeholder cutoff.</p>;
  return <p className="small body-2">Provisional until all BUs sign and the MD/CEO declares. No domain is below its placeholder cutoff.</p>;
}

export function Overview() {
  usePageTitle("Overview");
  const { state, score, dispatch, announce } = useCci();
  const [refused, setRefused] = useState("");
  const signed = catalog.bus.filter((b) => state.signedBus[b.id]).length;
  const canSend = state.role === "ciso" && state.cycleState === "open" && allBusSigned(state, catalog);
  const change = [...state.audit].reverse().find((e) => e.action === "Score recalculated");
  const gaps = rankGaps(score.parameters).slice(0, 5);
  const nameOf = (id: number) => catalog.defs.find((d) => d.id === id)?.name ?? "";

  return (
    <>
      <PageHead
        tag="Annual self-assessment"
        title="Overview"
        side={state.role === "ciso" && state.cycleState === "open" ? (
          <button
            className="btn btn-dark"
            disabled={!canSend}
            onClick={() => {
              const why = dispatch({ type: "sendPack" });
              setRefused(why ?? "");
              if (!why) announce("Pack sent to the MD/CEO.");
            }}
          >
            Send pack to signatory ({signed} of {catalog.bus.length} BUs signed)
          </button>
        ) : undefined}
      />
      {refused && <p className="error-text" role="alert">{refused}</p>}
      {change && (
        <div className="app-note">
          <span><strong>Latest score change:</strong> {change.oldValue} to {change.newValue}.</span>
          <Link to="/app/audit" className="app-link">See the record</Link>
        </div>
      )}
      <Tasks />
      <div className="app-grid">
        <section className="card" aria-label="Score">
          <span className="tag">{state.cycleState === "declared" ? "Declared score" : signed === catalog.bus.length ? "Final score, awaiting declaration" : "Provisional score"}</span>
          <p className="grot app-score">{fmt2(score.total)}</p>
          <p className="app-rating">{score.rating}</p>
          <ScoreNote />
          <Link to="/app/report" className="app-link small">See how it is calculated</Link>
        </section>
        <section className="card" aria-labelledby="domains-h">
          <h2 id="domains-h" className="app-h2">Domain scores</h2>
          <TableBox label="Domain scores">
            <table className="app-table">
              <thead><tr><th>Domain</th><th>Progress</th><th className="r">Score</th></tr></thead>
              <tbody>
                {[...score.domains].sort((a, b) => b.percent - a.percent).map((d) => (
                  <tr key={d.domain}>
                    <td>{DOMAIN_NAME[d.domain]}</td>
                    <td><Bar percent={d.percent} /></td>
                    <td className="r num">{d.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        </section>
      </div>
      <div className="app-grid">
        <section className="card" aria-labelledby="bu-h">
          <h2 id="bu-h" className="app-h2">Business unit progress</h2>
          <TableBox label="Business unit progress">
            <table className="app-table">
              <thead><tr><th>Business unit</th><th>Approved</th><th>Status</th></tr></thead>
              <tbody>
                {catalog.bus.map((b) => {
                  const p = buProgress(state, b.id, catalog);
                  const s = buStatus(state, b.id, catalog);
                  return (
                    <tr key={b.id}>
                      <td><Link to={`/app/bu/${b.id}`} className="app-link">{b.name}</Link></td>
                      <td className="num">{p.done} of {p.total}</td>
                      <td>
                        {s === "signed" ? <Badge tone="is-ok">Signed</Badge> : s === "ready" ? <Badge tone="is-wait">Ready to sign</Badge> : <Badge>In progress</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableBox>
        </section>
        <section className="card" aria-labelledby="gaps-h">
          <h2 id="gaps-h" className="app-h2">Biggest gaps</h2>
          <TableBox label="Biggest gaps">
            <table className="app-table">
              <thead><tr><th>Parameter</th><th className="r">Points lost</th></tr></thead>
              <tbody>
                {gaps.map((g) => (
                  <tr key={g.id}>
                    <td><Link to={`/app/parameters/${g.id}`} className="app-link">#{g.id} {nameOf(g.id)}</Link></td>
                    <td className="r num">{fmt2(g.lost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        </section>
      </div>
    </>
  );
}

/** What the current role should do next. Keeps the demo moving and shows each role's job. */
function Tasks() {
  const { state } = useCci();
  const tasks: { to: string; label: string }[] = [];
  const inState = (...states: string[]) => catalog.defs.filter((d) => states.includes(state.params[d.id].state));

  if (state.role === "team") inState("not_started", "draft", "returned").forEach((d) => tasks.push({ to: `/app/parameters/${d.id}`, label: `${state.params[d.id].state === "returned" ? "Fix and resubmit" : "Answer"} #${d.id} ${d.name}` }));
  if (state.role === "reviewer") inState("review").forEach((d) => tasks.push({ to: `/app/parameters/${d.id}`, label: `Review #${d.id} ${d.name}` }));
  if (state.role === "chief") catalog.bus.filter((b) => buStatus(state, b.id, catalog) === "ready").forEach((b) => tasks.push({ to: `/app/bu/${b.id}`, label: `Sign ${b.name}` }));
  if (state.role === "md" && state.cycleState === "with_signatory") tasks.push({ to: "/app/report", label: "Read the report and declare the CCI" });
  if (state.role === "auditor") tasks.push({ to: "/app/audit", label: "Trace values in the audit trail" });
  if (state.role === "ciso") {
    if (state.cycleState === "open" && allBusSigned(state, catalog)) tasks.push({ to: "/app/report", label: "Check the report, then send the pack to the signatory" });
    const stuck = catalog.bus.filter((b) => buStatus(state, b.id, catalog) === "open");
    stuck.forEach((b) => tasks.push({ to: `/app/bu/${b.id}`, label: `Follow up with ${b.name}` }));
  }

  return (
    <section className="card" aria-labelledby="tasks-h">
      <h2 id="tasks-h" className="app-h2">Tasks for the {ROLE_LABEL[state.role]}</h2>
      {tasks.length ? (
        <ul className="app-tasks">
          {tasks.map((t) => <li key={t.label}><Link to={t.to} className="app-link">{t.label}</Link></li>)}
        </ul>
      ) : (
        <p className="small body-2">Nothing is waiting for this role right now.</p>
      )}
    </section>
  );
}
