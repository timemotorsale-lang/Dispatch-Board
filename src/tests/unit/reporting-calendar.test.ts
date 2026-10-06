import { describe, expect, it } from "vitest";
import { draftReportCalendar, reportBusinessDate, resolveReportPeriod } from "@/lib/reporting/calendar";
import { uniqueReportRows, weightedReportRate } from "@/lib/reporting/contracts";
describe("report calendar and calculations", () => {
  it.each([["2026-03-08", 23], ["2026-11-01", 25]])("resolves DST coverage %s", (date, hours) => {
    const period = resolveReportPeriod(String(date), "DAILY");
    expect((period.endsAt.getTime() - period.startsAt.getTime()) / 3_600_000).toBe(hours);
  });
  it("keeps weekly coverage fixed when a holiday shifts submission", () => {
    const period = resolveReportPeriod("2026-09-30", "WEEKLY", { ...draftReportCalendar, holidays: ["2026-10-05"] });
    expect(period.startDate).toBe("2026-09-28"); expect(period.endDate).toBe("2026-10-05");
    expect(period.dueAt.toISOString()).toBe("2026-10-06T15:00:00.000Z");
  });
  it("handles leap months and overnight shift attribution", () => {
    expect(resolveReportPeriod("2028-02-29", "MONTHLY").endDate).toBe("2028-03-01");
    expect(reportBusinessDate(new Date("2026-10-05T09:00:00Z"), "America/Chicago", new Date("2026-10-05T03:00:00Z"))).toBe("2026-10-04");
  });
  it("rejects invalid dates and an unusable calendar", () => {
    expect(() => resolveReportPeriod("2026-02-30", "DAILY")).toThrow();
    expect(() => resolveReportPeriod("2026-10-04", "WEEKLY", { ...draftReportCalendar, workingDays: [] })).toThrow();
  });
  it("weights rates and keeps unavailable distinct from zero", () => {
    expect(weightedReportRate([{ numerator: 1, denominator: 2 }, { numerator: 9, denominator: 10 }]).value).toBeCloseTo(83.333);
    expect(weightedReportRate([]).value).toBeNull(); expect(weightedReportRate([{ numerator: 0, denominator: 10 }]).value).toBe(0);
  });
  it("deduplicates outcomes by source identity", () => {
    const row = { id: "task:1", title: "Work", state: "COMPLETED", owner: "Staff", href: "/tasks/1" };
    expect(uniqueReportRows([row, row])).toHaveLength(1);
  });
});
