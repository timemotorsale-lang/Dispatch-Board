import { describe, expect, it, vi } from "vitest";
const { workspace } = vi.hoisted(() => ({ workspace: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: async () => ({ id: "advisor" }) }));
vi.mock("@/server/shop-planning/service", () => ({ getShopPlanningWorkspace: workspace }));
vi.mock("@/server/services/labor-rate-settings", () => ({ getActiveLaborRate: async () => ({ laborRate: 150 }) }));
vi.mock("@/server/policies/access", () => ({ canManageSettings: () => false }));
import Page from "@/app/(app)/vehicles/shop-planning/page";

describe("advisor selected repair planning", () => {
  it("shows saved-estimate continuation only for an estimate verified on the exact RO", async () => {
    workspace.mockResolvedValueOnce({ repairOrders: [{ id: "selected", estimateVersions: [{ id: "estimate" }] }] });
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "selected", estimateId: "estimate" }) });
    expect(page.props.children[0].props.children[0].props).toEqual({ repairOrderId: "selected", estimateId: "estimate" });
  });
  it("does not claim a foreign estimate was saved on this RO", async () => {
    workspace.mockResolvedValueOnce({ repairOrders: [{ id: "selected", estimateVersions: [{ id: "owned-estimate" }] }] });
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "selected", estimateId: "foreign" }) });
    expect(page.props.children[0].props.children[0].props.role).toBe("alert");
  });
  it("contains only the requested repair order instead of defaulting to another vehicle", async () => {
    workspace.mockResolvedValueOnce({ repairOrders: [{ id: "other" }, { id: "selected" }] });
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "selected" }) });
    expect(page.props.children[1].props.initial.repairOrders).toEqual([{ id: "selected" }]);
  });
  it("does not substitute a different vehicle when the requested order is unavailable", async () => {
    workspace.mockResolvedValueOnce({ repairOrders: [{ id: "other" }] });
    const page = await Page({ searchParams: Promise.resolve({ repairOrderId: "missing" }) });
    expect(page.props.children[1].props.children).toContain("No other vehicle was selected.");
  });
});
