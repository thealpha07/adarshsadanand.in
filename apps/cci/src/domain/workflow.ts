import { scoreCycle } from "./scoring";
import type {
  Actor, Answer, AuditEvent, BuStatus, Catalog, CycleData, Domain, Extract, ParamRecord, ParamState, ParameterDef, Role,
} from "./types";

/**
 * Every change to the assessment goes through applyAction. It checks the role and the state,
 * returns the new state and records the audit events in the same step, so nothing can change
 * without leaving a record. Like a bank passbook: each entry is written with the transaction.
 */

export type Action =
  | { type: "save"; id: number; answer: Answer }
  | { type: "attach"; id: number }
  | { type: "submit"; id: number; answer: Answer }
  | { type: "reviewerReturn"; id: number; comment: string }
  | { type: "approve"; id: number; comment: string }
  | { type: "chiefReturn"; id: number; comment: string }
  | { type: "signBu"; buId: string; confirmed: boolean }
  | { type: "sendPack" }
  | { type: "declare"; confirmed: boolean }
  | { type: "setCutoff"; domain: Domain; value: number }
  | { type: "fastForward" };

export type Result = { ok: true; state: CycleData } | { ok: false; reason: string };

const ROLE_FOR: Partial<Record<Action["type"], Role>> = {
  save: "team", attach: "team", submit: "team",
  reviewerReturn: "reviewer", approve: "reviewer",
  chiefReturn: "chief", signBu: "chief",
  sendPack: "ciso", setCutoff: "ciso",
  declare: "md",
};

export const ROLE_LABEL: Record<Actor, string> = {
  team: "Team Member", reviewer: "Reviewer", chief: "BU Chief", ciso: "CISO/Compliance",
  md: "MD/CEO", auditor: "Internal Auditor", system: "System", demo: "Demo presenter",
};

export const STATE_LABEL: Record<ParamState, string> = {
  not_started: "Not started", draft: "Draft", review: "In review", returned: "Returned", approved: "Approved", locked: "Locked",
};

const EDITABLE: ParamState[] = ["not_started", "draft", "returned"];
export const isEditable = (s: ParamState) => EDITABLE.includes(s);

export function validateAnswer(def: ParameterDef, a: Pick<Answer, "numerator" | "denominator">): string | null {
  if (def.kind === "qualitative") return null;
  for (const v of [a.numerator, a.denominator]) {
    if (v !== null && (!Number.isFinite(v) || v < 0)) return "Enter numbers of 0 or more.";
  }
  if (a.numerator !== null && a.denominator !== null && a.numerator > a.denominator) {
    return `"${def.numeratorLabel}" cannot be more than "${def.denominatorLabel}".`;
  }
  return null;
}

export type EvidenceCheck =
  | { status: "none" }
  | { status: "match"; extract: Extract }
  | { status: "mismatch"; extract: Extract; summary: string };

type Comparable = Pick<ParamRecord, "numerator" | "denominator" | "criteria" | "evidenceAttached">;

export function compareEvidence(def: ParameterDef, r: Comparable, catalog: Catalog): EvidenceCheck {
  const extract = catalog.extracts[def.id];
  if (!r.evidenceAttached || !extract) return { status: "none" };
  if (def.kind === "qualitative") {
    const differs = (extract.criteria ?? []).filter((c, i) => c !== Boolean(r.criteria[i])).length;
    return differs ? { status: "mismatch", extract, summary: `${differs} criteria differ from the document.` } : { status: "match", extract };
  }
  const parts: string[] = [];
  if (extract.numerator !== r.numerator) {
    const gap = r.numerator === null ? null : Math.abs(r.numerator - (extract.numerator ?? 0));
    parts.push(gap === null ? `"${def.numeratorLabel}" is not answered yet` : `"${def.numeratorLabel}" differs by ${gap}`);
  }
  if (extract.denominator !== r.denominator) {
    const gap = r.denominator === null ? null : Math.abs(r.denominator - (extract.denominator ?? 0));
    parts.push(gap === null ? `"${def.denominatorLabel}" is not answered yet` : `"${def.denominatorLabel}" differs by ${gap}`);
  }
  return parts.length ? { status: "mismatch", extract, summary: `${parts.join(" and ")}.` } : { status: "match", extract };
}

/** Why this answer cannot be submitted yet. Empty means it can. */
export function submitBlockers(def: ParameterDef, r: Answer & Pick<ParamRecord, "evidenceAttached">, catalog: Catalog): string[] {
  const out: string[] = [];
  const invalid = validateAnswer(def, r);
  if (invalid) out.push(invalid);
  if (def.kind !== "qualitative") {
    if (r.numerator === null || r.denominator === null) out.push("Answer both questions.");
    else if (r.denominator === 0 && !r.naReason.trim()) out.push("Give a reason for marking this N/A.");
  }
  if (!r.evidenceAttached) out.push("Attach the evidence.");
  else if (compareEvidence(def, r, catalog).status === "mismatch" && !r.mismatchReason.trim()) {
    out.push("Correct your answer to match the evidence, or give a reason.");
  }
  return out;
}

export function buStatus(state: CycleData, buId: string, catalog: Catalog): BuStatus {
  if (state.signedBus[buId]) return "signed";
  const members = catalog.defs.filter((d) => d.buId === buId);
  return members.every((d) => state.params[d.id].state === "approved") ? "ready" : "open";
}

export function buProgress(state: CycleData, buId: string, catalog: Catalog) {
  const members = catalog.defs.filter((d) => d.buId === buId);
  const done = members.filter((d) => ["approved", "locked"].includes(state.params[d.id].state)).length;
  return { done, total: members.length, outstanding: members.filter((d) => !["approved", "locked"].includes(state.params[d.id].state)) };
}

export const allBusSigned = (state: CycleData, catalog: Catalog) => catalog.bus.every((b) => state.signedBus[b.id]);

function answerLabel(def: ParameterDef, r: Pick<ParamRecord, "numerator" | "denominator" | "criteria">) {
  if (def.kind === "qualitative") return `${r.criteria.filter(Boolean).length} of ${def.criteria?.length ?? 0} criteria`;
  if (r.numerator === null && r.denominator === null) return "Empty";
  return `${r.numerator ?? "?"} of ${r.denominator ?? "?"}`;
}

const paramTarget = (def: ParameterDef) => ({ targetId: String(def.id), target: `#${def.id} ${def.name}` });

export function applyAction(prev: CycleData, action: Action, catalog: Catalog, at: string): Result {
  const needed = ROLE_FOR[action.type];
  if (needed && prev.role !== needed) return { ok: false, reason: `Only the ${ROLE_LABEL[needed]} can do this.` };
  if (prev.cycleState === "declared") return { ok: false, reason: "The cycle is declared and locked." };

  const state: CycleData = { ...prev, params: { ...prev.params }, signedBus: { ...prev.signedBus }, audit: [...prev.audit] };
  const log = (actor: Actor, action: string, target: Pick<AuditEvent, "targetId" | "target">, oldValue = "", newValue = "", comment = "") =>
    state.audit.push({ seq: state.audit.length + 1, at, actor, action, oldValue, newValue, comment, ...target });
  const before = scoreCycle(catalog.defs, prev.params, prev.config);

  const reason = run(action, state, catalog, log, at);
  if (reason) return { ok: false, reason };

  const after = scoreCycle(catalog.defs, state.params, state.config);
  if (before.total !== after.total || before.rating !== after.rating) {
    log("system", "Score recalculated", { targetId: "cycle", target: "CCI total" }, `${before.total.toFixed(2)} ${before.rating}`, `${after.total.toFixed(2)} ${after.rating}`);
  }
  return { ok: true, state };
}

type Log = (actor: Actor, action: string, target: Pick<AuditEvent, "targetId" | "target">, oldValue?: string, newValue?: string, comment?: string) => void;

/** Returns a reason when the action is refused, or null once it has been applied. */
function run(action: Action, state: CycleData, catalog: Catalog, log: Log, at: string): string | null {
  const defOf = (id: number) => catalog.defs.find((d) => d.id === id);

  /** Applies an answer and records what changed, including whether it now agrees with the evidence. */
  const writeAnswer = (def: ParameterDef, answer: Answer): string | null => {
    const old = state.params[def.id];
    if (!isEditable(old.state)) return "This answer cannot be edited in its current state.";
    const invalid = validateAnswer(def, answer);
    if (invalid) return invalid;
    const oldCheck = compareEvidence(def, old, catalog).status;
    const next: ParamRecord = { ...old, ...answer, state: "draft" };
    const newCheck = compareEvidence(def, next, catalog).status;
    if (newCheck !== "mismatch") next.mismatchReason = "";
    state.params[def.id] = next;
    const from = answerLabel(def, old);
    const to = answerLabel(def, next);
    if (from !== to) log("team", from === "Empty" ? "Entered answer" : "Changed answer", paramTarget(def), from, to);
    if (oldCheck !== newCheck && newCheck !== "none") {
      log("system", newCheck === "mismatch" ? "Mismatch flagged (simulated)" : "Evidence now matches (simulated)", paramTarget(def), to, `Document: ${answerLabel(def, documentValues(def, catalog))}`);
    }
    return null;
  };

  switch (action.type) {
    case "save": {
      const def = defOf(action.id);
      return def ? writeAnswer(def, action.answer) : "Unknown parameter.";
    }
    case "attach": {
      const def = defOf(action.id);
      if (!def) return "Unknown parameter.";
      const old = state.params[def.id];
      if (!isEditable(old.state)) return "This answer cannot be edited in its current state.";
      const next = { ...old, evidenceAttached: true };
      state.params[def.id] = next;
      const check = compareEvidence(def, next, catalog);
      log("team", "Evidence attached", paramTarget(def), "", catalog.extracts[def.id]?.fileName ?? "");
      if (check.status === "mismatch") log("system", "Mismatch flagged (simulated)", paramTarget(def), answerLabel(def, next), `Document: ${answerLabel(def, documentValues(def, catalog))}`);
      return null;
    }
    case "submit": {
      const def = defOf(action.id);
      if (!def) return "Unknown parameter.";
      const blockers = submitBlockers(def, { ...action.answer, evidenceAttached: state.params[def.id].evidenceAttached }, catalog);
      if (blockers.length) return blockers[0];
      const failed = writeAnswer(def, action.answer);
      if (failed) return failed;
      const current = state.params[def.id];
      state.params[def.id] = { ...current, state: "review", returnComment: null, returnedBy: null };
      log("team", "Submitted for review", paramTarget(def), "Draft", "In review", current.mismatchReason || current.naReason);
      return null;
    }
    case "reviewerReturn":
    case "approve": {
      const def = defOf(action.id);
      if (!def) return "Unknown parameter.";
      const old = state.params[def.id];
      if (old.state !== "review") return "This parameter is not in review.";
      if (action.type === "reviewerReturn") {
        if (!action.comment.trim()) return "A comment is required to return a parameter.";
        state.params[def.id] = { ...old, state: "returned", returnComment: action.comment.trim(), returnedBy: "reviewer" };
        log("reviewer", "Returned", paramTarget(def), "In review", "Returned", action.comment.trim());
      } else {
        state.params[def.id] = { ...old, state: "approved" };
        log("reviewer", "Approved", paramTarget(def), "In review", "Approved", action.comment.trim());
      }
      return null;
    }
    case "chiefReturn": {
      const def = defOf(action.id);
      if (!def) return "Unknown parameter.";
      const old = state.params[def.id];
      if (old.state !== "approved") return "Only an approved, unsigned parameter can be returned.";
      if (!action.comment.trim()) return "A comment is required to return a parameter.";
      state.params[def.id] = { ...old, state: "returned", returnComment: action.comment.trim(), returnedBy: "chief" };
      log("chief", "Returned by BU Chief", paramTarget(def), "Approved", "Returned", action.comment.trim());
      return null;
    }
    case "signBu": {
      const bu = catalog.bus.find((b) => b.id === action.buId);
      if (!bu) return "Unknown business unit.";
      if (state.signedBus[bu.id]) return "This business unit is already signed.";
      if (buStatus(state, bu.id, catalog) !== "ready") return "Every parameter in this business unit must be approved first.";
      if (!action.confirmed) return "Tick the confirmation first.";
      lockBu(state, bu.id, catalog, log, at, "chief", "Signed and locked");
      return null;
    }
    case "sendPack":
      if (state.cycleState !== "open") return "The pack has already been sent.";
      if (!allBusSigned(state, catalog)) return "All business units must be signed first.";
      state.cycleState = "with_signatory";
      log("ciso", "Pack sent to signatory", { targetId: "cycle", target: "FY cycle" }, "Open", "With signatory");
      return null;
    case "declare":
      if (state.cycleState !== "with_signatory") return "The CISO/Compliance team must send the pack first.";
      if (!action.confirmed) return "Tick the declaration first.";
      state.cycleState = "declared";
      state.declaredAt = at;
      log("md", "CCI declared, cycle locked", { targetId: "cycle", target: "FY cycle" }, "With signatory", "Declared");
      return null;
    case "setCutoff": {
      if (state.cycleState !== "open") return "Cutoffs cannot change after the pack is sent.";
      if (!Number.isFinite(action.value) || action.value < 0 || action.value > 100) return "Enter a cutoff from 0 to 100.";
      const old = state.config.cutoffs[action.domain];
      if (old === action.value) return null;
      state.config = { cutoffs: { ...state.config.cutoffs, [action.domain]: action.value } };
      log("ciso", "Domain cutoff changed", { targetId: "cycle", target: `Domain ${action.domain}` }, `${old}%`, `${action.value}%`);
      return null;
    }
    case "fastForward": {
      // A presenter shortcut for the BUs the demo does not walk through. Openly logged as a demo action.
      if (state.cycleState !== "open") return "The pack has already been sent.";
      const others = catalog.bus.filter((b) => b.id !== catalog.bus[0].id && !state.signedBus[b.id]);
      if (!others.length) return "The other business units are already signed.";
      for (const bu of others) {
        for (const def of catalog.defs.filter((d) => d.buId === bu.id)) state.params[def.id] = { ...state.params[def.id], state: "approved" };
        lockBu(state, bu.id, catalog, log, at, "demo", "Demo fast-forward: approved and signed");
      }
      return null;
    }
  }
}

function lockBu(state: CycleData, buId: string, catalog: Catalog, log: Log, at: string, actor: Actor, action: string) {
  const members = catalog.defs.filter((d) => d.buId === buId);
  for (const d of members) state.params[d.id] = { ...state.params[d.id], state: "locked" };
  state.signedBus[buId] = at;
  const name = catalog.bus.find((b) => b.id === buId)?.name ?? buId;
  log(actor, action, { targetId: `bu:${buId}`, target: name }, "Unsigned", "Signed", `${members.length} parameters locked`);
}

function documentValues(def: ParameterDef, catalog: Catalog) {
  const e = catalog.extracts[def.id];
  return { numerator: e?.numerator ?? null, denominator: e?.denominator ?? null, criteria: e?.criteria ?? [] };
}
