import { describe, expect, it } from "vitest";
import { reportingCoverageHistoryTarget } from "@/features/reporting/reporting-console";
import { parseReportingNavigation, reportingNavigationUrl } from "@/lib/reporting/navigation";
import type { ReportCadence } from "@/lib/reporting/calendar";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportingCoveragePanel } from "@/features/reporting/reporting-coverage-panel";
import { summarizeReportingCoverage } from "@/lib/reporting/coverage";

const coverage = {
  periodStart: "2026-05-11", periodEnd: "2026-05-18", cadence: "WEEKLY" as const,
  rows: [{ subjectUserId: "staff-a" }, { subjectUserId: "staff-b" }]
};

describe("coverage reporting history navigation", () => {
  it("opens the chosen person and complete coverage period without stale search/status filters", () => {
    const target = reportingCoverageHistoryTarget(coverage, "staff-b", true);
    expect(target).toEqual({ tab: "Team Reports", subject: "staff-b", date: "2026-05-11", cadence: "WEEKLY", rangeMode: "range", from: "2026-05-11", to: "2026-05-17", reportStatus: "ALL", query: "" });
    const url = reportingNavigationUrl({ definition: "operations", location: "", metric: null, ...target! });
    expect(parseReportingNavigation(new URL(url, "http://local.test").searchParams, "2026-11-14", true)).toMatchObject({ subject: "staff-b", from: "2026-05-11", to: "2026-05-17", rangeMode: "range", cadence: "WEEKLY", query: "" });
  });

  it.each<[string, string, ReportCadence, string]>([
    ["2026-03-08", "2026-03-09", "DAILY", "2026-03-08"],
    ["2028-02-01", "2028-03-01", "MONTHLY", "2028-02-29"],
    ["2026-12-01", "2027-01-01", "MONTHLY", "2026-12-31"]
  ])("uses calendar dates for %s through exclusive %s", (periodStart, periodEnd, cadence, through) => {
    expect(reportingCoverageHistoryTarget({ ...coverage, periodStart, periodEnd, cadence }, "staff-a", true)).toMatchObject({ from: periodStart, to: through, cadence });
  });

  it("does not offer team navigation to staff or a person outside the loaded coverage", () => {
    expect(reportingCoverageHistoryTarget(coverage, "staff-a", false)).toBeNull();
    expect(reportingCoverageHistoryTarget(coverage, "unknown", true)).toBeNull();
  });

  it("keeps Open day separate and assigns the existing history accessible name to the new action", () => {
    const rows = [{ subjectUserId: "staff-a", subject: "Sample Staff", disposition: "REQUIRED", submitted: true, approved: false, correctionPending: false, needsRevision: false }];
    const props = {
      coverage: { ...coverage, rows, calendarVersion: "test", quality: "PARTIAL" as const, limitation: "Test coverage", summary: summarizeReportingCoverage(rows) },
      busy: false,
      onOpen: () => undefined
    };
    const html = renderToStaticMarkup(createElement(ReportingCoveragePanel, { ...props, onHistory: () => undefined }));
    expect(html).toContain('aria-label="Open Sample Staff day"');
    expect(html).toContain('aria-label="Open Sample Staff reporting history"');
    expect(html).toContain("View reporting history</button>");
    expect(html).toContain("Open day</button>");
    expect(renderToStaticMarkup(createElement(ReportingCoveragePanel, props))).not.toContain("View reporting history");
    const busyHtml = renderToStaticMarkup(createElement(ReportingCoveragePanel, { ...props, busy: true, onHistory: () => undefined }));
    expect(busyHtml.match(/<button disabled=""/g)).toHaveLength(2);
  });
});
