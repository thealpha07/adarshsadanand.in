/**
 * The vocabulary of the CCI tool. Nothing in domain/ imports React, the browser or sample data,
 * so these rules can move to the project's own repo and be tested alone.
 */

export type Role = "team" | "reviewer" | "chief" | "ciso" | "md" | "auditor";
/** Who an audit entry is attributed to: a role, the system itself, or the demo presenter. */
export type Actor = Role | "system" | "demo";

export type Domain = "GV" | "ID" | "PR" | "DE" | "RS" | "Overall";

export type ParamState = "not_started" | "draft" | "review" | "returned" | "approved" | "locked";
export type BuStatus = "open" | "ready" | "signed";
export type CycleState = "open" | "with_signatory" | "declared";

/** ratio: higher is better, capped at target. inverse: lower is better. qualitative: criteria met. */
export type ScoringKind = "ratio" | "inverse" | "qualitative";

export interface QuestionOption {
  value: string;
  label: string;
  /** Choosing this means nothing can be counted for the parameter, such as an unapproved budget. */
  noCredit?: boolean;
  /** For a criterion question: whether this answer meets the criterion. */
  meetsCriterion?: boolean;
}

/**
 * How an answer reaches the score, always through the formula's inputs:
 * record: kept for the audit trail only (a list option can still be noCredit).
 * excludeFromNumerator: a count of items that must not be counted as achieved.
 * criterion: one of a qualitative parameter's criteria.
 */
export type QuestionEffect = "record" | "excludeFromNumerator" | "criterion";

export interface Question {
  id: string;
  label: string;
  kind: "list" | "number" | "text";
  effect: QuestionEffect;
  required: boolean;
  options?: QuestionOption[];
  /** Only asked when another list question has this value. */
  showIf?: { question: string; value: string };
  /** The value the sample organisation starts with. */
  sample?: string;
}

export interface ParameterDef {
  id: number;
  name: string;
  measureId: string;
  domain: Domain;
  weight: number;
  kind: ScoringKind;
  /** As a fraction: 1 is 100%, 0.1 is 10%. Inverse parameters have target 0. */
  target: number;
  buId: string;
  formula: string;
  numeratorLabel: string;
  denominatorLabel: string;
  questions: Question[];
}

export interface BusinessUnit {
  id: string;
  name: string;
}

/** What a simulated document read returns. Never produced from a real file in this MVP. */
export interface Extract {
  fileName: string;
  numerator?: number;
  denominator?: number;
  criteria?: boolean[];
}

export interface Catalog {
  defs: ParameterDef[];
  bus: BusinessUnit[];
  extracts: Record<number, Extract>;
}

export interface Answer {
  numerator: number | null;
  denominator: number | null;
  /** Questionnaire answers by question id, always stored as text. */
  responses: Record<string, string>;
  scope: string;
  mismatchReason: string;
  naReason: string;
}

export interface ParamRecord extends Answer {
  state: ParamState;
  evidenceAttached: boolean;
  /** The latest return comment. Cleared on resubmission; the audit trail keeps all of them. */
  returnComment: string | null;
  returnedBy: Role | null;
}

export interface AuditEvent {
  seq: number;
  at: string;
  actor: Actor;
  action: string;
  /** Parameter id, BU id or "cycle". Lets a screen filter to one record. */
  targetId: string;
  target: string;
  oldValue: string;
  newValue: string;
  comment: string;
}

export interface ScoringConfig {
  /** Percent. A domain below its cutoff forces Fail. The values are placeholders until verified. */
  cutoffs: Record<Domain, number>;
}

export interface CycleData {
  version: number;
  role: Role;
  cycleState: CycleState;
  declaredAt: string | null;
  params: Record<number, ParamRecord>;
  signedBus: Record<string, string>;
  config: ScoringConfig;
  audit: AuditEvent[];
}
