import { describe, expect, it, vi } from "vitest";

import { createShopPlanningRepository } from "@/server/shop-planning/repository";

const command = {
  actorUserId: "manager-1",
  commandType: "PRESENT_ESTIMATE_VERSION",
  correlationId: "corr-1",
  domain: "SHOP_OPERATIONS",
  expectedVersion: 4,
  idempotencyKey: "estimate-1",
  locationId: "location-1",
  organizationId: "org-1",
  payload: {},
  reason: "Present approved outside-vendor estimate.",
  requestHash: "hash-1",
  subjectId: "ro-1",
  subjectType: "REPAIR_ORDER",
};

const estimateData = {
  assumptions: null,
  discountCents: 0,
  expiresAt: new Date("2026-09-01T12:00:00Z"),
  feeSubtotalCents: 0,
  laborSubtotalCents: 32000,
  lineItems: [{ description: "Vendor-approved body repair", key: "LINE-1", laborGuideMinutes: 60, plannedCorrection: "Complete approved vendor repair.", quantity: 1, taxable: false, type: "LABOR" as const, unitPriceCents: 32000, workTypeCode: "BODY_REPAIR" }],
  optionGroups: null,
  partsSubtotalCents: 0,
  presentationChannel: "IN_PERSON",
  presentedAt: new Date("2026-08-25T12:00:00Z"),
  taxBoundary: "Configured finance boundary",
  taxCents: 0,
  totalCents: 32000,
};

function database(vendorBasis: unknown, stage = "AUTHORIZATION", aggregateVersion = 4, repairOrderVersion = aggregateVersion) {
  const tx = {
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: "aggregate-1", version: aggregateVersion }), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn().mockResolvedValue({ id: "command-1" }), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    enterpriseOutboxMessage: { create: vi.fn() },
    repairDiagnosisVersion: { create: vi.fn().mockResolvedValue({ id: "diagnosis-version-1", version: 1 }), findFirst: vi.fn().mockResolvedValue(null) },
    repairEstimateVersion: { create: vi.fn().mockResolvedValue({ id: "estimate-version-1", version: 1, totalCents: 32000 }), findFirst: vi.fn().mockResolvedValue(null) },
    repairOrder: {
      findFirst: vi.fn().mockResolvedValue({ version: repairOrderVersion }),
      findFirstOrThrow: vi.fn().mockResolvedValue({ closedAt: null, id: "ro-1", locationId: "location-1", nextAction: "Present estimate.", operatingState: "ACTIVE", organizationId: "org-1", ownerUserId: "manager-1", stage, stageStartedAt: new Date("2026-08-25T11:00:00Z"), targetAt: null }),
      update: vi.fn().mockResolvedValue({ id: "ro-1", locationId: "location-1", nextAction: "Capture decision.", operatingState: "ACTIVE", ownerUserId: "manager-1", stage: "ESTIMATE", targetAt: null, version: repairOrderVersion + 1 }),
    },
    repairOrderStateEvent: { create: vi.fn() },
    repairVendorWork: { findFirst: vi.fn().mockResolvedValue(vendorBasis) },
    user: { findFirst: vi.fn().mockResolvedValue({ id: "manager-1" }) },
  };
  return { db: { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) }, tx };
}

describe("shop planning vendor estimate gate", () => {
  it("allows estimate presentation from an approved outside-vendor workflow without forcing diagnosis", async () => {
    const { db, tx } = database({ approvalStatus: "APPROVED", id: "vendor-work-1", vendorName: "Simba Collision" });
    const repository = createShopPlanningRepository(db as never);

    const result = await repository.estimate(command, estimateData);

    expect(tx.repairVendorWork.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ approvalStatus: { in: ["APPROVED", "NOT_REQUIRED"] }, repairOrderId: "ro-1" }),
    }));
    expect(result.result).toMatchObject({ basis: "APPROVED_OUTSIDE_VENDOR", repairOrderVersion: 5, stage: "ESTIMATE" });
  });

  it("lets direct repair scope continue when the command ledger is one version behind the repair order", async () => {
    const staleCommand = { ...command, commandType: "RECORD_DIRECT_REPAIR_SCOPE", expectedVersion: 3, idempotencyKey: "scope-1" };
    const { db, tx } = database(null, "INTAKE", 2, 3);
    tx.repairOrder.update.mockResolvedValueOnce({ id: "ro-1", locationId: "location-1", nextAction: "Prepare estimate.", operatingState: "ACTIVE", ownerUserId: "manager-1", stage: "DIAGNOSIS", targetAt: null, version: 4 });
    const repository = createShopPlanningRepository(db as never);

    const result = await repository.directRepairScope(staleCommand, {
      concern: "Visible body damage",
      diagnosedAt: new Date("2026-08-25T12:00:00Z"),
      evidence: ["broken side mirror"],
      proposedCorrection: "Replace mirror and verify fit.",
      recommendation: "Prepare bodywork estimate.",
      scopeSummary: "Right side mirror broken",
      scopeType: "BODYWORK",
      technicianUserId: "manager-1",
      uncertainty: "LOW",
      whyNoDiagnosis: "Visible body damage does not require troubleshooting diagnostics.",
    });

    expect(tx.enterpriseAggregateVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ version: 4 }),
    }));
    expect(result.result).toMatchObject({ path: "DIRECT_REPAIR_SCOPE", repairOrderVersion: 4, stage: "DIAGNOSIS" });
  });

  it("still blocks estimates when neither diagnosis nor approved vendor workflow exists", async () => {
    const { db } = database(null);
    const repository = createShopPlanningRepository(db as never);

    await expect(repository.estimate(command, estimateData)).rejects.toThrow("mechanical diagnosis, in-house bodywork/direct repair scope");
  });

  it("allows a failed-QC completion estimate to reopen planning from quality control", async () => {
    const { db, tx } = database({ approvalStatus: "APPROVED", id: "vendor-work-1", vendorName: "Simba Collision" }, "QUALITY_CONTROL");
    const repository = createShopPlanningRepository(db as never);

    const result = await repository.estimate(command, estimateData);

    expect(tx.repairOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ stage: "ESTIMATE" }),
    }));
    expect(result.result).toMatchObject({ basis: "APPROVED_OUTSIDE_VENDOR", repairOrderVersion: 5, stage: "ESTIMATE" });
  });
});
