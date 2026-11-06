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
  criteria?: string[];
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
  criteria: boolean[];
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
