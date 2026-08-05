import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopReconVehicleCard, type ShopReconLifecycleWorkspaceModel, type ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";
import { SHOP_RECON_OPERATIONAL_WORKSPACES } from "@/server/shop-recon/operational-workspace";
import { SHOP_RECON_STAGE_WORKSPACES } from "@/server/shop-recon/stage-workspace";

const item: ShopReconVehicleCardModel = {
  id: "ro-1", vehicleId: "vehicle-1", vin: "1TESTVIN000000001", repairOrderNumber: "RO-1001",
  workLane: "INVENTORY_RECON", workLaneLabel: "Inventory Recon", commitmentLabel: "Frontline target",
  authorizationPath: "Inventory approval", completionHandoff: "Return to Inventory lifecycle",
  inventoryLifecycleStage: "RECONDITIONING", shopLifecycleStage: "SERVICE_RECON_JOB_INTAKE",
  shopLifecycleLabel: "Service / Recon Job Intake", shopLifecycleOrder: 1, shopZoneCode: "PRE_ARRIVAL_COORDINATION",
  stageTargetBand: "WARNING", stageElapsedMinutes: 48, priorityScore: 25, priorityBand: "P3",
  priorityReasons: [{ code: "TARGET_WARNING", points: 15 }], operatingState: "ACTIVE",
  targetAt: "2026-08-04T18:00:00.000Z", nextAction: "Complete controlled job intake", blocker: null,
  owner: "Brock", location: "Main Shop", vehicle: "2024 Toyota RAV4", subject: "INV-1001",
  concern: "Inventory recon", technician: "Walter Hernandez", bay: null, waitingParts: false,
  approvalPending: false, qcPending: 0, pilot: null,
};

const lifecycleWorkspace: ShopReconLifecycleWorkspaceModel = {
  lifecycle: { version: 0, stage: "SERVICE_RECON_JOB_INTAKE", operatingState: "ACTIVE", stageStartedAt: "2026-08-03T14:00:00.000Z", zoneCode: "PRE_ARRIVAL_COORDINATION", targetAt: "2026-08-04T18:00:00.000Z", nextAction: "Complete controlled job intake", blockerCodes: [], scopeVersion: 1, initialized: false, lastSavedAt: null, lastSavedByUserId: null, lastSavedByName: null },
  currentDraft: null, currentEvidence: null, history: [], overrides: [], scopeChanges: [], permissions: { currentUserName: "Brock", canSave: true, canPublishEvidence: true, canComplete: true, canOverride: false, overrideAuthority: "General Manager" },
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

  it("defines executable operations for the first four shop stages", () => {
    expect(SHOP_RECON_OPERATIONAL_WORKSPACES).toHaveLength(4);
    for (const definition of SHOP_RECON_OPERATIONAL_WORKSPACES) {
      expect(definition.actions.length).toBeGreaterThanOrEqual(5);
      for (const action of definition.actions) {
        expect(action.requiredFields.length).toBeGreaterThan(0);
        expect(action.owner.length).toBeGreaterThan(0);
        expect(action.evidence.length).toBeGreaterThan(0);
      }
      expect(Object.keys(definition.pilotValues).length).toBeGreaterThanOrEqual(3);
    }
    expect(SHOP_RECON_OPERATIONAL_WORKSPACES[0].tools?.map(tool => tool.label)).toEqual(["Open Intake Form", "Open Service Advisor"]);
  });

  it("renders the Inventory-style identity and active-stage operating workspace", () => {
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={item} lifecycleWorkspace={lifecycleWorkspace} />);
    expect(html).toContain("Unified vehicle card for 2024 Toyota RAV4");
    expect(html).toContain("Current Shop Stage");
    expect(html).toContain("Viewing Stage 1 of 16");
    expect(html).toContain("Service / Recon Job Intake");
    expect(html).toContain("Governed operational workspace");
    expect(html).toContain("Work to Perform");
    expect(html).toContain("Stage Activity");
    expect(html).toContain("Documents &amp; Evidence");
    expect(html).toContain("Stage Completion");
    expect(html).toContain("Perform the work here");
    expect(html).toContain("Open Intake Form");
    expect(html).toContain("Open Service Advisor");
    expect(html).toContain("Stage 1 Intake Summary");
    expect(html).toContain("Intake Form is the source of entry");
    expect(html).toContain("Correct in Intake Form");
    expect(html).toContain("Identify the work lane");
    expect(html).toContain("Find or create the vehicle record");
    expect(html).toContain("Capture concern or requested outcome");
    expect(html).toContain("Working as Brock");
    expect(html).toContain("No governed stage events yet");
  });
});
