import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { searchVehicleOperations } from "@/server/vehicle-discovery/service";
import type { VehicleDiscoveryRepository } from "@/server/vehicle-discovery/repository";

const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

describe("Vehicle Discovery governed work items", () => {
  it("passes manager team scope to the repository and returns WORK_ITEM as an authorized type", async () => {
    const search = vi.fn().mockResolvedValue({ query: "inspection", results: [], searchedTypes: ["WORK_ITEM"] });
    const result = await searchVehicleOperations(manager, { query: "inspection", types: "WORK_ITEM" }, {
      organizationId: "org-1",
      repository: { search } as unknown as VehicleDiscoveryRepository,
      foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository,
      enforceRollout: false
    });
    expect(result.searchedTypes).toEqual(["WORK_ITEM"]);
    expect(search).toHaveBeenCalledWith("org-1", "inspection", ["WORK_ITEM"], 50, true, { actorUserId: "manager", canViewTeam: true });
  });
});
