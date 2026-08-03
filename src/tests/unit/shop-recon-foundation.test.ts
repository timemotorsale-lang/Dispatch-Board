import { describe, expect, it } from "vitest";

import {
  getShopReconFoundation,
  isShopOpenAt,
  SHOP_RECON_AUTHORITIES,
  SHOP_RECON_BLOCKERS,
  SHOP_RECON_OPERATING_CALENDAR,
  SHOP_RECON_STAFFING,
  SHOP_RECON_STAGES,
  SHOP_RECON_WIP_LIMITS,
  SHOP_RECON_ZONES,
  validateInventoryToShopHandoffDraft,
  validateShopToInventoryHandoffDraft,
} from "@/server/shop-recon/foundation";

describe("Shop and Recon coded foundation", () => {
  it("publishes sixteen ordered unique stages without activating workflow transitions", () => {
    expect(SHOP_RECON_STAGES).toHaveLength(16);
    expect(new Set(SHOP_RECON_STAGES.map(stage => stage.code))).toHaveLength(16);
    expect(SHOP_RECON_STAGES.map(stage => stage.order)).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));
    expect(SHOP_RECON_STAGES[0].code).toBe("SHOP_ENTRY");
    expect(SHOP_RECON_STAGES[15].code).toBe("HANDOFF_SHOP_EXIT");
    expect(getShopReconFoundation().activation).toMatchObject({
      stageAlgorithms: "ACTIVE_DETERMINISTIC_READ_MODEL",
      workflowTransitions: "PROJECTED_FROM_EXISTING_REPAIR_ORDER",
      inventoryWriteback: "DISABLED",
    });
  });

  it("captures the shared-space two-bay physical baseline", () => {
    expect(SHOP_RECON_ZONES).toHaveLength(12);
    expect(new Set(SHOP_RECON_ZONES.map(zone => zone.code))).toHaveLength(12);
    expect(SHOP_RECON_WIP_LIMITS).toMatchObject({
      operatingRepairBays: 2,
      activeOrStagedVehiclesOnRepairFloor: 2,
      vehiclesPerRepairBay: 1,
      separateInspectionZone: false,
      separateAuthorizationWaitZone: false,
      separateReadyZone: false,
      separateQcZone: false,
    });
  });

  it("uses Monday through Friday 9 AM to 6 PM Central as the staffed shop window", () => {
    expect(SHOP_RECON_OPERATING_CALENDAR).toMatchObject({
      timeZone: "America/Chicago",
      openMinute: 540,
      closeMinute: 1080,
      grossDailyMinutes: 540,
      grossWeeklyMinutes: 2700,
      outsideHoursWorkPermitted: false,
    });
    expect(isShopOpenAt(new Date("2026-08-03T14:00:00.000Z"))).toBe(true);
    expect(isShopOpenAt(new Date("2026-08-03T22:59:00.000Z"))).toBe(true);
    expect(isShopOpenAt(new Date("2026-08-03T23:00:00.000Z"))).toBe(false);
    expect(isShopOpenAt(new Date("2026-08-08T16:00:00.000Z"))).toBe(false);
  });

  it("records Brock as primary Shop/QC authority, Eli as Shop backup, and holds unresolved independence", () => {
    expect(SHOP_RECON_AUTHORITIES).toContainEqual({
      authority: "SHOP_OPERATIONS",
      primary: "Brock",
      backup: "Eli",
      status: "CONFIRMED",
    });
    expect(SHOP_RECON_AUTHORITIES).toContainEqual({
      authority: "QUALITY_CONTROL",
      primary: "Brock",
      backup: null,
      status: "PARTIALLY_CONFIRMED",
    });
    expect(getShopReconFoundation().unresolvedConfirmations).toContain("QC_INDEPENDENCE_WHEN_BROCK_PERFORMS_REPAIR");
  });

  it("records Walter Hernandez as the primary repair technician with Brock as the normal QC separation", () => {
    expect(SHOP_RECON_STAFFING).toContainEqual({
      name: "Walter Hernandez",
      role: "PRIMARY_TECHNICIAN",
      schedule: "SHOP_STANDARD",
      repairPerformer: true,
      qualityReviewer: false,
      roadTestPolicyEligible: true,
      systemIdentityStatus: "MAPPING_REQUIRED",
    });
    expect(SHOP_RECON_STAFFING.find(person => person.name === "Brock")?.qualityReviewer).toBe(true);
  });

  it("publishes a stable unique blocker catalog", () => {
    expect(SHOP_RECON_BLOCKERS).toHaveLength(25);
    expect(new Set(SHOP_RECON_BLOCKERS.map(([code]) => code))).toHaveLength(25);
    expect(SHOP_RECON_BLOCKERS.some(([code]) => code === "BLK-SCOPE-CHANGED")).toBe(true);
    expect(SHOP_RECON_BLOCKERS.some(([code]) => code === "BLK-QC-FAILED")).toBe(true);
  });

  it("validates Inventory-to-Shop and Shop-to-Inventory draft envelopes without executing a handoff", () => {
    const inbound = validateInventoryToShopHandoffDraft({
      inventoryUnitId: "unit-1",
      vehicleId: "vehicle-1",
      inventoryWorkflowVersion: 3,
      correlationId: "correlation-1",
      custodyLocation: "main lot",
      inspectionVersion: 2,
      reconPlanVersion: 1,
      authorizedAmountCents: 150_000,
      authorizedJobs: ["brakes"],
      frontlineTargetAt: "2026-08-06T23:00:00.000Z",
      inventoryOwner: "Brock",
      shopReceiver: "Brock",
    });
    expect(inbound).toMatchObject({ valid: true, missingFields: [] });

    const outbound = validateShopToInventoryHandoffDraft({ inventoryUnitId: "unit-1" });
    expect(outbound.valid).toBe(false);
    expect(outbound.missingFields).toContain("repairOrderId");
    expect(outbound.missingFields).toContain("qualityEvidence");
  });
});
