import { beforeEach, describe, expect, it, vi } from "vitest";

import TechnicianWorkOrderPage from "@/app/(print)/vehicles/repair-workbench/technician-work-order/page";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), readOrder: vi.fn(), restriction: vi.fn(), printCheck: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.currentUser }));
vi.mock("@/server/shop-planning/service", () => ({
  getTechnicianWorkOrderDetail: mocks.readOrder,
  repairJobCreationRestriction: mocks.restriction,
}));
vi.mock("@/features/prototype/repair-workflow/print-technician-work-order", async importOriginal => {
  const { PrintTechnicianWorkOrder } = await importOriginal<typeof import("@/features/prototype/repair-workflow/print-technician-work-order")>();
  return { PrintTechnicianWorkOrder: (props: Parameters<typeof PrintTechnicianWorkOrder>[0]) => {
    mocks.printCheck(props.verifyPrintAction);
    return <PrintTechnicianWorkOrder {...props} />;
  } };
});
vi.mock("next/navigation", async importOriginal => ({
  ...await importOriginal<typeof import("next/navigation")>(),
  notFound: () => { throw new Error("Order unavailable"); },
}));

const actor = { id: "advisor", roles: ["Service Advisor"], duties: { all: [] } };
const labor = { key: "labor-1", type: "LABOR", description: "Replace bracket", laborGuideMinutes: 15 };
const estimate = { id: "estimate", version: 2, lineItems: [labor,
  { key: "part-1", type: "PART", description: "New bracket", laborLineKey: labor.key, quantity: 1 }],
authorizations: [{ id: "approval", disposition: "PARTIAL", authorizedLineKeys: [labor.key, "part-1"] }] };
const job = {
  id: "job", estimateVersionId: estimate.id, authorizationId: "approval", authorizedLineKey: labor.key,
  status: "READY_FOR_REPAIR", jobNumber: "J001", description: labor.description, plannedCorrection: "Verify torque and fit.",
  laborGuideMinutes: 15, partsRequired: true, partDemands: [], version: 3,
  dispatches: [], laborClocks: [], qualityInspections: [], partCustodyEvents: [],
};
const order = {
  id: "ro-1", locationId: "store", origin: "CUSTOMER_REPAIR", stage: "AUTHORIZATION",
  location: { name: "Time Motor Sales", timezone: "America/Chicago" }, repairOrderNumber: "RO-001",
  vehicle: { year: 2021, make: "Ford", model: "Escape" },
  serviceVisit: { concernSummary: "Rattle from the front." },
  estimateVersions: [estimate], vendorWorks: [], repairJobs: [job], partDemands: [],
};

async function renderPage(returnTo?: string, jobId?: string) {
  return renderToStaticMarkup(await TechnicianWorkOrderPage({ searchParams: Promise.resolve({ repairOrderId: order.id, returnTo, jobId }) }));
}

describe("Technician work order page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUser.mockResolvedValue(actor);
    mocks.readOrder.mockResolvedValue(order);
  });

  it("prints current saved scope with instructions and omits parts administration, superseded and cancelled jobs", async () => {
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [job,
      { ...job, id: "stale", authorizationId: "old-approval", description: "Superseded instructions" },
      { ...job, id: "cancelled", status: "CANCELLED", jobNumber: "J003", description: "Cancelled instructions" }] });
    const html = await renderPage("/vehicles/repair-workbench?repairOrderId=ro-1&step=parts");
    expect(mocks.readOrder).toHaveBeenCalledWith(actor, order.id);
    expect(mocks.restriction).not.toHaveBeenCalled();
    expect(html).toContain("Print technician work order");
    expect(html).toContain("Verify torque and fit.");
    expect(html).not.toContain("1 × New bracket");
    expect(html).not.toContain("Open parts");
    expect(html).toContain("repairOrderId=ro-1&amp;step=parts");
    expect(html).not.toContain("Superseded instructions");
    expect(html).not.toContain("Cancelled instructions");
  });

  it("shows the same approved job and rework details to the assigned technician and manager", async () => {
    const failureDate = new Date("2026-10-16T12:30:00Z");
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [{
      ...job, status: "DISPATCHED", qcFailedAt: failureDate,
      dispatches: [{
        status: "ACTIVE", position: "CURRENT", technicianUserId: "tech",
        technicianUser: { name: "Morgan Reed" }, bayResource: { name: "Bay 3" },
      }],
      laborClocks: [{ technicianUserId: "tech", state: "FINISHED", accumulatedMinutes: 10, finishedAt: new Date("2026-10-16T12:00:00Z") }],
      procedureVersion: { title: "Mounts", version: 2, qcRules: ["Measure bracket clearance"], requiredEvidence: ["Save clearance measurement"] },
      qualityInspections: [{ reworkInstructions: "Adjust bracket clearance.", failureReasonCodes: ["CLEARANCE_LOW"] }],
      executionEvidence: ["Previous fit reading"], qcHandoffNotes: "Check clearance again",
    }] });
    const technician = { ...actor, id: "tech", roles: ["Mechanic"] };
    mocks.currentUser.mockResolvedValue(technician);
    const html = await renderPage();
    for (const value of ["J001", "Job revision 3", "Morgan Reed", "Bay 3",
      "Customer concern", "Work instructions", "Technician comments", "Message to advisor", "Send comment",
      "Measure bracket clearance", "Save clearance measurement",
      "Adjust bracket clearance.", "Previous fit reading", "Check clearance again"]) {
      expect(html).toContain(value);
    }
    mocks.currentUser.mockResolvedValue({ ...actor, roles: ["General Manager"] });
    expect(await renderPage()).toContain("Send comment");
    mocks.currentUser.mockResolvedValue({ ...technician, id: "other-tech" });
    expect(await renderPage()).not.toContain("Send comment");
  });

  it("shows a comment box for a staged technician while parts are pending", async () => {
    mocks.currentUser.mockResolvedValue({ ...actor, id: "tech", roles: ["Mechanic"] });
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [{ ...job, status: "WAITING_PARTS", dispatches: [{
      status: "STAGED", position: "NEXT", technicianUserId: "tech", technicianUser: { name: "Morgan Reed" }, bayResource: null,
    }] }] });
    const html = await renderPage();
    expect(html).toContain("Waiting on parts");
    expect(html).toContain("Message to advisor");
    expect(html).not.toContain("Updates open when a job");
    expect(html).not.toContain("Start repair");
  });

  it("shows both approved jobs on one sheet even when a job is specified in the link", async () => {
    const second = { ...labor, key: "labor-2", description: "Replace front bumper cover" };
    mocks.readOrder.mockResolvedValue({ ...order,
      estimateVersions: [{ ...estimate, lineItems: [...estimate.lineItems, second], authorizations: [
        { ...estimate.authorizations[0], authorizedLineKeys: [...estimate.authorizations[0].authorizedLineKeys, second.key] },
      ] }],
      repairJobs: [job, { ...job, id: "second", authorizedLineKey: second.key, jobNumber: "J002",
        description: second.description, plannedCorrection: "Check bumper alignment." }],
    });
    const html = await renderPage(undefined, "second");
    expect(html.match(/<h2>Work instructions<\/h2>/g)).toHaveLength(1);
    expect(html).toContain("Replace front bumper cover");
    expect(html).toContain("Check bumper alignment.");
    expect(html).toContain("Verify torque and fit.");
    expect(html).not.toContain("jobId=");
  });

  it("revalidates the exact saved snapshot before printing", async () => {
    await renderPage();
    const verify = mocks.printCheck.mock.calls[0][0];
    await expect(verify()).resolves.toBe(true);
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [{ ...job, dispatches: [{
      status: "STAGED", technicianUserId: "tech", technicianUser: { name: "Morgan" }, bayResource: null,
    }] }] });
    await expect(verify()).resolves.toBe(false);
    mocks.readOrder.mockResolvedValue(order);
    mocks.currentUser.mockResolvedValue({ ...actor, id: "different-user" });
    await expect(verify()).resolves.toBe(false);
  });

  it("shows job readiness without directing a technician to parts administration", async () => {
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [{ ...job, status: "WAITING_PARTS" }] });
    const blocked = await renderPage();
    expect(blocked).toContain("Waiting on parts");
    expect(blocked).not.toContain("Review required parts");
    expect(blocked).not.toContain("Open parts");
    mocks.readOrder.mockResolvedValue({ ...order, repairJobs: [{
      ...job, status: "WAITING_PARTS", partDemands: [{
        id: "part", partId: "bracket", status: "RESERVED", quantityRequired: 1,
        quantityReserved: 1, part: { description: "New bracket" },
      }],
    }] });
    expect(await renderPage()).toContain("Awaiting assignment");
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
