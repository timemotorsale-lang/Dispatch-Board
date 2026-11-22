import { beforeEach, describe, expect, it, vi } from "vitest";

import TechnicianWorkOrderPage from "@/app/(print)/vehicles/repair-workbench/technician-work-order/page";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), readOrder: vi.fn(), restriction: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.currentUser }));
vi.mock("@/server/shop-planning/service", () => ({
  getShopPlanningDetail: mocks.readOrder,
  repairJobCreationRestriction: mocks.restriction,
}));
vi.mock("next/navigation", async importOriginal => ({
  ...await importOriginal<typeof import("next/navigation")>(),
  notFound: () => { throw new Error("Order unavailable"); },
}));

const actor = { id: "advisor" };
const labor = { key: "labor-1", type: "LABOR", description: "Replace bracket", laborGuideMinutes: 15 };
const estimate = { id: "estimate", version: 2, lineItems: [labor,
  { key: "part-1", type: "PART", description: "New bracket", laborLineKey: labor.key, quantity: 1 }],
authorizations: [{ id: "approval", disposition: "PARTIAL", authorizedLineKeys: [labor.key, "part-1"] }] };
const job = {
  id: "job", estimateVersionId: estimate.id, authorizationId: "approval", authorizedLineKey: labor.key,
  status: "READY_FOR_REPAIR", jobNumber: "J001", description: labor.description, plannedCorrection: "Verify torque and fit.",
  laborGuideMinutes: 15, partsRequired: true, partDemands: [],
};
const order = {
  id: "ro-1", locationId: "store", origin: "CUSTOMER_REPAIR", stage: "AUTHORIZATION",
  location: { name: "Time Motor Sales" }, repairOrderNumber: "RO-001",
  vehicle: { year: 2021, make: "Ford", model: "Escape" },
  serviceVisit: { concernSummary: "Rattle from the front." },
  estimateVersions: [estimate], vendorWorks: [], repairJobs: [job], partDemands: [],
};

async function renderPage(returnTo?: string) {
  return renderToStaticMarkup(await TechnicianWorkOrderPage({ searchParams: Promise.resolve({ repairOrderId: order.id, returnTo }) }));
}

describe("Technician work order page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUser.mockResolvedValue(actor);
    mocks.readOrder.mockResolvedValue(order);
  });

  it("prints current saved scope with instructions and parts and omits superseded or cancelled jobs", async () => {
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [job,
      { ...job, id: "stale", authorizationId: "old-approval", description: "Superseded instructions" },
      { ...job, id: "cancelled", status: "CANCELLED", jobNumber: "J003", description: "Cancelled instructions" }] });
    const html = await renderPage("/vehicles/repair-workbench?repairOrderId=ro-1&step=parts");
    expect(mocks.readOrder).toHaveBeenCalledWith(actor, order.id);
    expect(mocks.restriction).not.toHaveBeenCalled();
    expect(html).toContain("Print technician work order");
    expect(html).toContain("Verify torque and fit.");
    expect(html).toContain("1 × New bracket");
    expect(html).toContain("repairOrderId=ro-1&amp;step=parts");
    expect(html).not.toContain("Superseded instructions");
    expect(html).not.toContain("Cancelled instructions");
  });

  it("offers the governed prepare form for approved work without jobs", async () => {
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [] });
    const html = await renderPage();
    expect(mocks.restriction).toHaveBeenCalledWith(actor, order.locationId);
    expect(html).toContain("Create technician work order");
    expect(html).not.toContain("Print technician work order");
  });

  it("blocks print after revocation and rejects a return link to another RO", async () => {
    mocks.readOrder.mockResolvedValue({ ...order, estimateVersions: [
      { ...estimate, authorizations: [{ ...estimate.authorizations[0], disposition: "REVOKED" }] },
    ] });
    const html = await renderPage("/vehicles/repair-workbench?repairOrderId=other");
    expect(html).toContain("Review repair authorization");
    expect(html).not.toContain("Print technician work order");
    expect(html).not.toContain("repairOrderId=other");
  });

  it("does not render an order outside the actor's read scope", async () => {
    mocks.readOrder.mockRejectedValue(new Error("Location access is required"));
    await expect(renderPage()).rejects.toThrow("Order unavailable");
  });
});
