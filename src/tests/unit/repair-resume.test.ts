import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getRepairResume, resumedLaborGuideHref } from "@/server/repair-order/resume-service";
import { repairResumeLabel } from "@/lib/repair-resume";

const db = vi.hoisted(() => ({
  orders: vi.fn(), locations: vi.fn(), drafts: vi.fn(), flags: vi.fn(), grants: vi.fn(), vehicles: vi.fn(),
}));
vi.mock("@/server/db/client", () => ({ prisma: {
  repairOrder: { findMany: db.orders },
  location: { findMany: db.locations },
  diagnosticWorkspaceDraft: { findMany: db.drafts },
  vehicle: { findMany: db.vehicles },
} }));
vi.mock("@/server/enterprise-command/repository", () => ({
  createEnterpriseCommandRepository: () => ({ listCapabilityGrants: db.grants, listFeatureFlags: db.flags }),
}));
vi.mock("@/server/enterprise-command/service", () => ({
  evaluateVehicleOperationsFeature: () => ({ executable: true }),
}));

const advisor: AuthenticatedUser = {
  id: "advisor", name: "Advisor", email: "advisor@local.test", roles: ["General Manager"], isActive: true,
  duties: { direct: [], roleDefaults: [], all: [] },
};
const order = {
  id: "ro-1", vehicleId: "vehicle-1", locationId: "shop-1", stage: "RECEIVED",
  repairOrderNumber: "RO-1", operatingState: "ACTIVE", ownerUser: { name: "Advisor" },
  releaseAuthorization: null, inspectionVersions: [], diagnosisVersions: [],
  estimateVersions: [], repairJobs: [], vendorWorks: [],
};

describe("repair resume", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.locations.mockResolvedValue([{ id: "shop-1" }]);
    db.grants.mockResolvedValue([]);
    db.flags.mockResolvedValue([]);
    db.drafts.mockResolvedValue([]);
  });

  it("re-reads the recorded inspection and advances the recommendation without changing the order", async () => {
    db.orders.mockResolvedValueOnce([order]).mockResolvedValueOnce([{ ...order, inspectionVersions: [{ id: "inspection" }] }]);
    expect((await getRepairResume(advisor, order.id))?.summary.action).toBe("Open inspection checklist");
    expect((await getRepairResume(advisor, order.id))?.summary.action).toBe("Resume diagnosis");
  });

  it("reopens the latest live quote saved by the requesting user for this order only", async () => {
    db.orders.mockResolvedValue([{ ...order, diagnosisVersions: [{ id: "diagnosis" }] }]);
    db.drafts.mockResolvedValue([
      { id: "archived", content: { ro: { id: order.id }, archivedAt: "2026-01-01" } },
      { id: "draft-1", content: { ro: { id: order.id } } },
    ]);
    const decision = await getRepairResume(advisor, order.id);
    expect(db.drafts).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: advisor.id, OR: [{ content: { path: ["ro", "id"], equals: order.id } }] },
    }));
    expect(decision?.summary.action).toBe("Resume estimate draft");
    expect(decision && resumedLaborGuideHref(decision, "/vehicles/repair-workbench"))
      .toContain("draftId=draft-1");
  });

  it("does not select a draft for a vendor route or offer an edit to a read-only role", () => {
    expect(repairResumeLabel({ stage: "estimate", vendor: true, canAct: true, hasDraft: false })).toBe("Open vendor handoff");
    expect(repairResumeLabel({ stage: "estimate", vendor: false, canAct: false, hasDraft: true })).toBe("View repair order");
  });

  it("does not return an order from a location the user cannot read", async () => {
    db.grants.mockResolvedValue([{
      capability: "REPAIR_ORDER_VIEW", locationId: "shop-1", validFrom: new Date(0), validTo: null, effect: "DENY",
    }]);
    db.orders.mockResolvedValue([]);
    expect(await getRepairResume(advisor, order.id)).toBeNull();
    expect(db.orders).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: order.id, locationId: { in: [] } }),
    }));
    expect(db.drafts).not.toHaveBeenCalled();
  });
});
