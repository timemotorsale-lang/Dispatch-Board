import { weightedReportRate } from "./contracts";
export type ReportingCoverageRow = { subjectUserId: string; subject: string; disposition: string; submitted: boolean; approved: boolean; correctionPending: boolean; needsRevision: boolean; reportState?: string; revisionId?: string | null; dueAt?: string; draft?: boolean };
export function summarizeReportingCoverage(rows: ReportingCoverageRow[], now = new Date()) {
  if (new Set(rows.map(row => row.subjectUserId)).size !== rows.length) throw new Error("Reporting coverage identities are invalid.");
  const required = rows.filter(row => row.disposition === "REQUIRED");
  const submitted = required.filter(row => row.submitted).length;
  const approved = required.filter(row => row.approved).length;
  return { required: required.length, submitted, approved, missing: required.filter(row => !row.submitted && row.reportState !== "NOT_YET_DUE" && (!row.dueAt || new Date(row.dueAt) <= now)).length, excused: rows.filter(row => row.disposition === "EXCUSED").length, notRequired: rows.filter(row => row.disposition === "NOT_REQUIRED").length, optional: rows.filter(row => row.disposition === "OPTIONAL").length, correctionPending: rows.filter(row => row.correctionPending).length, needsRevision: rows.filter(row => row.needsRevision).length, submissionRate: weightedReportRate([{ numerator: submitted, denominator: required.length }]), approvalRate: weightedReportRate([{ numerator: approved, denominator: required.length }]) };
}
