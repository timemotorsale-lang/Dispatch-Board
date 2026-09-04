import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ detail: vi.fn(), access: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: async () => ({ id: "user-1" }) }));
vi.mock("@/server/shop-planning/service", () => ({ getShopPlanningDetail: mocks.detail }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderDetail: mocks.access }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("Not found"); } }));
import Page from "@/app/repair-estimate/page";
beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({}); mocks.detail.mockResolvedValue({ id: "ro-1", repairOrderNumber: "RO-1", serviceVisit: { concernSummary: "Brakes" }, customer: { displayName: "Saved customer" }, vehicle: { year: 2017, make: "Acura", model: "TLX" }, estimateVersions: [{ id: "est-1", version: 2, presentedAt: new Date("2026-09-03T15:00:00Z"), createdAt: new Date(), lineItems: [{ type: "FEE", description: "Recorded fee", quantity: 1, unitPriceCents: 500 }], laborSubtotalCents: 0, partsSubtotalCents: 0, feeSubtotalCents: 500, discountCents: 0, taxCents: 0, totalCents: 500 }] }); });
describe("recorded estimate document", () => {
  it("ignores URL price and customer overrides for an official estimate", async () => {
    const page = await Page({ searchParams: Promise.resolve({ estimateId: "est-1", repairOrderId: "ro-1", customer: "Spoofed", summary: '[{"label":"Total","value":"$1"}]' }) });
    expect(page.props.isDraft).toBe(false);
    expect(page.props.customer).toBe("Saved customer");
    expect(page.props.summary).toContainEqual({ label: "Total", value: "$5.00" });
    expect(page.props.lines[0].kind).toBe("Fee");
    expect(mocks.access).toHaveBeenCalledWith({ id: "user-1" }, "ro-1");
  });
  it("never falls back to URL content when a requested saved estimate is missing", async () => {
    await expect(Page({ searchParams: Promise.resolve({ estimateId: "other-estimate", repairOrderId: "ro-1" }) })).rejects.toThrow("Not found");
  });
  it("marks URL-only quotes as preliminary", async () => {
    const page = await Page({ searchParams: Promise.resolve({ customer: "Draft customer" }) });
    expect(page.props.isDraft).toBe(true);
    expect(mocks.detail).not.toHaveBeenCalled();
  });
});
