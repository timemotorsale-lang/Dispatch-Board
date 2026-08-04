import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopReconVehicleCard, type ShopReconLifecycleWorkspaceModel, type ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";
import { SHOP_RECON_STAGE_WORKSPACES } from "@/server/shop-recon/stage-workspace";

const item: ShopReconVehicleCardModel = {
  id: "ro-1", vehicleId: "vehicle-1", vin: "1TESTVIN000000001", repairOrderNumber: "RO-1001",
  workLane: "INVENTORY_RECON", workLaneLabel: "Inventory Recon", commitmentLabel: "Frontline target",
  authorizationPath: "Inventory approval", completionHandoff: "Return to Inventory lifecycle",
  inventoryLifecycleStage: "RECONDITIONING", shopLifecycleStage: "SAFETY_PRIORITY_TRIAGE",
  shopLifecycleLabel: "Safety and Priority Triage", shopLifecycleOrder: 4, shopZoneCode: "Z03_TRIAGE_INSPECTION",
  stageTargetBand: "WARNING", stageElapsedMinutes: 48, priorityScore: 25, priorityBand: "P3",
  priorityReasons: [{ code: "TARGET_WARNING", points: 15 }], operatingState: "ACTIVE",
  targetAt: "2026-08-04T18:00:00.000Z", nextAction: "Complete safety triage", blocker: null,
  owner: "Brock", location: "Main Shop", vehicle: "2024 Toyota RAV4", subject: "INV-1001",
  concern: "Inventory recon", technician: "Walter Hernandez", bay: null, waitingParts: false,
  approvalPending: false, qcPending: 0,
};

const lifecycleWorkspace: ShopReconLifecycleWorkspaceModel = {
  lifecycle: { version: 0, stage: "SAFETY_PRIORITY_TRIAGE", operatingState: "ACTIVE", stageStartedAt: "2026-08-03T14:00:00.000Z", zoneCode: "Z03_TRIAGE_INSPECTION", targetAt: "2026-08-04T18:00:00.000Z", nextAction: "Complete safety triage", blockerCodes: [], scopeVersion: 1, initialized: false, lastSavedAt: null, lastSavedByUserId: null, lastSavedByName: null },
  currentDraft: null, currentEvidence: null, history: [], overrides: [], scopeChanges: [], permissions: { canSave: true, canPublishEvidence: true, canComplete: true, canOverride: false, overrideAuthority: "General Manager" },
};

describe("Shop Recon unified vehicle-card design", () => {
  it("defines a checklist, evidence set and operational form for all sixteen stages", () => {
    expect(SHOP_RECON_STAGE_WORKSPACES).toHaveLength(16);
    expect(SHOP_RECON_STAGE_WORKSPACES.map(definition => definition.stage)).toEqual(SHOP_RECON_STAGES.map(stage => stage.code));
    for (const definition of SHOP_RECON_STAGE_WORKSPACES) {
      expect(definition.checklist.length).toBeGreaterThanOrEqual(3);
      expect(definition.evidence.length).toBeGreaterThanOrEqual(2);
      expect(definition.fields.length).toBeGreaterThanOrEqual(3);
      expect(definition.authority.length).toBeGreaterThan(3);
    }
  });

  it("renders the Inventory-style vehicle identity, green stage selector and governed controls", () => {
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={item} lifecycleWorkspace={lifecycleWorkspace} />);
    expect(html).toContain("Unified vehicle card for 2024 Toyota RAV4");
    expect(html).toContain("Current Shop Stage");
    expect(html).toContain("Viewing Stage 4 of 16");
    expect(html).toContain("Safety and Priority Triage");
    expect(html).toContain("Governed operational workspace");
    expect(html).toContain("Complete stage &amp; advance");
    expect(html).toContain("Save stage draft");
    expect(html).toContain("Publish operational evidence");
    expect(html).toContain("No governed stage events yet");
  });
});
