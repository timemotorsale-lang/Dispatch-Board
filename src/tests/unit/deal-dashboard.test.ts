import { describe, expect, it } from "vitest";
import { chicagoDate, dealGroup, reportingRange, summarizeDeals, type DashboardDeal } from "@/lib/deal-dashboard";

describe("deal dashboard reporting", () => {
  it("uses calendar days, Monday–Sunday weeks and full months across year and leap boundaries", () => {
    expect(reportingRange("2026-11-01", "day")).toMatchObject({ start: "2026-11-01", end: "2026-11-01" });
    expect(reportingRange("2026-11-01", "week")).toMatchObject({ start: "2026-10-26", end: "2026-11-01" });
    expect(reportingRange("2027-01-01", "week")).toMatchObject({ start: "2026-12-28", end: "2027-01-03" });
    expect(reportingRange("2028-02-15", "month")).toMatchObject({ start: "2028-02-01", end: "2028-02-29" });
    expect(() => reportingRange("2026-02-30", "day")).toThrow();
    expect(() => reportingRange("2026-01-01", "year")).toThrow();
  });
  it("assigns activity to Chicago dates rather than UTC dates", () => {
    expect(chicagoDate("2026-11-01T01:00:00Z")).toBe("2026-10-31");
    expect(chicagoDate("2026-11-01T07:00:00Z")).toBe("2026-11-01");
    expect(chicagoDate("invalid")).toBeNull();
  });
  it("keeps leases, temporary vehicle use, repairs and products out of vehicle sales", () => {
    expect(dealGroup("bhph")).toBe("SALES");
    expect(dealGroup("lease-to-own")).toBe("LEASING");
    expect(dealGroup("test-drive")).toBe("USE");
    expect(dealGroup("repairs")).toBe("SERVICE");
    expect(dealGroup("warranty-products")).toBe("PRODUCTS");
    const rows = ["retail-sale", "lease-to-own", "daily-rental", "repairs"].map(pathway => ({ pathway, stage: "Completed", status: "COMPLETED", completedDate: "2026-10-31", createdDate: "2026-10-01" })) as DashboardDeal[];
    const summary = summarizeDeals([...rows, { ...rows[0], status: "ARCHIVED" }, { ...rows[0], completedDate: null }], reportingRange("2026-10-31", "month"));
    expect(summary.completed).toBe(4);
    expect(summary.groups.find(group => group.key === "SALES")?.completed).toBe(1);
    expect(summary.undatedCompleted).toBe(1);
  });
});
