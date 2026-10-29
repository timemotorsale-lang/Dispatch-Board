import { describe, expect, it } from "vitest";
import { summarizeReportingCoverage, type ReportingCoverageRow } from "@/lib/reporting/coverage";
const row = (id: string, disposition = "REQUIRED", submitted = false): ReportingCoverageRow => ({ subjectUserId: id, subject: id, disposition, submitted, approved: false, correctionPending: false, needsRevision: false });
describe("management reporting coverage", () => {
  it("uses the required denominator rather than averaging percentages", () => {
    const rows = Array.from({ length: 12 }, (_, index) => row(String(index), "REQUIRED", index < 10));
    rows.push(row("excused", "EXCUSED"), row("not-required", "NOT_REQUIRED"), row("optional", "OPTIONAL", true));
    expect(summarizeReportingCoverage(rows)).toMatchObject({ required: 12, submitted: 10, missing: 2, excused: 1, notRequired: 1, optional: 1, submissionRate: { numerator: 10, denominator: 12 } });
    expect(summarizeReportingCoverage(rows).submissionRate.value).toBeCloseTo(83.333333);
  });
  it("retains acceptance while a correction needs revision", () => {
    expect(summarizeReportingCoverage([{ ...row("staff", "REQUIRED", true), approved: true, correctionPending: true, needsRevision: true }])).toMatchObject({ approved: 1, correctionPending: 1, needsRevision: 1, approvalRate: { value: 100 } });
  });
  it("does not turn absence of obligations into zero percent", () => {
    expect(summarizeReportingCoverage([row("optional", "OPTIONAL", true)]).submissionRate.value).toBeNull();
  });
  it("does not label a draft or obligation missing before its due time", () => {
    const now = new Date("2026-10-29T14:00:00Z");
    const summary = summarizeReportingCoverage([{ ...row("draft"), draft: true, reportState: "DRAFT", dueAt: "2026-10-29T22:00:00Z" }, { ...row("due"), reportState: "NOT_YET_DUE" }, { ...row("late"), dueAt: "2026-10-29T13:00:00Z" }], now);
    expect(summary.required).toBe(3); expect(summary.missing).toBe(1);
  });
  it("rejects duplicate identities", () => {
    expect(() => summarizeReportingCoverage([row("staff"), row("staff")])).toThrow("invalid");
  });
});
