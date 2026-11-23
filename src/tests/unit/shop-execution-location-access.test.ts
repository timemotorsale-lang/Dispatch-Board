import { describe, expect, it, vi } from "vitest";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { ShopExecutionRepository } from "@/server/shop-execution/repository";
import type { VehicleCapabilityGrantRecord } from "@/server/enterprise-command/vehicle-capabilities";
vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/enterprise-command/aggregate-mutation", async importOriginal => ({
  ...await importOriginal<typeof import("@/server/enterprise-command/aggregate-mutation")>(),
  executeAggregateMutation: vi.fn(),
}));
import type { PrismaClient } from "@prisma/client";
import { executeAggregateMutation } from "@/server/enterprise-command/aggregate-mutation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createShopExecutionRepository } from "@/server/shop-execution/repository";
import { addRepairOrderTechnician, getShopExecutionWorkspace, recordRepairJobLabor } from "@/server/shop-execution/service";

const sales = { id: "sales", name: "Sales", email: "sales@example.test", isActive: true, roles: ["Sales"], duties: { all: [], direct: [], roleDefaults: [] } };
const grant = (locationId: string | null, effect: "ALLOW" | "DENY"): VehicleCapabilityGrantRecord => ({ capability: "REPAIR_ORDER_VIEW", locationId, effect, validFrom: new Date(0), validTo: null });
function setup(grants: VehicleCapabilityGrantRecord[]) {
  const overview = vi.fn().mockResolvedValue({
    jobs: ["a", "b"].map(locationId => ({ id: `job-${locationId}`, repairOrder: { locationId } })),
    repairOrders: ["a", "b"].map(locationId => ({ id: `ro-${locationId}`, locationId })),
    resources: ["a", "b"].map(locationId => ({ id: `resource-${locationId}`, locationId })),
    users: [], procedures: [], qualifications: [],
  });
  const readLocations = vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
  return { overview, readLocations, input: {
    organizationId: "org", repository: { overview, readLocations } as unknown as ShopExecutionRepository,
    foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue(grants) } as unknown as EnterpriseCommandRepository,
  } };
}
describe("shop execution store visibility", () => {
  it("admits a store-only Sales grant without exposing other store jobs, ROs or resources", async () => {
    const { input } = setup([grant("a", "ALLOW")]);
    const result = await getShopExecutionWorkspace(sales, input);
    expect(result.jobs.map(job => job.id)).toEqual(["job-a"]);
    expect(result.repairOrders.map(order => order.id)).toEqual(["ro-a"]);
    expect(result.resources.map(resource => resource.id)).toEqual(["resource-a"]);
    expect(result.canPublishProcedure).toBe(false);
  });
  it("honors an explicit store deny for a general manager", async () => {
    const { input } = setup([grant("b", "DENY")]);
    expect((await getShopExecutionWorkspace({ ...sales, roles: ["General Manager"] }, input)).jobs.map(job => job.id)).toEqual(["job-a"]);
  });
  it("never lets a local allow override global deny", async () => {
    const { input, overview, readLocations } = setup([grant(null, "DENY"), grant("a", "ALLOW")]);
    await expect(getShopExecutionWorkspace(sales, input)).rejects.toThrow("Vehicle capability required");
    expect(readLocations).not.toHaveBeenCalled();
    expect(overview).not.toHaveBeenCalled();
  });
  it("rejects an actor denied every store before fetching directory metadata", async () => {
    const { input, overview } = setup([grant("a", "DENY"), grant("b", "DENY")]);
    await expect(getShopExecutionWorkspace({ ...sales, roles: ["General Manager"] }, input)).rejects.toThrow("NO_ACCESSIBLE_LOCATION");
    expect(overview).not.toHaveBeenCalled();
  });
});

it("leaves site technician setup to managers with repair access at the order's location", async () => {
  const manager = { ...sales, roles: ["General Manager"] };
  const { input, overview } = setup([{ ...grant("b", "DENY"), capability: "REPAIR_ORDER_MANAGE" }]);
  const addSiteTechnician = vi.fn().mockResolvedValue({ result: { technicianUserId: "tech" } });
  const dependencies = { ...input, enforceRollout: false, repository: {
    ...input.repository, addSiteTechnician, laborCommandVersion: vi.fn().mockResolvedValue({ expectedVersion: 2 }), aggregateVersion: vi.fn(),
  } };
  const request = { technicianUserId: "tech", expectedLocationId: "a", reason: "Site technician setup.", idempotencyKey: "technician-setup" };
  await expect(addRepairOrderTechnician(sales, "ro-a", request, dependencies)).rejects.toThrow("Manager access required.");
  expect(overview).not.toHaveBeenCalled();
  await expect(addRepairOrderTechnician(manager, "ro-b", request, dependencies)).rejects.toThrow("Vehicle capability required");
  await expect(addRepairOrderTechnician(manager, "ro-a", { ...request, expectedLocationId: "b" }, dependencies)).rejects.toThrow("The scheduling site changed.");
  expect(addSiteTechnician).not.toHaveBeenCalled();
  await addRepairOrderTechnician(manager, "ro-a", request, dependencies);
  expect(addSiteTechnician).toHaveBeenCalledWith(expect.objectContaining({
    locationId: "a", subjectId: "a:tech", expectedVersion: 2,
    payload: { repairOrderId: "ro-a", technicianUserId: "tech" },
  }), "ro-a", "tech", expect.any(Date));
});

it("creates the site staff resource once and preserves an existing active resource on retry", async () => {
  const at = new Date("2026-11-22T12:00:00Z");
  const created = { id: "resource-tech", organizationId: "org", resourceType: { kind: "STAFF" }, status: "ACTIVE", effectiveFrom: at, effectiveTo: null };
  const tx = {
    repairOrder: { findFirst: vi.fn().mockResolvedValue({ locationId: "site-a" }) },
    user: { findFirst: vi.fn().mockResolvedValue({ name: "Existing technician" }) },
    schedulableResourceType: { findFirst: vi.fn().mockResolvedValue({
      id: "staff-type", defaultCapacityMode: "EXCLUSIVE", defaultCapacity: 1, defaultConflictPolicy: "HARD_BLOCK",
    }) },
    schedulableResource: {
      findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(created),
      create: vi.fn().mockResolvedValue(created),
    },
  };
  vi.mocked(executeAggregateMutation).mockImplementation(async (_database, _command, _topic, mutate) => {
    const { result } = await mutate(tx as unknown as Parameters<typeof mutate>[0], 1);
    return { result, duplicate: false, version: 1 };
  });
  const command = normalizeEnterpriseCommand({
    organizationId: "org", locationId: "site-a", actorUserId: "manager", domain: "SHOP_OPERATIONS",
    subjectId: "site-a:tech", subjectType: "SHOP_SITE_TECHNICIAN", commandType: "ADD_SHOP_SITE_TECHNICIAN",
    expectedVersion: 0, reason: "Set up technician.", idempotencyKey: "add-site-tech", payload: {},
  });
  const repository = createShopExecutionRepository({} as PrismaClient);
  await repository.addSiteTechnician(command, "ro-a", "tech", at);
  const retry = await repository.addSiteTechnician(command, "ro-a", "tech", at);
  expect(tx.schedulableResource.create).toHaveBeenCalledExactlyOnceWith({ data: expect.objectContaining({
    locationId: "site-a", userId: "tech", resourceTypeId: "staff-type", capacityMode: "EXCLUSIVE",
  }) });
  expect(retry.result).toMatchObject({ id: created.id, technicianUserId: "tech", locationId: "site-a" });
});

it("replays the original labor command version and keeps a newer task state", async () => {
  const { input } = setup([]);
  const labor = vi.fn().mockResolvedValue({ duplicate: true, version: 4 });
  const syncJobStatus = vi.fn();
  const laborCommandVersion = vi.fn().mockResolvedValue({ expectedVersion: 3 });
  await recordRepairJobLabor({ ...sales, roles: ["General Manager"] }, "job-a", {
    eventType: "PAUSE", technicianUserId: "technician", occurredAt: "2026-10-16T12:00:00Z",
    idempotencyKey: "retry-pause", reason: "Record partial work.", blockerReason: "Partial: waiting for the right part.",
  }, {
    ...input, enforceRollout: false,
    now: () => new Date("2026-10-16T12:02:00Z"),
    repository: { ...input.repository, labor, laborCommandVersion, aggregateVersion: async () => 5 },
    taskBridge: { syncJobStatus, reconcileJob: vi.fn(), reconcileOwner: vi.fn() },
  });
  expect(laborCommandVersion).toHaveBeenCalledWith("org", "PAUSE_REPAIR_JOB_LABOR", "retry-pause");
  expect(labor).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 3, idempotencyKey: "retry-pause" }), expect.anything());
  expect(syncJobStatus).not.toHaveBeenCalled();
});
