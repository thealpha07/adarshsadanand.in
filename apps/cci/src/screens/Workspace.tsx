import { useState } from "react";
import { Link, useParams } from "react-router";
import { PageHead, StateBadge, TableBox, fmtTime, usePageTitle } from "../components/ui";
import { catalog } from "../data/catalog";
import { affectsScore, criteriaOf, responsesFromCriteria, visibleQuestions } from "../domain/questions";
import { fmt2, scoreCycle, scoreParameter } from "../domain/scoring";
import type { Answer, ParamRecord, ParameterDef } from "../domain/types";
import { compareEvidence, isEditable, ROLE_LABEL, submitBlockers, validateAnswer } from "../domain/workflow";
import { useCci } from "../state/store";

const parseNum = (text: string) => (text.trim() === "" ? null : Number(text));

export function Workspace() {
  const { id } = useParams();
  const def = catalog.defs.find((d) => String(d.id) === id);
  const { state } = useCci();
  usePageTitle(def ? `#${def.id} ${def.name}` : "Parameter not found");
  if (!def) {
    return <div className="card"><p>There is no parameter with that number. <Link to="/app/parameters" className="app-link">See all 23</Link>.</p></div>;
  }
  const r = state.params[def.id];
  // Saved values changing, from this screen or another role, restart the form from them.
  return <Form key={`${def.id}-${r.state}-${r.numerator}-${r.denominator}-${JSON.stringify(r.responses)}`} def={def} record={r} />;
}

function Form({ def, record: r }: { def: ParameterDef; record: ParamRecord }) {
  const { state, score, dispatch, announce } = useCci();
  const [num, setNum] = useState(r.numerator === null ? "" : String(r.numerator));
  const [den, setDen] = useState(r.denominator === null ? "" : String(r.denominator));
  const [responses, setResponses] = useState<Record<string, string>>(r.responses);
  const [scope, setScope] = useState(r.scope);
  const [mismatchReason, setMismatchReason] = useState(r.mismatchReason);
  const [naReason, setNaReason] = useState(r.naReason);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const open = state.cycleState !== "declared";
  const canEdit = open && state.role === "team" && isEditable(r.state);
  const canReview = open && state.role === "reviewer" && r.state === "review";
  const buName = catalog.bus.find((b) => b.id === def.buId)?.name ?? def.buId;

  const draft: Answer = { numerator: parseNum(num), denominator: parseNum(den), responses, scope, mismatchReason, naReason };
  const invalid = validateAnswer(def, draft);
  const safe = invalid ? { ...draft, numerator: null, denominator: null } : draft;
  const live = scoreParameter(def, safe);
  const liveTotal = scoreCycle(catalog.defs, { ...state.params, [def.id]: safe }, state.config);
  const check = compareEvidence(def, { ...safe, evidenceAttached: r.evidenceAttached }, catalog);
  const blockers = submitBlockers(def, { ...draft, evidenceAttached: r.evidenceAttached }, catalog);
  const history = state.audit.filter((e) => e.targetId === String(def.id)).reverse();

  const act = (run: () => string | null, done: string) => {
    const refused = run();
    setError(refused ?? "");
    if (!refused) announce(done);
  };
  const useDocument = () => {
    const e = catalog.extracts[def.id];
    if (def.kind === "qualitative") setResponses({ ...responses, ...responsesFromCriteria(def, e.criteria ?? []) });
    else { setNum(String(e.numerator)); setDen(String(e.denominator)); }
    setMismatchReason("");
  };

  return (
    <>
      <PageHead
        tag={`#${def.id} · ${buName} · ${def.domain} · Weight ${def.weight}`}
        title={def.name}
        side={<StateBadge state={r.state} />}
      />
      <Link to="/app/parameters" className="app-link small">All parameters</Link>

      {r.returnComment && isEditable(r.state) && (
        <div className="app-flag" role="status">
          <strong>Returned by the {r.returnedBy ? ROLE_LABEL[r.returnedBy] : "reviewer"}:</strong> {r.returnComment}
        </div>
      )}
      {!canEdit && !canReview && (
        <p className="small body-2 app-hint">
          {r.state === "locked" ? "Locked after BU sign-off. " : ""}
          Read-only for the {ROLE_LABEL[state.role]}.
          {open && isEditable(r.state) ? " Switch to Team Member to answer." : ""}
          {open && r.state === "review" ? " Switch to Reviewer to decide." : ""}
          {open && r.state === "approved" ? " The BU Chief can return it from BU sign-off." : ""}
        </p>
      )}

      <div className="app-split">
        <div className="app-col">
          <section className="card" aria-labelledby="q-h">
            <h2 id="q-h" className="app-h2">Questionnaire</h2>
            <fieldset className="app-fieldset" disabled={!canEdit}>
              <legend className="visually-hidden">Answers for {def.name}</legend>
              {def.kind !== "qualitative" && (
                <>
                  <div className="field">
                    <label htmlFor="den">{def.denominatorLabel}</label>
                    <input id="den" type="number" min="0" inputMode="decimal" value={den} onChange={(e) => setDen(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="num">{def.numeratorLabel}</label>
                    <input id="num" type="number" min="0" inputMode="decimal" value={num} onChange={(e) => setNum(e.target.value)} aria-describedby={invalid ? "num-err" : undefined} />
                  </div>
                </>
              )}
              {visibleQuestions(def, responses).map((q) => (
                <div className="field" key={q.id}>
                  <div className="app-q-head">
                    <label htmlFor={`q-${q.id}`}>{q.label}{q.required ? "" : " (optional)"}</label>
                    <span className={affectsScore(q) ? "app-q-tag is-score" : "app-q-tag"}>{affectsScore(q) ? "Affects score" : "For the record"}</span>
                  </div>
                  {q.kind === "list" ? (
                    <select id={`q-${q.id}`} value={responses[q.id] ?? ""} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}>
                      <option value="">Choose</option>
                      {q.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`q-${q.id}`}
                      type={q.kind === "number" ? "number" : "text"}
                      min={q.kind === "number" ? "0" : undefined}
                      inputMode={q.kind === "number" ? "decimal" : undefined}
                      value={responses[q.id] ?? ""}
                      onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              {invalid && <p id="num-err" className="error-text" role="alert">{invalid}</p>}
              <div className="field">
                <label htmlFor="scope">Period or scope covered</label>
                <input id="scope" value={scope} onChange={(e) => setScope(e.target.value)} />
              </div>
              {def.kind !== "qualitative" && draft.denominator === 0 && (
                <div className="field app-area">
                  <label htmlFor="na">Reason for marking this N/A</label>
                  <span className="hint">Required, because the denominator is 0. The Reviewer must accept it.</span>
                  <textarea id="na" value={naReason} onChange={(e) => setNaReason(e.target.value)} />
                </div>
              )}
              {check.status === "mismatch" && (canEdit || r.mismatchReason) && (
                <div className="field app-area">
                  <label htmlFor="why">Reason for keeping a different value</label>
                  <span className="hint">Required because the evidence disagrees. Otherwise, correct your answer.</span>
                  <textarea id="why" value={mismatchReason} onChange={(e) => setMismatchReason(e.target.value)} />
                </div>
              )}
            </fieldset>
            {canEdit && (
              <>
                <div className="app-actions">
                  <button
                    className="btn btn-dark app-btn"
                    disabled={blockers.length > 0}
                    onClick={() => act(() => dispatch({ type: "submit", id: def.id, answer: draft }), "Submitted for review.")}
                  >
                    Submit for review
                  </button>
                  <button
                    className="btn btn-line app-btn"
                    disabled={Boolean(invalid)}
                    onClick={() => act(() => dispatch({ type: "save", id: def.id, answer: draft }), "Draft saved.")}
                  >
                    Save draft
                  </button>
                </div>
                {blockers.length > 0 && <p className="small body-2">To submit: {blockers.join(" ")}</p>}
              </>
            )}
            {error && <p className="error-text" role="alert">{error}</p>}
          </section>

          <section className="card" aria-labelledby="w-h">
            <h2 id="w-h" className="app-h2">How this score is calculated</h2>
            <p className="app-points"><span className="grot">{fmt2(live.points)}</span> <span className="num">of {def.weight} points</span></p>
            <p className="small body-2">Formula: {def.formula}.</p>
            {live.steps.length > 0
              ? <ol className="app-steps num">{live.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              : <p className="small body-2">Answer the questions to see the working.</p>}
            <p className="small body-2" aria-live="polite">
              With this answer, the provisional total is <strong>{fmt2(liveTotal.total)}, {liveTotal.rating}</strong>
              {liveTotal.total !== score.total ? ` (saved value: ${fmt2(score.total)}, ${score.rating})` : ""}.
            </p>
            <p className="small muted">The point conversion is a stated assumption. See the report.</p>
          </section>
        </div>

        <div className="app-col">
          <section className="card" aria-labelledby="e-h">
            <h2 id="e-h" className="app-h2">Evidence check</h2>
            {r.evidenceAttached ? (
              <div className="app-file">
                <span className="app-break">{catalog.extracts[def.id].fileName}</span>
                <span className="app-badge">Simulated extraction</span>
              </div>
            ) : (
              <>
                <p className="small body-2">No evidence yet. This demo attaches a sample document and simulates reading it. It does not accept real files.</p>
                {canEdit && (
                  <button
                    className="btn btn-line app-btn app-start"
                    onClick={() => act(() => {
                      const saved = dispatch({ type: "save", id: def.id, answer: draft });
                      return saved ?? dispatch({ type: "attach", id: def.id });
                    }, "Sample document attached.")}
                  >
                    Attach sample document
                  </button>
                )}
              </>
            )}
            {check.status === "mismatch" && (
              <div className="app-flag" role="status">
                <strong>Mismatch:</strong> {check.summary}{" "}
                {r.mismatchReason && !canEdit ? "The Team Member kept their value and gave a reason." : "Correct your answer, or give a reason for the Reviewer."}
              </div>
            )}
            {check.status === "match" && <p className="app-match" role="status">Answer matches the document.</p>}
            {check.status !== "none" && (
              <TableBox label="Answer compared with the document">
                {def.kind === "qualitative" ? (
                  <table className="app-table">
                    <thead><tr><th>Criterion</th><th>Answer</th><th>Document</th></tr></thead>
                    <tbody>
                      {def.questions.filter((q) => q.effect === "criterion").map((q, i) => {
                        const doc = check.extract.criteria?.[i];
                        const mine = criteriaOf(def, responses)[i];
                        const diff = doc !== mine;
                        return (
                          <tr key={q.id}>
                            <td>{q.label}</td>
                            <td className={diff ? "app-diff" : ""}>{mine ? "Yes" : "No"}</td>
                            <td className={diff ? "app-diff" : ""}>{doc ? "Yes" : "No"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="app-table">
                    <thead><tr><th>Field</th><th className="r">Answer</th><th className="r">Document</th></tr></thead>
                    <tbody>
                      <Compare label={def.denominatorLabel} a={draft.denominator} b={check.extract.denominator} />
                      <Compare label={def.numeratorLabel} a={draft.numerator} b={check.extract.numerator} />
                      <ImpactRows def={def} safe={safe} />
                    </tbody>
                  </table>
                )}
              </TableBox>
            )}
            {check.status === "mismatch" && canEdit && (
              <button className="btn btn-line app-btn app-start" onClick={useDocument}>Use the document's values</button>
            )}
          </section>

          {canReview && (
            <section className="card" aria-labelledby="d-h">
              <h2 id="d-h" className="app-h2">Your decision</h2>
              {r.mismatchReason && <div className="app-file app-quote"><strong>Team Member's reason</strong><span>{r.mismatchReason}</span></div>}
              {r.naReason && <div className="app-file app-quote"><strong>Reason for N/A</strong><span>{r.naReason}</span></div>}
              <div className="field app-area">
                <label htmlFor="comment">Comment</label>
                <span className="hint">Required to return. Optional to approve.</span>
                <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <div className="app-actions">
                <button className="btn btn-line app-danger-line app-btn" onClick={() => act(() => dispatch({ type: "reviewerReturn", id: def.id, comment }), "Returned to the Team Member.")}>Return with comment</button>
                <button className="btn btn-dark app-btn" onClick={() => act(() => dispatch({ type: "approve", id: def.id, comment }), "Approved.")}>Approve</button>
              </div>
              {error && <p className="error-text" role="alert">{error}</p>}
            </section>
          )}

          <section className="card" aria-labelledby="h-h">
            <h2 id="h-h" className="app-h2">History</h2>
            {history.length ? (
              <TableBox label="History of this parameter">
                <table className="app-table">
                  <tbody>
                    {history.slice(0, 8).map((e) => (
                      <tr key={e.seq}>
                        <td className="num app-nowrap">{fmtTime(e.at)}</td>
                        <td>
                          {ROLE_LABEL[e.actor]}: {e.action}
                          {e.oldValue || e.newValue ? <span className="muted"> ({e.oldValue ? `${e.oldValue} to ` : ""}{e.newValue})</span> : null}
                          {e.comment && <span className="muted app-block">{e.comment}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableBox>
            ) : <p className="small body-2">No actions recorded on this parameter yet.</p>}
            <Link to={`/app/audit?parameter=${def.id}`} className="app-link small">See the full record</Link>
          </section>
        </div>
      </div>
    </>
  );
}

function Compare({ label, a, b }: { label: string; a: number | null; b?: number }) {
  const diff = a !== b;
  return (
    <tr>
      <td>{label}</td>
      <td className={`r num ${diff ? "app-diff" : ""}`}>{a ?? "None"}</td>
      <td className={`r num ${diff ? "app-diff" : ""}`}>{b}</td>
    </tr>
  );
}

/** What the difference is worth, so a reviewer sees the stakes and not just two numbers. */
function ImpactRows({ def, safe }: { def: ParameterDef; safe: Answer }) {
  const { state } = useCci();
  const e = catalog.extracts[def.id];
  const docAnswer = { ...safe, numerator: e.numerator ?? null, denominator: e.denominator ?? null };
  if (e.numerator === safe.numerator && e.denominator === safe.denominator) return null;
  const mine = scoreCycle(catalog.defs, { ...state.params, [def.id]: safe }, state.config);
  const doc = scoreCycle(catalog.defs, { ...state.params, [def.id]: docAnswer }, state.config);
  return (
    <>
      <tr><td>Points</td><td className="r num app-diff">{fmt2(mine.parameters[def.id].points)}</td><td className="r num app-diff">{fmt2(doc.parameters[def.id].points)}</td></tr>
      <tr><td>Provisional total</td><td className="r num app-diff">{fmt2(mine.total)} {mine.rating}</td><td className="r num app-diff">{fmt2(doc.total)} {doc.rating}</td></tr>
    </>
  );
}
