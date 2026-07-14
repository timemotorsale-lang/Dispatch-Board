import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { VehicleRegistryRepository } from "@/server/vehicle-registry/repository";
import { createRegistryVehicle, listVehicleRegistry } from "@/server/vehicle-registry/service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
function foundation(): EnterpriseCommandRepository { return { listCapabilityGrants: vi.fn().mockResolvedValue([]), listFeatureFlags: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository; }

describe("vehicle registry service", () => {
  it("uses tenant-safe pagination for registry search", async () => {
    const search = vi.fn().mockResolvedValue({ items: [], page: 2, pageSize: 100, total: 0, totalPages: 1 });
    const result = await listVehicleRegistry(manager, { page: 2, pageSize: 500, query: "Honda" }, { organizationId: "org-1", repository: { search } as unknown as VehicleRegistryRepository, foundationRepository: foundation(), enforceRollout: false });
    expect(search).toHaveBeenCalledWith("org-1", { page: 2, pageSize: 100, query: "Honda" }); expect(result.total).toBe(0);
  });

  it("builds an audited, version-zero create command", async () => {
    const createVehicle = vi.fn().mockImplementation(async (command) => ({ duplicate: false, result: { id: command.subjectId }, version: 1 }));
    const result = await createRegistryVehicle(manager, { vehicleNumber: "TMS-1", vin: "1HGCM82633A004352", stockNumber: "1", year: 2003, reason: "Create canonical registry identity.", idempotencyKey: "create-1" }, { organizationId: "org-1", repository: { createVehicle } as unknown as VehicleRegistryRepository, foundationRepository: foundation(), enforceRollout: false });
    expect(createVehicle).toHaveBeenCalledWith(expect.objectContaining({ commandType: "CREATE_VEHICLE", domain: "VEHICLE_REGISTRY", expectedVersion: 0, organizationId: "org-1" }), expect.objectContaining({ vin: "1HGCM82633A004352" })); expect(result.version).toBe(1);
  });

  it("blocks mutations while the registry rollout is off", async () => {
    await expect(createRegistryVehicle(manager, { vehicleNumber: "TMS-1", vin: "1HGCM82633A004352", reason: "Create canonical registry identity.", idempotencyKey: "create-1" }, { organizationId: "org-1", repository: {} as VehicleRegistryRepository, foundationRepository: foundation() })).rejects.toThrow("not enabled");
  });
});
