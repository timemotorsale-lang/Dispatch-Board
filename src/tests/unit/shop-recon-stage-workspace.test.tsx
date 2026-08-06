import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopReconVehicleCard, type ShopReconLifecycleWorkspaceModel, type ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { ShopReconVehicleIntakeCustody } from "@/features/inventory/shop-recon-vehicle-intake-custody";
import { ShopReconScopeBuilder } from "@/features/inventory/shop-recon-scope-builder";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";
import { getShopReconOperationalWorkspace, SHOP_RECON_OPERATIONAL_WORKSPACES } from "@/server/shop-recon/operational-workspace";
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
    expect(getShopReconOperationalWorkspace("SERVICE_RECON_JOB_INTAKE", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Open Inventory Vehicle Card", "Open Inventory-to-Shop Handoff", "Open Prior Inspection / Photos", "Accept Shop Handoff"]);
    expect(getShopReconOperationalWorkspace("WORK_ORDER_CREATION", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Labor Guide"]);
    expect(getShopReconOperationalWorkspace("VEHICLE_INTAKE_CUSTODY", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Vehicle Intake & Custody"]);
  });

  it("renders the Inventory-style identity and active-stage operating workspace", () => {
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={item} lifecycleWorkspace={lifecycleWorkspace} />);
    expect(html).toContain("Unified vehicle card for 2024 Toyota RAV4");
    expect(html).toContain("Current Shop Stage");
    expect(html).toContain("Viewing Stage 1 of 16");
    expect(html).toContain("Service / Recon Job Intake");
    expect(html).toContain("Inventory-to-Shop Handoff Summary");
    expect(html).toContain("Inventory Lifecycle is the source of entry");
    expect(html).toContain("Vehicle Identity Intelligence");
    expect(html).toContain("Verify the vehicle before Stage 1 can be trusted");
    expect(html).toContain("Duplicate guard");
    expect(html).toContain("Verify inventory identity");
    expect(html).toContain("Verify prior inspection and photos");
    expect(html).toContain("Open Inventory Vehicle Card");
    expect(html).toContain("Open Inventory-to-Shop Handoff");
    expect(html).toContain("Correct in Inventory Handoff");
    expect(html).toContain("Source &amp; Return Path");
    expect(html).toContain("Pending Shop exit sync");
    expect(html).toContain("Governed operational workspace");
    expect(html).toContain("Work to Perform");
    expect(html).toContain("Stage Activity");
    expect(html).toContain("Documents &amp; Evidence");
    expect(html).toContain("Stage Completion");
    expect(html).toContain("Perform the work here");
    expect(html).toContain("Working as Brock");
    expect(html).toContain("No governed stage events yet");
  });

  it("renders Stage 2 with only the official Scope Builder link and unlock checklist", () => {
    const stageTwoItem = { ...item, shopLifecycleStage: "JOB_SCOPE_DEFINITION" as const, shopLifecycleLabel: "Job Scope Definition", shopLifecycleOrder: 2 };
    const stageTwoLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "JOB_SCOPE_DEFINITION" as const, nextAction: "Define the job scope" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageTwoItem} lifecycleWorkspace={stageTwoLifecycle} />);

    expect(html).toContain("Scope Builder");
    expect(html).toContain("Official Stage 2 Tool");
    expect(html).toContain("Open Scope Builder");
    expect(html).toContain("/vehicles/shop-recon/ro-1/scope-builder");
    expect(html).toContain("Reason selected");
    expect(html).toContain("Work area selected");
    expect(html).toContain("Allowed work defined");
    expect(html).toContain("Stop rule defined");
    expect(html).toContain("Risk check completed");
    expect(html).toContain("Approval owner named");
    expect(html).toContain("Scope reviewed and ready");
    expect(html).not.toContain("What is the shop allowed to do?");
  });

  it("renders the official Scope Builder form as the source of truth", () => {
    const html = renderToStaticMarkup(<ShopReconScopeBuilder item={item} lifecycleWorkspace={lifecycleWorkspace} returnTo="/vehicles/shop-recon/ro-1" />);

    expect(html).toContain("Define what the shop is allowed to do before Work Order.");
    expect(html).toContain("Vehicle:");
    expect(html).toContain("2024 Toyota RAV4");
    expect(html).toContain("Lane:");
    expect(html).toContain("Inventory Recon");
    expect(html).toContain("1. Why is the vehicle here?");
    expect(html).toContain("2. What area does it involve?");
    expect(html).toContain("3. What is the shop allowed to do?");
    expect(html).toContain("4. When must the technician stop?");
    expect(html).toContain("5. Risk check");
    expect(html).toContain("6. Approval owner");
    expect(html).toContain("Scope Summary");
    expect(html).toContain("Save Scope Draft");
    expect(html).toContain("Complete Scope Builder");
    expect(html).toContain("Stage 2 checklist cleared by this form");
  });

  it("renders Stage 3 with Labor Guide above the work-order checklist", () => {
    const stageThreeItem = { ...item, shopLifecycleStage: "WORK_ORDER_CREATION" as const, shopLifecycleLabel: "Work Order Creation", shopLifecycleOrder: 3 };
    const stageThreeLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "WORK_ORDER_CREATION" as const, nextAction: "Create the controlled work order" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageThreeItem} lifecycleWorkspace={stageThreeLifecycle} />);

    expect(html).toContain("Official Stage 3 Tool");
    expect(html).toContain("Labor Guide");
    expect(html).toContain("/diagnostics/labor-guide?repairOrderId=ro-1");
    expect(html).toContain("Scope Builder packet reviewed");
    expect(html).toContain("Work order type selected");
    expect(html).toContain("Labor operations created");
    expect(html).toContain("Parts/material needs identified");
    expect(html).toContain("Authorization/approval path attached");
    expect(html).toContain("Technician stop instructions recorded");
    expect(html).toContain("Work order ready for dispatch");
  });

  it("renders Stage 4 with Vehicle Intake & Custody above the custody checklist", () => {
    const stageFourItem = { ...item, shopLifecycleStage: "VEHICLE_INTAKE_CUSTODY" as const, shopLifecycleLabel: "Vehicle Intake & Custody", shopLifecycleOrder: 4 };
    const stageFourLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "VEHICLE_INTAKE_CUSTODY" as const, nextAction: "Accept physical custody" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageFourItem} lifecycleWorkspace={stageFourLifecycle} />);

    expect(html).toContain("Official Stage 4 Tool");
    expect(html).toContain("Vehicle Intake &amp; Custody");
    expect(html).toContain("/vehicles/shop-recon/ro-1/vehicle-intake-custody");
    expect(html).toContain("Vehicle identity matched");
    expect(html).toContain("Arrival condition recorded");
    expect(html).toContain("Keys counted and tagged");
    expect(html).toContain("Photos/evidence captured");
    expect(html).toContain("Physical location assigned");
    expect(html).toContain("Movement restriction noted");
    expect(html).toContain("Custody accepted");
  });

  it("renders the official Vehicle Intake & Custody form as the source of truth", () => {
    const stageFourLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "VEHICLE_INTAKE_CUSTODY" as const } };
    const html = renderToStaticMarkup(<ShopReconVehicleIntakeCustody item={item} lifecycleWorkspace={stageFourLifecycle} returnTo="/vehicles/shop-recon/ro-1" />);

    expect(html).toContain("Physical Check-In Form");
    expect(html).toContain("Match the vehicle");
    expect(html).toContain("Keys &amp; custody");
    expect(html).toContain("Arrival condition");
    expect(html).toContain("Physical location");
    expect(html).toContain("I confirm this exact vehicle is now under Shop custody.");
    expect(html).toContain("Stage 4 checklist");
    expect(html).toContain("Save Custody Draft");
    expect(html).toContain("Complete Vehicle Intake");
  });
});
