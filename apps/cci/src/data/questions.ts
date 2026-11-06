import type { Question, QuestionOption } from "../domain/types";

/**
 * DRAFT questionnaires for the 23 parameters, written for this project and not taken from SEBI.
 * Review them with an auditor or mentor before relying on them.
 * Items marked as affecting the score only change the inputs to the formula, never the formula.
 */

const opts = (...labels: string[]): QuestionOption[] =>
  labels.map((label) => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label }));

const list = (id: string, label: string, ...labels: string[]): Question =>
  ({ id, label, kind: "list", effect: "record", required: true, options: opts(...labels) });
const text = (id: string, label: string): Question =>
  ({ id, label, kind: "text", effect: "record", required: false });
const note = (id: string, label: string): Question =>
  ({ id, label, kind: "number", effect: "record", required: true });
/** A count of items that must not be counted as achieved. */
const exclude = (id: string, label: string): Question =>
  ({ id, label, kind: "number", effect: "excludeFromNumerator", required: true });
/** A value list where the second answer means nothing can be counted. */
const gate = (id: string, label: string, ok: [string, string], notOk: [string, string]): Question => ({
  id, label, kind: "list", effect: "record", required: true,
  options: [{ value: ok[0], label: ok[1] }, { value: notOk[0], label: notOk[1], noCredit: true }],
});
const criterion = (id: string, label: string, met: [string, string], unmet: [string, string], sample: string): Question => ({
  id, label, kind: "list", effect: "criterion", required: true, sample,
  options: [{ value: met[0], label: met[1], meetsCriterion: true }, { value: unmet[0], label: unmet[1], meetsCriterion: false }],
});

const SETS: Record<number, Question[]> = {
  1: [
    gate("1-status", "Budget status", ["approved", "Approved by management"], ["proposed", "Proposed, not approved"]),
    text("1-authority", "Approving authority"),
    list("1-period", "Budget period", "Annual", "Half-yearly", "Other"),
  ],
  2: [
    { id: "2-retest", label: "Were all mitigated items verified by a retest?", kind: "list", effect: "excludeFromNumerator", required: true, options: [{ value: "all", label: "Yes, all retested" }, { value: "some", label: "No, some not retested" }], sample: "all" },
    { ...exclude("2-not-retested", "Mitigated items not retested"), showIf: { question: "2-retest", value: "some" } },
    list("2-scan", "Scan type", "Authenticated", "Unauthenticated", "Both"),
    text("2-tool", "Scanning tool"),
  ],
  3: [
    exclude("3-failed", "Trained personnel who failed the assessment"),
    list("3-mode", "Training delivery", "Instructor-led", "Online", "Mixed"),
    text("3-provider", "Training provider"),
  ],
  4: [
    exclude("4-exempt", "Remote users with an MFA exemption"),
    list("4-coverage", "MFA enforced at", "All remote gateways", "Most remote gateways", "Selected gateways"),
    text("4-method", "MFA method"),
  ],
  5: [
    exclude("5-silent", "Integrated systems with no logs in the past 30 days"),
    list("5-retention", "Log retention", "Under 6 months", "6 to 12 months", "Over 12 months"),
    text("5-platform", "SIEM platform"),
  ],
  6: [
    exclude("6-missing", "Approved changes not reflected in the baseline"),
    list("6-review", "Baseline review frequency", "Monthly", "Quarterly", "Half-yearly", "Annual"),
    text("6-ref", "Change log reference"),
  ],
  7: [
    exclude("7-open", "Tested systems with failed results still open"),
    list("7-type", "Test type", "Full failover", "Partial failover", "Tabletop"),
    text("7-ref", "Test report reference"),
  ],
  8: [
    exclude("8-bypass", "Systems also reachable by bypassing PIM"),
    list("8-recording", "Privileged session recording", "All sessions", "Critical systems only", "None"),
    text("8-tool", "PIM tool"),
  ],
  9: [
    list("9-channel", "Reporting channel", "SEBI portal", "Email", "Both"),
    note("9-corrections", "Reports needing later correction"),
    text("9-ref", "Incident register reference"),
  ],
  10: [
    exclude("10-overdue", "Maintained components with overdue actions"),
    list("10-by", "Maintenance performed by", "Internal team", "Vendor", "Both"),
    text("10-ref", "Maintenance log reference"),
  ],
  11: [
    list("11-method", "Sanitization method", "Purge", "Destroy", "Clear"),
    note("11-retests", "Media retested after a failed check"),
    text("11-ref", "Certificate reference"),
  ],
  12: [
    list("12-review", "Register reviewed by security team?", "Yes", "No"),
    note("12-open", "Physical incidents still under investigation"),
    text("12-ref", "Incident register reference"),
  ],
  13: [
    exclude("13-expired", "Signed agreements that have since expired"),
    list("13-format", "Agreement format", "Digital", "Paper", "Both"),
    text("13-version", "Agreement version"),
  ],
  14: [
    exclude("14-old", "Screenings older than policy allows"),
    list("14-by", "Screening performed by", "Internal HR", "External agency", "Both"),
    text("14-policy", "Screening policy reference"),
  ],
  15: [
    exclude("15-old", "Assessments older than 12 months"),
    list("15-method", "Assessment method", "Qualitative", "Quantitative", "Both"),
    text("15-ref", "Latest assessment reference"),
  ],
  16: [
    exclude("16-unsigned", "Contracts with an unsigned security schedule"),
    list("16-template", "Contract template", "Standard template", "Vendor template", "Mixed"),
    text("16-owner", "Contract owner"),
  ],
  17: [
    exclude("17-exceptions", "Devices with an encryption exception"),
    list("17-managed", "Device management", "MDM", "Manual", "Mixed"),
    text("17-tool", "MDM tool"),
  ],
  18: [
    gate("18-status", "Risk register status", ["approved", "Approved by risk committee"], ["draft", "Draft, not approved"]),
    exclude("18-unowned", "Covered systems and assets with no risk owner"),
    text("18-owner", "Risk register owner"),
  ],
  19: [
    exclude("19-unconfirmed", "Critical systems not confirmed by their owner"),
    list("19-source", "Asset inventory source", "CMDB", "Spreadsheet", "Discovery tool"),
    text("19-date", "Inventory date"),
  ],
  20: [
    exclude("20-noevidence", "Closed events with no closure evidence"),
    list("20-tracking", "Tracked in", "Ticketing tool", "Spreadsheet", "Email"),
    text("20-ref", "Event register reference"),
  ],
  21: [
    criterion("21-exists", "Does a cybersecurity policy exist?", ["yes", "Yes"], ["no", "No"], "yes"),
    criterion("21-revision", "Revision frequency", ["within", "Revised on schedule"], ["overdue", "Revision overdue"], "within"),
    criterion("21-approval", "Approval", ["approved", "Approved"], ["pending", "Approval pending"], "approved"),
    criterion("21-observation", "Audit observation", ["none", "None open"], ["open", "Observation open"], "open"),
    text("21-version", "Policy version"),
  ],
  22: [
    gate("22-current", "Is this score from the latest assessment?", ["yes", "Yes, latest"], ["no", "No, out of date"]),
    list("22-by", "Assessed by", "Internal team", "External assessor"),
    text("22-ref", "Assessment reference"),
  ],
  23: [
    exclude("23-notrun", "Automated standards whose checks did not run this cycle"),
    list("23-tool", "Compliance tooling", "GRC tool", "Custom scripts", "Mixed"),
    text("23-ref", "Compliance report reference"),
  ],
};

export const questionsFor = (id: number): Question[] => SETS[id] ?? [];
