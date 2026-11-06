import type { BusinessUnit, Catalog, Extract, ParameterDef, Domain, ScoringKind } from "../domain/types";
import { questionsFor } from "./questions";

/**
 * The 23 CCI parameters as read from a copy of CSCRF Annexure-K (Table 27).
 * Names, measure ids, weights, targets and formulas come from there; verify against SEBI's circular.
 * The business units and who owns what are invented for the fictional sample organisation.
 */
export const bus: BusinessUnit[] = [
  { id: "cso", name: "Cyber Security Ops" },
  { id: "inf", name: "IT Infrastructure" },
  { id: "rc", name: "Risk & Compliance" },
  { id: "fin", name: "Finance & Procurement" },
  { id: "hr", name: "HR & Admin" },
];

type Row = [number, string, string, Domain, number, number, ScoringKind, string, string, string, string];
//  id, name, measure, domain, weight, target, kind, bu, formula, numerator label, denominator label
const rows: Row[] = [
  [1, "Security Budget", "GV.RR.S4", "GV", 8, 0.1, "ratio", "fin", "Information security budget ÷ total IT budget", "Information security budget (₹ lakh)", "Total IT budget (₹ lakh)"],
  [2, "Vulnerability Management", "DE.CM.S5", "DE", 18, 1, "ratio", "cso", "Vulnerabilities mitigated ÷ vulnerabilities identified", "Vulnerabilities mitigated", "Vulnerabilities identified"],
  [3, "Security Training", "PR.AT.S1", "PR", 5, 1, "ratio", "hr", "Security personnel trained in the past year ÷ total security personnel", "Security personnel trained", "Total security personnel"],
  [4, "Remote Access Control", "PR.AA.S12", "PR", 2, 1, "ratio", "inf", "Remote users logging in through MFA ÷ total remote users", "Remote users using MFA", "Total remote users"],
  [5, "Audit Record Review", "DE.CM.S1", "DE", 2, 1, "ratio", "cso", "Critical systems integrated with SIEM ÷ total critical systems", "Critical systems on SIEM", "Total critical systems"],
  [6, "Configuration Changes", "DE.CM.S5", "DE", 2, 1, "ratio", "cso", "Approved changes in the latest baseline ÷ changes identified by scans", "Approved and implemented changes", "Changes identified by scans"],
  [7, "Contingency Plan Testing", "RS.MA.S3", "RS", 4, 1, "ratio", "inf", "Systems tested at least once a year ÷ systems in inventory", "Systems tested this year", "Systems in inventory"],
  [8, "User Accounts / Privileged Access", "PR.AA.S7", "PR", 3, 1, "ratio", "inf", "Systems accessed through PIM ÷ total systems", "Systems accessed through PIM", "Total systems"],
  [9, "Incident Response Reporting", "RS.CO.S2", "RS", 2, 1, "ratio", "cso", "Incidents reported on time ÷ total reported incidents", "Incidents reported on time", "Total reported incidents"],
  [10, "Maintenance", "PR.MA.S1", "PR", 5, 1, "ratio", "inf", "Components maintained on schedule ÷ total components", "Components maintained on schedule", "Total components"],
  [11, "Media Sanitization", "PR.AA.S14", "PR", 2, 1, "ratio", "inf", "Media passing sanitization testing ÷ media disposed or reused", "Media passing testing", "Media disposed or reused"],
  [12, "Physical Security Incidents", "PR.AA.S10", "PR", 1, 0, "inverse", "hr", "Incidents allowing unauthorised entry ÷ total physical incidents", "Incidents allowing unauthorised entry", "Total physical incidents"],
  [13, "Authorised Access Agreement", "GV.RR.S5", "GV", 1, 1, "ratio", "hr", "Users granted access after signing the agreement ÷ users granted access", "Users who signed first", "Users granted access"],
  [14, "Personnel Screening", "PR.AA.S10", "PR", 1, 1, "ratio", "hr", "Individuals screened ÷ individuals with access", "Individuals screened", "Individuals with access"],
  [15, "Risk Assessment Coverage", "ID.RA.S2", "ID", 5, 1, "ratio", "rc", "Systems and assets covered by risk assessment ÷ total", "Systems and assets covered", "Total systems and assets"],
  [16, "Service Acquisition Contracts", "GV.SC.S3", "GV", 3, 1, "ratio", "fin", "Contracts with security requirements ÷ total contracts", "Contracts with security requirements", "Total contracts"],
  [17, "Cryptography on Mobile Devices", "PR.DS.S4", "PR", 1, 1, "ratio", "inf", "Mobile devices performing all cryptographic operations ÷ total devices", "Compliant mobile devices", "Total mobile devices"],
  [18, "Risk Management Coverage", "GV.RM.S1, S2", "GV", 8, 1, "ratio", "rc", "Systems and assets under risk management ÷ total", "Systems and assets under risk management", "Total systems and assets"],
  [19, "Critical Assets Identified", "ID.AM.S1, S2", "ID", 9, 0.5, "ratio", "inf", "Critical systems identified ÷ total IT systems integrated with SOC", "Critical systems identified", "IT systems integrated with SOC"],
  [20, "CSK Event Closure", "RS.MA.S5", "RS", 4, 1, "ratio", "cso", "CSK events closed within 15 days ÷ total CSK events reported", "CSK events closed within 15 days", "Total CSK events reported"],
  [21, "Cybersecurity Policy Document", "GV.PO.S1", "GV", 4, 1, "qualitative", "rc", "Assessed on policy existence, revision frequency, approval and audit observation", "", ""],
  [22, "SOC Efficacy", "Annexure-N", "Overall", 5, 1, "ratio", "cso", "SOC efficacy score from Annexure-N", "SOC efficacy score (Annexure-N)", "Maximum score"],
  [23, "Automated CSCRF Compliance", "Not stated", "Overall", 5, 1, "ratio", "rc", "Standards with automated compliance ÷ total CSCRF standards", "Standards with automated compliance", "Total CSCRF standards"],
];

export const defs: ParameterDef[] = rows.map(
  ([id, name, measureId, domain, weight, target, kind, buId, formula, numeratorLabel, denominatorLabel]) => ({
    id, name, measureId, domain, weight, target, kind, buId, formula, numeratorLabel, denominatorLabel,
    questions: questionsFor(id),
  }),
);

/**
 * Invented sample values. [numerator, denominator] for each ratio parameter.
 * #2 is what the document says (380 of 480); the demo starts with #2 unanswered.
 */
export const sampleValues: Record<number, [number, number]> = {
  1: [90, 1000], 2: [380, 480], 3: [45, 50], 4: [190, 200], 5: [40, 50], 6: [85, 100], 7: [30, 40], 8: [70, 100],
  9: [12, 12], 10: [88, 100], 11: [18, 20], 12: [1, 4], 13: [96, 100], 14: [92, 100], 15: [85, 100], 16: [14, 20],
  17: [60, 100], 18: [80, 100], 19: [40, 100], 20: [17, 20], 22: [78, 100], 23: [60, 100],
};
/** What the sample policy document shows for the four criteria of #21. */
export const samplePolicy = [true, true, true, false];

const extracts: Record<number, Extract> = {};
for (const d of defs) {
  const fileName = `${d.name.toLowerCase().replace(/[^a-z]+/g, "_")}_sample.pdf`;
  extracts[d.id] = d.kind === "qualitative"
    ? { fileName, criteria: samplePolicy }
    : { fileName, numerator: sampleValues[d.id][0], denominator: sampleValues[d.id][1] };
}

export const catalog: Catalog = { defs, bus, extracts };

export const ORG = "Sample Securities Ltd (fictional)";
export const CYCLE = "FY 2025-26";
