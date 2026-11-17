import { describe, expect, it } from "vitest";
import { belongsToDealArea, dealAreaAfterPathwayChange, dealProgress, isDealWorkArea } from "@/lib/deal-work-areas";
import { summarizeDealFinancials } from "@/lib/deal-dashboard-enterprise";
import type { DashboardDeal } from "@/lib/deal-dashboard";

const row = (changes: Partial<DashboardDeal> = {}) => ({ pathway: "retail-sale", status: "IN_PROGRESS", packetState: null, stage: "Working", soldDate: null, ...changes }) as DashboardDeal;
describe("transaction work areas", () => {
  it.each([["test-drive", "drives"], ["lease-to-own", "working"], ["retail-sale", "working"], ["daily-rental", "rentals"], ["vehicle-loaner", "rentals"], ["repairs", "repairs"]] as const)("follows a changed %s deal to a work area that lists it", (pathway, area) => {
    expect(dealAreaAfterPathwayChange(pathway)).toBe(area);
    expect(belongsToDealArea(row({ pathway, status: "PENDING" }), area)).toBe(true);
  });
  it("removes sold transactions from working even with unfinished paperwork or corrections", () => {
    for (const changes of [{ status: "SOLD" }, { status: "PENDING", soldDate: "2026-11-01" }, { packetState: "CLOSED" }, { packetState: "DELIVERED_FUNDING_PENDING" }, { status: "COMPLETED" }]) {
      expect(belongsToDealArea(row(changes), "working")).toBe(false);
      expect(belongsToDealArea(row(changes), "sold")).toBe(true);
    }
  });
  it("separates operational pathways and moves completed operational work into history", () => {
    for (const [pathway, area] of [["test-drive", "drives"], ["repairs", "repairs"], ["vehicle-loaner", "rentals"], ["daily-rental", "rentals"]] as const) {
      expect(belongsToDealArea(row({ pathway }), "working")).toBe(false);
      expect(belongsToDealArea(row({ pathway }), area)).toBe(true);
      expect(belongsToDealArea(row({ pathway, status: "COMPLETED" }), area)).toBe(false);
      expect(belongsToDealArea(row({ pathway, status: "COMPLETED" }), "archive")).toBe(true);
    }
  });
  it("never calls a lease a vehicle sale and never uses an unrecorded balance as zero", () => {
    const lease = row({ pathway: "lease-to-own", status: "SOLD", packetState: "CLOSED", stage: "Completed" });
    expect(belongsToDealArea(lease, "sold")).toBe(false);
    expect(belongsToDealArea(lease, "accounts")).toBe(true);
    expect(belongsToDealArea(lease, "working")).toBe(false);
    expect(belongsToDealArea(row({ pathway: "bhph" }), "accounts")).toBe(false);
    expect(belongsToDealArea(row({ pathway: "bhph", status: "SOLD" }), "accounts")).toBe(true);
    const paid = { ...lease, indicators: { financials: { ...summarizeDealFinancials([]), outstandingCents: 0 } } } as DashboardDeal;
    expect(belongsToDealArea(paid, "accounts")).toBe(false);
    expect(belongsToDealArea(paid, "archive")).toBe(true);
  });
  it("preserves inactive sale history without showing canceled agreements as active accounts", () => {
    for (const status of ["CANCELLED", "LOST", "ARCHIVED"]) {
      const inactive = row({ pathway: "bhph", status, soldDate: "2026-11-01" });
      expect(belongsToDealArea(inactive, "archive")).toBe(true);
      expect(belongsToDealArea(inactive, "accounts")).toBe(false);
      expect(belongsToDealArea(inactive, "sold")).toBe(false);
    }
    expect(isDealWorkArea("__proto__")).toBe(false);
  });
  it("does not mark funding, delivery or title complete when paperwork closes", () => {
    const checks = dealProgress(row({ status: "SOLD", packetState: "CLOSED", documentsReady: 5, documentsTotal: 5 }));
    expect(checks.map(check => check.value)).toEqual(["Recorded", "Finalized", "Pending", "Pending", "Pending"]);
  });
});
