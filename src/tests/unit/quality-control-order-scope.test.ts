import { describe, expect, it, vi } from "vitest";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { QualityControlRepository } from "@/server/quality-control/repository";
import { getQualityControlWorkspace } from "@/server/quality-control/service";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

const actor = {
  id: "qc-user", name: "QC User", email: "qc@example.test", isActive: true,
  roles: ["Quality Control"], duties: { all: [], direct: [], roleDefaults: [] },
};

describe("order-scoped quality control", () => {
  const selected = { id: "ro-selected", locationId: "shop-a", repairJobs: [{ status: "IN_PROGRESS" }] };
  const other = { id: "ro-other", locationId: "shop-b" };

  function dependencies(repairOrders: unknown[], grants: unknown[] = []) {
    const overview = vi.fn().mockResolvedValue({ repairOrders, users: [] });
    return {
      overview,
      repository: { overview } as unknown as QualityControlRepository,
      foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue(grants) } as unknown as EnterpriseCommandRepository,
      organizationId: "org-test",
    };
  }

  it("requests and returns only the selected order even when it is outside the QC queue", async () => {
    const input = dependencies([selected, other]);
    const result = await getQualityControlWorkspace(actor, input, selected.id);
    expect(input.overview).toHaveBeenCalledWith("org-test", selected.id);
    expect(result.repairOrders).toEqual([selected]);
  });

  it("never substitutes a different order", async () => {
    const result = await getQualityControlWorkspace(actor, dependencies([other]), selected.id);
    expect(result.repairOrders).toEqual([]);
  });

  it("honors a location-specific read denial", async () => {
    const input = dependencies([selected], [{
      capability: "REPAIR_ORDER_VIEW", effect: "DENY", locationId: selected.locationId,
      validFrom: new Date("2020-01-01"), validTo: null,
    }]);
    await expect(getQualityControlWorkspace(actor, input, selected.id)).rejects.toThrow("Vehicle capability required");
  });
});
