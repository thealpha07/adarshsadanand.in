import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHead, TableBox, fmtDateTime, usePageTitle } from "../components/ui";
import { CYCLE, ORG, catalog } from "../data/catalog";
import { affectsScore, responseLabel, visibleQuestions } from "../domain/questions";
import { fmt2, rankGaps, roundTo } from "../domain/scoring";
import type { Domain } from "../domain/types";
import { ROLE_LABEL } from "../domain/workflow";
import { useCci } from "../state/store";
import { DOMAIN_NAME, ScoreNote } from "./Overview";

export function Report() {
  usePageTitle("Report and declaration");
  const { state, score, dispatch, announce } = useCci();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const signed = catalog.bus.filter((b) => state.signedBus[b.id]).length;
  const allSigned = signed === catalog.bus.length;
  const canEditCutoffs = state.role === "ciso" && state.cycleState === "open";
  const nameOf = (id: number) => catalog.defs.find((d) => d.id === id)?.name ?? "";
  const lost = roundTo(100 - score.total, 2);

  const setCutoff = (domain: Domain, text: string) => {
    const refused = dispatch({ type: "setCutoff", domain, value: Number(text) });
    setError(refused ?? "");
  };

  return (
    <>
      <PageHead
        tag={`Annexure-K style · ${signed} of ${catalog.bus.length} BUs signed`}
        title="Report and declaration"
        side={<button className="btn btn-line app-noprint" onClick={() => window.print()}>Print or save as PDF</button>}
      />
      <p className="small body-2 app-printonly">{ORG} · {CYCLE} · Sample data · OCR simulated · Not a SEBI filing</p>

      <div className="app-grid">
        <section className="card" aria-label="Score">
          <span className="tag">{state.cycleState === "declared" ? "Declared score" : allSigned ? "Final score, awaiting declaration" : "Provisional score"}</span>
          <p className="grot app-score">{fmt2(score.total)}</p>
          <p className="app-rating">{score.rating}</p>
          <ScoreNote />
        </section>

        <section className="card" aria-labelledby="a-h">
          <h2 id="a-h" className="app-h2">Assumptions to verify</h2>
          <ul className="app-list small body-2">
            <li>Points = weight × min(actual ÷ target, 1), or weight × (1 − actual) for #12.</li>
            <li>#21 uses four equally weighted criteria.</li>
            <li>Rating uses band floors: 91, 81, 71, 61 and 51.</li>
            <li>A zero denominator gets full points, with a reason the Reviewer accepts.</li>
            <li>Domain cutoffs are placeholders.</li>
            <li>Questionnaire wording and which answers affect inputs are drafts, not SEBI text.</li>
          </ul>
        </section>

        <section className="card" aria-labelledby="d-h">
          <h2 id="d-h" className="app-h2">Declaration by authorised signatory</h2>
          {state.cycleState === "declared" ? (
            <p className="app-match">
              Declared by the {ROLE_LABEL.md} on {state.declaredAt ? fmtDateTime(state.declaredAt) : "record"}. The cycle is locked. Demo only, not a filing.
            </p>
          ) : state.cycleState === "with_signatory" && state.role === "md" ? (
            <>
              <label className="app-check">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>I declare that this CCI has been verified, and I take ownership of this report.</span>
              </label>
              <button
                className="btn btn-dark app-btn app-start"
                disabled={!confirmed}
                onClick={() => {
                  const refused = dispatch({ type: "declare", confirmed });
                  setError(refused ?? "");
                  if (!refused) announce("CCI declared. The cycle is locked.");
                }}
              >
                Declare and lock the cycle
              </button>
              <p className="small body-2">Records role and time. Nothing can change afterwards. Demo only, not a filing.</p>
            </>
          ) : state.cycleState === "with_signatory" ? (
            <p className="small body-2">The pack is with the signatory. Switch to MD/CEO to declare.</p>
          ) : (
            <p className="small body-2">
              Available after all {catalog.bus.length} BUs sign and the CISO/Compliance team sends the pack from the <Link to="/app" className="app-link">Overview</Link>.
            </p>
          )}
          {error && <p className="error-text" role="alert">{error}</p>}
        </section>
      </div>

      <div className="app-grid">
        <section className="card" aria-labelledby="dom-h">
          <h2 id="dom-h" className="app-h2">Domain results</h2>
          {canEditCutoffs && <p className="small body-2">Placeholder cutoffs. Raise one above its score to see the Fail rule apply.</p>}
          <TableBox label="Domain results">
            <table className="app-table">
              <thead><tr><th>Domain</th><th className="r">Earned</th><th className="r">Score</th><th className="r">Cutoff %</th></tr></thead>
              <tbody>
                {score.domains.map((d) => (
                  <tr key={d.domain}>
                    <td>{DOMAIN_NAME[d.domain]}</td>
                    <td className="r num">{fmt2(d.earned)} of {d.max}</td>
                    <td className={`r num ${d.below ? "app-diff" : ""}`}>{d.percent.toFixed(1)}%</td>
                    <td className="r">
                      {canEditCutoffs
                        ? <input className="app-cutoff" type="number" min="0" max="100" aria-label={`Cutoff for ${DOMAIN_NAME[d.domain]}`} defaultValue={d.cutoff} onBlur={(e) => setCutoff(d.domain, e.target.value)} />
                        : <span className="num">{d.cutoff}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        </section>
        <section className="card" aria-labelledby="gap-h">
          <h2 id="gap-h" className="app-h2">Where points were lost</h2>
          <TableBox label="Gaps ranked by points lost">
            <table className="app-table">
              <thead><tr><th>Parameter</th><th className="r">Points lost</th></tr></thead>
              <tbody>
                {rankGaps(score.parameters).slice(0, 6).map((g) => (
                  <tr key={g.id}><td><Link to={`/app/parameters/${g.id}`} className="app-link">#{g.id} {nameOf(g.id)}</Link></td><td className="r num">{fmt2(g.lost)}</td></tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        </section>
      </div>

      <section className="card" aria-labelledby="t-h">
        <h2 id="t-h" className="app-h2">Parameter scores</h2>
        <TableBox label="Parameter scores">
          <table className="app-table app-wide">
            <thead><tr><th>#</th><th>Measure</th><th>Parameter</th><th className="r">Weight</th><th className="r">Actual</th><th className="r">Target</th><th className="r">Points</th><th className="r">Lost</th></tr></thead>
            <tbody>
              {catalog.defs.map((d) => {
                const s = score.parameters[d.id];
                return (
                  <tr key={d.id}>
                    <td className="num">{d.id}</td>
                    <td className="num app-nowrap">{d.measureId}</td>
                    <td><Link to={`/app/parameters/${d.id}`} className="app-link">{d.name}</Link></td>
                    <td className="r num">{d.weight}</td>
                    <td className="r num">{s.actualLabel}</td>
                    <td className="r num">{s.targetLabel}</td>
                    <td className="r num">{fmt2(s.points)}</td>
                    <td className="r num">{fmt2(s.lost)}</td>
                  </tr>
                );
              })}
              <tr className="app-total"><td /><td /><td>Total</td><td className="r num">100</td><td /><td /><td className="r num">{fmt2(score.total)}</td><td className="r num">{fmt2(lost)}</td></tr>
            </tbody>
          </table>
        </TableBox>
      </section>

      <details className="card app-record">
        <summary className="app-h2">Questionnaire record</summary>
        <TableBox label="Questionnaire answers for each parameter">
          <table className="app-table app-wide">
            <thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Use</th></tr></thead>
            <tbody>
              {catalog.defs.flatMap((d) => visibleQuestions(d, state.params[d.id].responses).map((q) => (
                <tr key={q.id}>
                  <td className="num">{d.id}</td>
                  <td>{q.label}</td>
                  <td>{responseLabel(q, state.params[d.id].responses)}</td>
                  <td>{affectsScore(q) ? "Affects score" : "For the record"}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </TableBox>
      </details>
    </>
  );
}
