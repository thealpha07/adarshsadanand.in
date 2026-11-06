import type { CycleData, ParamRecord, ParamState } from "../domain/types";
import { defs, sampleValues } from "./catalog";

export const DATA_VERSION = 2;

/** Parameters the demo starts part-way through, each showing a different scoring case. */
const IN_REVIEW = [1, 12, 21];

/**
 * The demo's start: #2 unanswered, #1, #12 and #21 waiting for the Reviewer, and the rest approved.
 * All values are invented and the screens say so.
 */
export function seedCycle(at: string): CycleData {
  const params: Record<number, ParamRecord> = {};
  for (const d of defs) {
    const state: ParamState = d.id === 2 ? "not_started" : IN_REVIEW.includes(d.id) ? "review" : "approved";
    const values = sampleValues[d.id];
    params[d.id] = {
      state,
      numerator: d.id === 2 || !values ? null : values[0],
      denominator: d.id === 2 || !values ? null : values[1],
      // Prefilled so the sample starts complete. The first list option and 0 exclusions leave the scores as designed.
      responses: Object.fromEntries(d.questions.map((q) => [q.id, q.sample ?? (q.kind === "list" ? q.options?.[0].value ?? "" : q.kind === "number" ? "0" : "Sample entry")])),
      scope: "FY 2025-26",
      mismatchReason: "",
      naReason: "",
      evidenceAttached: d.id !== 2,
      returnComment: null,
      returnedBy: null,
    };
  }
  return {
    version: DATA_VERSION,
    role: "ciso",
    cycleState: "open",
    declaredAt: null,
    params,
    signedBus: {},
    config: { cutoffs: { GV: 50, ID: 50, PR: 50, DE: 50, RS: 50, Overall: 50 } },
    audit: [{
      seq: 1, at, actor: "demo", action: "Demo started with sample data", targetId: "cycle", target: "FY cycle",
      oldValue: "", newValue: "", comment: "#2 unanswered. #1, #12 and #21 in review. Other parameters seeded as approved.",
    }],
  };
}
