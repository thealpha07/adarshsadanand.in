import { describe, expect, it } from "vitest";
import { catalog, defs } from "../data/catalog";
import { seedCycle } from "../data/seed";
import { rankGaps, ratingFor, scoreCycle, scoreParameter } from "./scoring";
import { applyAction, buStatus, compareEvidence, submitBlockers, type Action } from "./workflow";
import type { Answer, CycleData, ParamRecord, Role } from "./types";

const AT = "2026-11-06T10:00:00.000Z";
const def = (id: number) => defs.find((d) => d.id === id)!;
const answer = (r: ParamRecord, n: number | null, d: number | null, extra: Partial<Answer> = {}): Answer => ({
  numerator: n, denominator: d, responses: r.responses, scope: r.scope, mismatchReason: r.mismatchReason, naReason: r.naReason, ...extra,
});
const act = (s: CycleData, role: Role, a: Action): CycleData => {
  const res = applyAction({ ...s, role }, a, catalog, AT);
  if (!res.ok) throw new Error(res.reason);
  return res.state;
};
const refused = (s: CycleData, role: Role, a: Action) => {
  const res = applyAction({ ...s, role }, a, catalog, AT);
  if (res.ok) throw new Error("expected a refusal");
  return res.reason;
};
const score = (s: CycleData) => scoreCycle(defs, s.params, s.config);
const seed = () => seedCycle(AT);

/** The panel story up to Reviewer approval of the corrected value. */
function correctedAndApproved() {
  let s = seed();
  s = act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 420, 480) });
  s = act(s, "team", { type: "attach", id: 2 });
  s = act(s, "team", { type: "submit", id: 2, answer: answer(s.params[2], 420, 480, { mismatchReason: "40 fixes closed later" }) });
  s = act(s, "reviewer", { type: "reviewerReturn", id: 2, comment: "No evidence for the later fixes." });
  s = act(s, "team", { type: "submit", id: 2, answer: answer(s.params[2], 380, 480) });
  return act(s, "reviewer", { type: "approve", id: 2, comment: "" });
}

describe("scoring against the worked numbers in the spec", () => {
  it("has 23 parameters whose weights total 100", () => {
    expect(defs).toHaveLength(23);
    expect(defs.reduce((sum, d) => sum + d.weight, 0)).toBe(100);
  });

  it("scores the standard, capped, inverse and qualitative cases", () => {
    const base = { responses: {} };
    expect(scoreParameter(def(2), { ...base, numerator: 380, denominator: 480 }).points).toBe(14.25);
    expect(scoreParameter(def(2), { ...base, numerator: 420, denominator: 480 }).points).toBe(15.75);
    expect(scoreParameter(def(1), { ...base, numerator: 90, denominator: 1000 }).points).toBe(7.2);
    expect(scoreParameter(def(1), { ...base, numerator: 200, denominator: 1000 }).points).toBe(8);
    expect(scoreParameter(def(19), { ...base, numerator: 40, denominator: 100 }).points).toBe(7.2);
    expect(scoreParameter(def(12), { ...base, numerator: 1, denominator: 4 }).points).toBe(0.75);
    expect(scoreParameter(def(21), { numerator: null, denominator: null, responses: seed().params[21].responses }).points).toBe(3);
  });

  it("rounds half up", () => {
    expect(scoreParameter(def(2), { responses: {}, numerator: 390, denominator: 480 }).points).toBe(14.63);
  });

  it("treats a zero denominator as N/A with full points", () => {
    const r = scoreParameter(def(9), { responses: {}, numerator: 0, denominator: 0 });
    expect(r.notApplicable).toBe(true);
    expect(r.points).toBe(2);
  });

  it("counts an unanswered parameter as zero", () => {
    expect(score(seed()).total).toBe(66.68);
    expect(score(seed()).unanswered).toBe(1);
  });

  it("does not apply the Fail rule to a domain that still has unanswered parameters", () => {
    const start = score(seed());
    expect(start.domains.find((d) => d.domain === "DE")!.percent).toBeLessThan(50);
    expect(start.failedDomains).toEqual([]);
    expect(start.rating).toBe("Developing");
  });

  it("gives 82.43 Optimal when claimed, 80.93 Manageable when corrected", () => {
    let s = seed();
    s = act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 420, 480) });
    expect(score(s).total).toBe(82.43);
    expect(score(s).rating).toBe("Optimal");
    const corrected = score(correctedAndApproved());
    expect(corrected.total).toBe(80.93);
    expect(corrected.rating).toBe("Manageable");
  });

  it("matches the spec's domain table", () => {
    const got = Object.fromEntries(score(correctedAndApproved()).domains.map((d) => [d.domain, [d.max, d.earned, d.percent]]));
    expect(got).toEqual({
      GV: [24, 19.66, 81.9], ID: [14, 11.45, 81.8], PR: [20, 16.97, 84.9], DE: [22, 17.55, 79.8], RS: [10, 8.4, 84], Overall: [10, 6.9, 69],
    });
  });

  it("matches the spec's business unit table", () => {
    const scores = score(correctedAndApproved()).parameters;
    const earned = (bu: string) => Math.round(defs.filter((d) => d.buId === bu).reduce((t, d) => t + scores[d.id].points, 0) * 100) / 100;
    expect(earned("cso")).toBe(26.85);
    expect(earned("inf")).toBe(21);
    expect(earned("rc")).toBe(16.65);
    expect(earned("fin")).toBe(9.3);
    expect(earned("hr")).toBe(7.13);
  });

  it("ranks the gaps by points lost", () => {
    const top = rankGaps(score(correctedAndApproved()).parameters).slice(0, 5).map((g) => [g.id, g.lost]);
    expect(top).toEqual([[2, 3.75], [23, 2], [19, 1.8], [18, 1.6], [22, 1.1]]);
  });

  it("uses band floors, so 90.5 is Optimal and 50.99 is Fail", () => {
    expect(ratingFor(91)).toBe("Exceptional");
    expect(ratingFor(90.5)).toBe("Optimal");
    expect(ratingFor(51)).toBe("Bare Minimum");
    expect(ratingFor(50.99)).toBe("Fail");
  });

  it("fails the entity when one domain is below its cutoff, whatever the total", () => {
    let s = correctedAndApproved();
    s = act(s, "ciso", { type: "setCutoff", domain: "Overall", value: 70 });
    expect(score(s).total).toBe(80.93);
    expect(score(s).bandRating).toBe("Manageable");
    expect(score(s).rating).toBe("Fail");
  });
});

describe("questionnaires", () => {
  const score2 = (numerator: number, responses: Record<string, string>) =>
    scoreParameter(def(2), { numerator, denominator: 480, responses });

  it("gives every parameter a set with a value list and at least one other type", () => {
    for (const d of defs) {
      expect(d.questions.length).toBeGreaterThanOrEqual(2);
      expect(d.questions.some((q) => q.kind === "list")).toBe(true);
      expect(d.questions.some((q) => q.kind !== "list")).toBe(true);
    }
    const kinds = new Set(defs.flatMap((d) => d.questions.map((q) => q.kind)));
    expect([...kinds].sort()).toEqual(["list", "number", "text"]);
    const ids = defs.flatMap((d) => d.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("starts with sample answers that leave the scores unchanged", () => {
    expect(score(seed()).total).toBe(66.68);
  });

  it("excludes numeric answers from the numerator, keeping the SEBI formula", () => {
    const r = score2(420, { "2-retest": "some", "2-not-retested": "40" });
    expect(r.points).toBe(14.25);
    expect(r.steps[0]).toContain("420 − 40");
  });

  it("ignores a conditional question while its parent answer hides it", () => {
    expect(score2(420, { "2-retest": "all", "2-not-retested": "40" }).points).toBe(15.75);
  });

  it("lets a value-list answer remove credit", () => {
    const r = scoreParameter(def(1), { numerator: 90, denominator: 1000, responses: { "1-status": "proposed" } });
    expect(r.points).toBe(0);
    expect(r.steps[0]).toContain("Not counted");
  });

  it("uses value lists for the criteria of #21", () => {
    const responses = { ...seed().params[21].responses, "21-observation": "none" };
    expect(scoreParameter(def(21), { numerator: null, denominator: null, responses }).points).toBe(4);
    const incomplete: Record<string, string> = { ...responses };
    delete incomplete["21-exists"];
    expect(scoreParameter(def(21), { numerator: null, denominator: null, responses: incomplete }).answered).toBe(false);
  });

  it("refuses exclusions larger than the numerator", () => {
    const s = seed();
    const bad = answer(s.params[2], 10, 480, { responses: { ...s.params[2].responses, "2-retest": "some", "2-not-retested": "11" } });
    expect(refused(s, "team", { type: "save", id: 2, answer: bad })).toContain("cannot be more than");
  });

  it("blocks submission until required questions are answered", () => {
    const r = seed().params[2];
    const blockers = submitBlockers(def(2), { ...answer(r, 380, 480, { responses: { ...r.responses, "2-scan": "" } }), evidenceAttached: true }, catalog);
    expect(blockers.join()).toContain("Scan type");
  });

  it("records every questionnaire change, including ones with no score effect", () => {
    let s = seed();
    s = act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 420, 480, { responses: { ...s.params[2].responses, "2-tool": "Scanner A" } }) });
    const e = s.audit.find((x) => x.action === "Questionnaire answer changed")!;
    expect([e.comment, e.newValue]).toEqual(["Scanning tool", "Scanner A"]);
  });

  it("recalculates and records the score when an answer changes it", () => {
    let s = seed();
    s = act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 420, 480) });
    s = act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 420, 480, { responses: { ...s.params[2].responses, "2-retest": "some", "2-not-retested": "40" } }) });
    expect(s.audit.at(-1)!.newValue).toBe("80.93 Manageable");
  });
});

describe("evidence check", () => {
  it("flags a mismatch and clears it when corrected", () => {
    let s = seed();
    s = act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 420, 480) });
    s = act(s, "team", { type: "attach", id: 2 });
    expect(compareEvidence(def(2), s.params[2], catalog).status).toBe("mismatch");
    s = act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 380, 480) });
    expect(compareEvidence(def(2), s.params[2], catalog).status).toBe("match");
    expect(s.audit.some((e) => e.action.startsWith("Evidence now matches"))).toBe(true);
  });

  it("needs evidence, and a reason or correction for a mismatch, before submitting", () => {
    const s = seed();
    const r = s.params[2];
    expect(submitBlockers(def(2), { ...answer(r, 420, 480), evidenceAttached: false }, catalog)).toContain("Attach the evidence.");
    expect(submitBlockers(def(2), { ...answer(r, 420, 480), evidenceAttached: true }, catalog)).toHaveLength(1);
    expect(submitBlockers(def(2), { ...answer(r, 420, 480, { mismatchReason: "why" }), evidenceAttached: true }, catalog)).toHaveLength(0);
    expect(submitBlockers(def(2), { ...answer(r, 380, 480), evidenceAttached: true }, catalog)).toHaveLength(0);
  });
});

describe("workflow rules", () => {
  it("refuses a numerator above the denominator", () => {
    const s = seed();
    expect(refused(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 500, 480) })).toContain("cannot be more than");
  });

  it("enforces which role may act", () => {
    const s = seed();
    expect(refused(s, "reviewer", { type: "save", id: 2, answer: answer(s.params[2], 1, 2) })).toContain("Team Member");
    expect(refused(s, "team", { type: "approve", id: 1, comment: "" })).toContain("Reviewer");
    expect(refused(s, "auditor", { type: "sendPack" })).toContain("CISO");
  });

  it("requires a comment to return", () => {
    expect(refused(seed(), "reviewer", { type: "reviewerReturn", id: 1, comment: "  " })).toContain("comment");
  });

  it("blocks sign-off until every parameter in the BU is approved, then locks them all", () => {
    let s = seed();
    expect(refused(s, "chief", { type: "signBu", buId: "cso", confirmed: true })).toContain("approved");
    s = correctedAndApproved();
    expect(buStatus(s, "cso", catalog)).toBe("ready");
    expect(refused(s, "chief", { type: "signBu", buId: "cso", confirmed: false })).toContain("confirmation");
    s = act(s, "chief", { type: "signBu", buId: "cso", confirmed: true });
    expect(buStatus(s, "cso", catalog)).toBe("signed");
    expect(defs.filter((d) => d.buId === "cso").every((d) => s.params[d.id].state === "locked")).toBe(true);
    expect(refused(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 1, 2) })).toContain("cannot be edited");
  });

  it("returns only one parameter when the BU Chief rejects it, and the BU stays unsigned", () => {
    let s = correctedAndApproved();
    s = act(s, "chief", { type: "chiefReturn", id: 5, comment: "Recheck the system list." });
    expect(s.params[5].state).toBe("returned");
    expect(s.params[6].state).toBe("approved");
    expect(s.params[2].state).toBe("approved");
    expect(buStatus(s, "cso", catalog)).toBe("open");
  });

  it("will not send the pack or declare early, then locks everything on declaration", () => {
    let s = correctedAndApproved();
    expect(refused(s, "ciso", { type: "sendPack" })).toContain("signed");
    expect(refused(s, "md", { type: "declare", confirmed: true })).toContain("send the pack");
    s = act(s, "chief", { type: "signBu", buId: "cso", confirmed: true });
    s = act(s, "ciso", { type: "fastForward" });
    s = act(s, "ciso", { type: "sendPack" });
    expect(refused(s, "ciso", { type: "setCutoff", domain: "GV", value: 60 })).toContain("after the pack");
    expect(refused(s, "md", { type: "declare", confirmed: false })).toContain("declaration");
    s = act(s, "md", { type: "declare", confirmed: true });
    expect(s.cycleState).toBe("declared");
    expect(refused(s, "ciso", { type: "fastForward" })).toContain("locked");
  });

  it("records who changed what, with the old value kept, in an append-only trail", () => {
    const s = correctedAndApproved();
    const seqs = s.audit.map((e) => e.seq);
    expect(seqs).toEqual(seqs.map((_, i) => i + 1));
    const change = s.audit.find((e) => e.action === "Changed answer" && e.targetId === "2")!;
    expect([change.oldValue, change.newValue, change.actor]).toEqual(["420 of 480", "380 of 480", "team"]);
    const rescored = s.audit.filter((e) => e.action === "Score recalculated").at(-1)!;
    expect([rescored.oldValue, rescored.newValue]).toEqual(["82.43 Optimal", "80.93 Manageable"]);
    expect(s.audit.some((e) => e.action === "Returned" && e.comment.includes("later fixes"))).toBe(true);
  });

  it("does not mutate the state it was given", () => {
    const s = seed();
    const copy = JSON.stringify(s);
    act(s, "team", { type: "save", id: 2, answer: answer(s.params[2], 420, 480) });
    expect(JSON.stringify(s)).toBe(copy);
  });
});
