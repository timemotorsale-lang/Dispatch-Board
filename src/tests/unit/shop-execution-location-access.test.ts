import { describe, expect, it, vi } from "vitest";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { ShopExecutionRepository } from "@/server/shop-execution/repository";
import type { VehicleCapabilityGrantRecord } from "@/server/enterprise-command/vehicle-capabilities";
vi.mock("@/server/db/client", () => ({ prisma: {} }));
import { getShopExecutionWorkspace, recordRepairJobLabor } from "@/server/shop-execution/service";

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
