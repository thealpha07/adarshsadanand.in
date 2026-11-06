import type { ParameterDef, Question, QuestionOption } from "./types";

/**
 * Questionnaire rules. Answers never add or remove points directly, because SEBI defines each
 * parameter's formula. They change which items count as inputs to that formula, or are kept for the record.
 */

type Responses = Record<string, string>;

export function visibleQuestions(def: ParameterDef, responses: Responses): Question[] {
  return def.questions.filter((q) => !q.showIf || responses[q.showIf.question] === q.showIf.value);
}

export const selectedOption = (q: Question, responses: Responses): QuestionOption | undefined =>
  q.options?.find((o) => o.value === responses[q.id]);

const numberIn = (q: Question, responses: Responses) => {
  const raw = (responses[q.id] ?? "").trim();
  return raw === "" ? 0 : Number(raw);
};

export interface FormulaEffects {
  /** Items left out of the numerator, each with the question that excluded them. */
  excluded: { question: Question; count: number }[];
  excludedTotal: number;
  /** A value-list answer meaning that nothing can be counted, such as an unapproved budget. */
  noCredit: { question: Question; option: QuestionOption } | null;
}

export function formulaEffects(def: ParameterDef, responses: Responses): FormulaEffects {
  const excluded: FormulaEffects["excluded"] = [];
  let noCredit: FormulaEffects["noCredit"] = null;
  for (const q of visibleQuestions(def, responses)) {
    if (q.effect === "excludeFromNumerator") {
      const count = numberIn(q, responses);
      if (Number.isFinite(count) && count > 0) excluded.push({ question: q, count });
    }
    const option = selectedOption(q, responses);
    if (option?.noCredit && !noCredit) noCredit = { question: q, option };
  }
  return { excluded, noCredit, excludedTotal: excluded.reduce((t, e) => t + e.count, 0) };
}

const criterionQuestions = (def: ParameterDef) => def.questions.filter((q) => q.effect === "criterion");
export const criteriaTotal = (def: ParameterDef) => criterionQuestions(def).length;

/** Whether each criterion is met, in question order. */
export const criteriaOf = (def: ParameterDef, responses: Responses): boolean[] =>
  criterionQuestions(def).map((q) => Boolean(selectedOption(q, responses)?.meetsCriterion));

export const allCriteriaAnswered = (def: ParameterDef, responses: Responses) =>
  criterionQuestions(def).every((q) => selectedOption(q, responses));

/** The responses that say what a document says about each criterion. */
export function responsesFromCriteria(def: ParameterDef, criteria: boolean[]): Responses {
  const out: Responses = {};
  criterionQuestions(def).forEach((q, i) => {
    const option = q.options?.find((o) => Boolean(o.meetsCriterion) === criteria[i]);
    if (option) out[q.id] = option.value;
  });
  return out;
}

export function responseLabel(q: Question, responses: Responses): string {
  const raw = responses[q.id] ?? "";
  if (raw === "") return "Empty";
  return q.kind === "list" ? q.options?.find((o) => o.value === raw)?.label ?? raw : raw;
}

/** Values that are never acceptable, even in a draft. */
export function invalidResponse(def: ParameterDef, responses: Responses, numerator: number | null): string | null {
  for (const q of visibleQuestions(def, responses)) {
    if (q.kind === "number" && (responses[q.id] ?? "").trim() !== "") {
      const n = Number(responses[q.id]);
      if (!Number.isFinite(n) || n < 0) return `"${q.label}" must be a number of 0 or more.`;
    }
  }
  const { excludedTotal } = formulaEffects(def, responses);
  if (numerator !== null && excludedTotal > numerator) {
    return `Items left out (${excludedTotal}) cannot be more than "${def.numeratorLabel}" (${numerator}).`;
  }
  return null;
}

export const missingResponses = (def: ParameterDef, responses: Responses): Question[] =>
  visibleQuestions(def, responses).filter((q) => q.required && (responses[q.id] ?? "").trim() === "");

export const affectsScore = (q: Question) => q.effect !== "record" || Boolean(q.options?.some((o) => o.noCredit));
