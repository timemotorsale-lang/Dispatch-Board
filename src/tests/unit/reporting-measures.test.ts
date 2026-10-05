import { describe, expect, it } from "vitest";
import { reportMeasures } from "@/lib/reporting/measures";
import type { ReportRow } from "@/lib/reporting/contracts";

const now = new Date("2026-10-04T12:00:00Z");
const row = (id: string, state = "OPEN", ageDays?: number): ReportRow => ({ id, state, ageDays, title: id, owner: "Staff", href: `/tasks/${id}` });
describe("source reconciled report measures", () => {
  it("partitions receipt age without interpreting missing dates as zero", () => {
    const records = [row("missing"), row("new", "OPEN", 0), row("30", "OPEN", 30), row("31", "OPEN", 31), row("90", "OPEN", 90), row("91", "OPEN", 91)];
    const measures = reportMeasures("inventory", records, now);
    expect(measures.find(item => item.code === "receipt-age-missing")?.rowIds).toEqual(["missing"]);
    expect(measures.find(item => item.code === "receipt-age-0")?.rowIds).toEqual(["new", "30"]);
    expect(measures.filter(item => item.code.startsWith("receipt-age-")).reduce((sum, item) => sum + Number(item.value), 0)).toBe(records.length);
  });
  it("excludes expected and cancelled appointments from recorded outcome rate", () => {
    const measures = reportMeasures("appointments", [row("a", "CHECKED_IN"), row("b", "NO_SHOW"), row("c", "EXPECTED"), row("d", "CANCELLED")], now);
    const rate = measures.find(item => item.code === "recorded-check-in-rate");
    expect(rate).toMatchObject({ numerator: 1, denominator: 2, value: 50, rowIds: ["a", "b"] });
    expect(reportMeasures("appointments", [row("c", "EXPECTED")], now).find(item => item.code === "recorded-check-in-rate")?.value).toBeNull();
  });
  it("each count reconciles to its contributing records", () => {
    const records = [row("a", "BLOCKED"), { ...row("b"), occurredAt: "2026-10-03T12:00:00Z" }];
    for (const measure of reportMeasures("operations", records, now)) expect(measure.value).toBe(measure.rowIds.length);
    expect(reportMeasures("operations", records, now).find(item => item.code === "past-due")?.rowIds).toEqual(["b"]);
  });
});
