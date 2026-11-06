import { allCriteriaAnswered, criteriaOf, criteriaTotal, formulaEffects } from "./questions";
import type { Domain, ParamRecord, ParameterDef, ScoringConfig } from "./types";

/** Rounds half up, after removing floating-point noise, so results match a hand calculation. */
export function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(Number((value * factor).toFixed(6))) / factor;
}

export const fmt2 = (n: number) => roundTo(n, 2).toFixed(2);
const pct = (fraction: number) => `${fmt2(fraction * 100)}%`;
/** "9%" rather than "9.00%" in tables. */
export const shortPct = (fraction: number) => `${Number(fmt2(fraction * 100))}%`;

export interface ParameterScore {
  id: number;
  answered: boolean;
  notApplicable: boolean;
  attainment: number;
  points: number;
  lost: number;
  actualLabel: string;
  targetLabel: string;
  steps: string[];
}

type Scorable = Pick<ParamRecord, "numerator" | "denominator" | "responses">;

export function scoreParameter(def: ParameterDef, r: Scorable): ParameterScore {
  const targetLabel = def.kind === "qualitative" ? `${criteriaTotal(def)} of ${criteriaTotal(def)}` : shortPct(def.target);
  const base = { id: def.id, targetLabel };
  const blank: ParameterScore = {
    ...base, answered: false, notApplicable: false, attainment: 0, points: 0, lost: def.weight, actualLabel: "Not answered", steps: [],
  };

  if (def.kind === "qualitative") {
    const total = criteriaTotal(def);
    if (total === 0 || !allCriteriaAnswered(def, r.responses)) return blank;
    const met = criteriaOf(def, r.responses).filter(Boolean).length;
    const attainment = met / total;
    const points = roundTo(def.weight * attainment, 2);
    return {
      ...base, answered: true, notApplicable: false, attainment, points, lost: roundTo(def.weight - points, 2),
      actualLabel: `${met} of ${total}`,
      steps: [`${met} of ${total} criteria = ${pct(attainment)}`, `${pct(attainment)} × ${def.weight} = ${fmt2(points)}`],
    };
  }

  if (r.numerator === null || r.denominator === null) return blank;

  // Nothing to measure in the period, such as no incidents. Full marks, but only with a stated reason.
  if (r.denominator === 0) {
    return {
      ...base, answered: true, notApplicable: true, attainment: 1, points: def.weight, lost: 0, actualLabel: "N/A",
      steps: [`Denominator is 0, so this is N/A`, `Full ${def.weight} points, with a reason the Reviewer must accept (assumption)`],
    };
  }

  // Questionnaire answers can reduce what counts as achieved. The SEBI formula itself never changes.
  const effects = formulaEffects(def, r.responses);
  const counted = effects.noCredit ? 0 : Math.max(r.numerator - effects.excludedTotal, 0);
  const inputSteps: string[] = [];
  if (effects.noCredit) {
    inputSteps.push(`Not counted: "${effects.noCredit.question.label}" is "${effects.noCredit.option.label}", so the numerator is 0`);
  } else if (effects.excludedTotal > 0) {
    inputSteps.push(`${r.numerator} − ${effects.excludedTotal} left out by the questionnaire = ${counted} counted`);
  }
  const actual = counted / r.denominator;
  const first = `${counted} ÷ ${r.denominator} = ${pct(actual)}`;

  if (def.kind === "inverse") {
    const attainment = 1 - actual;
    const points = roundTo(def.weight * attainment, 2);
    return {
      ...base, answered: true, notApplicable: false, attainment, points, lost: roundTo(def.weight - points, 2), actualLabel: shortPct(actual),
      steps: [...inputSteps, first, `Lower is better: (1 − ${pct(actual)}) × ${def.weight} = ${fmt2(points)}`],
    };
  }

  const uncapped = actual / def.target;
  const attainment = Math.min(uncapped, 1);
  const points = roundTo(def.weight * attainment, 2);
  return {
    ...base, answered: true, notApplicable: false, attainment, points, lost: roundTo(def.weight - points, 2), actualLabel: shortPct(actual),
    steps: [
      ...inputSteps,
      first,
      uncapped > 1
        ? `At or above the ${shortPct(def.target)} target, so full ${def.weight} points`
        : `${pct(actual)} ÷ ${shortPct(def.target)} × ${def.weight} = ${fmt2(points)}`,
    ],
  };
}

/** Floors, because SEBI's whole-number bands leave gaps such as 90.5. Assumption, shown in the report. */
export const BANDS: { floor: number; name: string }[] = [
  { floor: 91, name: "Exceptional" },
  { floor: 81, name: "Optimal" },
  { floor: 71, name: "Manageable" },
  { floor: 61, name: "Developing" },
  { floor: 51, name: "Bare Minimum" },
];

export const ratingFor = (total: number) => BANDS.find((b) => total >= b.floor)?.name ?? "Fail";

export interface DomainScore {
  domain: Domain;
  max: number;
  earned: number;
  percent: number;
  cutoff: number;
  below: boolean;
}

export interface CycleScore {
  parameters: Record<number, ParameterScore>;
  total: number;
  /** The rating after the domain Fail rule. */
  rating: string;
  /** The rating the total alone would give. */
  bandRating: string;
  domains: DomainScore[];
  failedDomains: Domain[];
  unanswered: number;
}

const DOMAIN_ORDER: Domain[] = ["GV", "ID", "PR", "DE", "RS", "Overall"];

export function scoreCycle(defs: ParameterDef[], params: Record<number, Scorable>, config: ScoringConfig): CycleScore {
  const parameters: Record<number, ParameterScore> = {};
  for (const def of defs) parameters[def.id] = scoreParameter(def, params[def.id]);

  const total = roundTo(defs.reduce((sum, d) => sum + parameters[d.id].points, 0), 2);

  const domains = DOMAIN_ORDER.map((domain) => {
    const members = defs.filter((d) => d.domain === domain);
    const max = members.reduce((s, d) => s + d.weight, 0);
    const earned = roundTo(members.reduce((s, d) => s + parameters[d.id].points, 0), 2);
    const percent = max ? roundTo((earned / max) * 100, 1) : 0;
    const cutoff = config.cutoffs[domain];
    // A domain still missing answers cannot be judged yet, so it cannot trigger Fail.
    const complete = members.every((d) => parameters[d.id].answered);
    return { domain, max, earned, percent, cutoff, below: complete && percent < cutoff };
  });

  const failedDomains = domains.filter((d) => d.below).map((d) => d.domain);
  const bandRating = ratingFor(total);
  return {
    parameters, total, bandRating, domains, failedDomains,
    rating: failedDomains.length ? "Fail" : bandRating,
    unanswered: defs.filter((d) => !parameters[d.id].answered).length,
  };
}

/** Largest loss first, ties by parameter number so the order is always the same. */
export function rankGaps(scores: Record<number, ParameterScore>): ParameterScore[] {
  return Object.values(scores).filter((s) => s.lost > 0).sort((a, b) => b.lost - a.lost || a.id - b.id);
}
