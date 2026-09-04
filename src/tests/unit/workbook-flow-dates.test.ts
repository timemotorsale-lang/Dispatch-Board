import { describe, expect, it } from "vitest";
import { dailyFlowHref, flowDay, flowMidnight, flowRange, validFlowDate } from "@/features/advisor/workbook-flow-dates";
describe("workbook flow dates", () => {
  it("uses the selected day and Monday-based weeks", () => {
    expect(flowRange("2026-09-04", "daily")).toEqual({ start: "2026-09-04", end: "2026-09-05" });
    expect(flowRange("2026-09-06", "weekly")).toEqual({ start: "2026-08-31", end: "2026-09-07" });
  });
  it("handles leap months and year boundaries", () => {
    expect(flowRange("2028-02-29", "monthly")).toEqual({ start: "2028-02-01", end: "2028-03-01" });
    expect(flowRange("2026-12-31", "monthly")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
  it("respects Central time and both daylight saving changes", () => {
    expect(flowDay("2026-09-05T02:00:00Z")).toBe("2026-09-04");
    expect(Date.parse(flowMidnight("2026-03-09")) - Date.parse(flowMidnight("2026-03-08"))).toBe(23 * 3600000);
    expect(Date.parse(flowMidnight("2026-11-02")) - Date.parse(flowMidnight("2026-11-01"))).toBe(25 * 3600000);
  });
  it("validates dates and opens the console on the requested day", () => {
    expect(validFlowDate("2026-02-30")).toBe(false);
    expect(validFlowDate("")).toBe(false);
    expect(dailyFlowHref("2026-09-04")).toBe("/appointments?section=today&localDate=2026-09-04");
  });
});
