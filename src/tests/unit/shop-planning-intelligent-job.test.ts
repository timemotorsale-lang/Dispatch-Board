import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { ShopPlanningRepository } from "@/server/shop-planning/repository";
import { createApprovedRepairJobs } from "@/server/shop-planning/service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const foundation = { listCapabilityGrants: vi.fn().mockResolvedValue([]), listFeatureFlags: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository;

function order(disposition = "ACCEPTED") {
  return {
    id: "ro-1",
    locationId: "location-1",
    version: 4,
    diagnosisVersions: [{ id: "diagnosis-1" }],
    estimateVersions: [{
      id: "estimate-1",
      lineItems: [
        { key: "labor-brakes", type: "LABOR", description: "Replace front brakes", laborGuideMinutes: 90, plannedCorrection: "Replace front pads", workTypeCode: "BRAKES" },
        { key: "part-pads", type: "PART", description: "Front pads", laborGuideMinutes: 0, plannedCorrection: "Install pads", workTypeCode: "PART" }
      ],
      authorizations: [{ id: "auth-1", disposition, authorizedLineKeys: ["labor-brakes", "part-pads"] }]
    }],
    repairJobs: [],
    partDemands: [{ id: "demand-1", repairJobId: null, status: "REQUESTED" }]
  };
}

describe("intelligent approved repair-job creation", () => {
  it("creates executable labor only and carries the available parts demand into that job", async () => {
    const job = vi.fn().mockResolvedValue({ duplicate: false, result: { id: "job-1", repairOrderVersion: 5 }, version: 5 });
    const repository = { get: vi.fn().mockResolvedValue(order()), job } as unknown as ShopPlanningRepository;

    const result = await createApprovedRepairJobs(manager, "ro-1", { idempotencyKey: "one-click-1", reason: "Create approved work." }, { enforceRollout: false, foundationRepository: foundation, organizationId: "org-1", repository });

    expect(result.result.createdJobs).toHaveLength(1);
    expect(job).toHaveBeenCalledWith(expect.objectContaining({ commandType: "CREATE_AUTHORIZED_REPAIR_JOB", idempotencyKey: "one-click-1:labor-brakes" }), expect.objectContaining({ authorizedLineKey: "labor-brakes", partDemandIds: ["demand-1"], partsRequired: true }));
  });

  it("does not use an earlier approval after the latest decision has revoked it", async () => {
    const job = vi.fn();
    const repository = { get: vi.fn().mockResolvedValue(order("REVOKED")), job } as unknown as ShopPlanningRepository;

    await expect(createApprovedRepairJobs(manager, "ro-1", { idempotencyKey: "one-click-2", reason: "Create approved work." }, { enforceRollout: false, foundationRepository: foundation, organizationId: "org-1", repository })).rejects.toThrow("latest estimate decision must approve work");
    expect(job).not.toHaveBeenCalled();
  });
});
