import { describe, expect, it } from "vitest";
import { parseReportingNavigation, reportingNavigationUrl } from "@/lib/reporting/navigation";
const today = "2026-10-04";
describe("report navigation context", () => {
  it("round trips all non-draft filters", () => {
    const state = { tab: "Team Reports" as const, date: "2026-08-12", cadence: "WEEKLY" as const, definition: "operations" as const, location: "store", subject: "staff", query: "Callback & review", metric: "OPEN", from: "2026-08-01", to: "2026-08-31" };
    expect(parseReportingNavigation(new URL(reportingNavigationUrl(state), "http://local.test").searchParams, today, true)).toEqual(state);
  });
  it("does not restore manager tabs or other subjects for staff", () => {
    expect(parseReportingNavigation(new URLSearchParams({ tab: "Team Reports", subject: "other" }), today, false)).toMatchObject({ tab: "Overview", subject: "" });
  });
  it("normalizes invalid dates, cadence, report and reversed archive ranges", () => {
    expect(parseReportingNavigation(new URLSearchParams({ date: "2026-02-30", cadence: "YEARLY", definition: "unknown", from: "2026-08-31", to: "2026-08-01" }), today, true)).toMatchObject({ date: today, cadence: "DAILY", definition: "operations", from: "", to: "" });
  });
  it("bounds restored values and never stores draft content", () => {
    const state = parseReportingNavigation(new URLSearchParams({ query: "x".repeat(201), context: "private draft", priorities: "private" }), today, true);
    expect(state.query).toBe(""); expect(reportingNavigationUrl(state)).not.toContain("private");
  });
});
