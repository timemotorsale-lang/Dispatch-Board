import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopReconVehicleCard, type ShopReconLifecycleWorkspaceModel, type ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { ShopReconInspectionConcernVerification } from "@/features/inventory/shop-recon-inspection-concern-verification";
import { ShopReconVehicleIntakeCustody } from "@/features/inventory/shop-recon-vehicle-intake-custody";
import { ShopReconSafetyMobilityTriage } from "@/features/inventory/shop-recon-safety-mobility-triage";
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

  it("defines executable operations for all sixteen shop stages", () => {
    expect(SHOP_RECON_OPERATIONAL_WORKSPACES).toHaveLength(16);
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
    expect(getShopReconOperationalWorkspace("SAFETY_MOBILITY_TRIAGE", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Safety & Mobility Triage"]);
    expect(getShopReconOperationalWorkspace("INSPECTION_CONCERN_VERIFICATION", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Inspection / Concern Verification"]);
    expect(getShopReconOperationalWorkspace("DIAGNOSIS", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Diagnostic Module"]);
    expect(getShopReconOperationalWorkspace("FINDINGS_REPAIR_PLAN", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Repair Workbench", "Labor Guide"]);
    expect(getShopReconOperationalWorkspace("AUTHORIZATION", "CUSTOMER_REPAIR")?.tools?.map(tool => tool.label)).toEqual(["Repair Workbench / Authorization", "Service Advisor / Approval Desk"]);
    expect(getShopReconOperationalWorkspace("AUTHORIZATION", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Repair Workbench / Authorization", "Inventory Lifecycle Authorization"]);
    expect(getShopReconOperationalWorkspace("PARTS_RESOURCE_READINESS", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Parts Ordering Form", "Repair Workbench"]);
    expect(getShopReconOperationalWorkspace("DISPATCH_WORK_STAGING", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Shop Dispatch / Assignment", "Repair Workbench"]);
    expect(getShopReconOperationalWorkspace("REPAIR_EXECUTION", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Technician Workspace / My Work", "Repair Workbench"]);
    expect(getShopReconOperationalWorkspace("TECHNICIAN_COMPLETION", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Technician Workspace / My Work", "Repair Workbench"]);
    expect(getShopReconOperationalWorkspace("QUALITY_CONTROL_ROAD_TEST", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Quality Control", "Repair Workbench"]);
    expect(getShopReconOperationalWorkspace("RELEASE_HANDOVER_READINESS", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Inventory Lifecycle Return", "Repair Workbench"]);
    expect(getShopReconOperationalWorkspace("VEHICLE_HANDOVER_SHOP_EXIT", "INVENTORY_RECON")?.tools?.map(tool => tool.label)).toEqual(["Inventory Lifecycle Return", "Vehicle 360"]);
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

  it("renders Stage 5 with Safety & Mobility Triage above the safety checklist", () => {
    const stageFiveItem = { ...item, shopLifecycleStage: "SAFETY_MOBILITY_TRIAGE" as const, shopLifecycleLabel: "Safety & Mobility Triage", shopLifecycleOrder: 5 };
    const stageFiveLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "SAFETY_MOBILITY_TRIAGE" as const, nextAction: "Triage safety and mobility" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageFiveItem} lifecycleWorkspace={stageFiveLifecycle} />);

    expect(html).toContain("Official Stage 5 Tool");
    expect(html).toContain("Safety &amp; Mobility Triage");
    expect(html).toContain("/vehicles/shop-recon/ro-1/safety-mobility-triage");
    expect(html).toContain("Immediate safety hazard screen completed");
    expect(html).toContain("Mobility status classified");
    expect(html).toContain("Road-test eligibility decided");
    expect(html).toContain("Shop movement restriction recorded");
    expect(html).toContain("Priority / risk level assigned");
    expect(html).toContain("Required containment action recorded");
    expect(html).toContain("Safety triage decision confirmed");
  });

  it("renders the official Safety & Mobility Triage form as the source of truth", () => {
    const stageFiveLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "SAFETY_MOBILITY_TRIAGE" as const } };
    const html = renderToStaticMarkup(<ShopReconSafetyMobilityTriage item={item} lifecycleWorkspace={stageFiveLifecycle} returnTo="/vehicles/shop-recon/ro-1" />);

    expect(html).toContain("Safety &amp; Mobility Triage Form");
    expect(html).toContain("Immediate hazard screen");
    expect(html).toContain("Mobility status");
    expect(html).toContain("Road-test eligibility");
    expect(html).toContain("Restriction &amp; containment");
    expect(html).toContain("Triage decision");
    expect(html).toContain("I confirm the safety and movement decision is clear for this vehicle.");
    expect(html).toContain("Stage 5 checklist");
    expect(html).toContain("Save Triage Draft");
    expect(html).toContain("Complete Safety Triage");
  });

  it("renders Stage 6 with Inspection & Concern Verification above the inspection checklist", () => {
    const stageSixItem = { ...item, shopLifecycleStage: "INSPECTION_CONCERN_VERIFICATION" as const, shopLifecycleLabel: "Inspection & Concern Verification", shopLifecycleOrder: 6 };
    const stageSixLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "INSPECTION_CONCERN_VERIFICATION" as const, nextAction: "Verify inspection and concern" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageSixItem} lifecycleWorkspace={stageSixLifecycle} />);

    expect(html).toContain("Official Stage 6 Tool");
    expect(html).toContain("Inspection / Concern Verification");
    expect(html).toContain("/vehicles/shop-recon/ro-1/inspection-concern-verification");
    expect(html).toContain("Scope and work order reviewed");
    expect(html).toContain("Vehicle identity and odometer confirmed");
    expect(html).toContain("Required inspection checklist completed");
    expect(html).toContain("Concern verified or outcome classified");
    expect(html).toContain("Measurements and observations recorded");
    expect(html).toContain("Photo / video / scan evidence attached");
    expect(html).toContain("Inspection result submitted for next decision");
  });

  it("renders the official Inspection & Concern Verification form as the source of truth", () => {
    const stageSixLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "INSPECTION_CONCERN_VERIFICATION" as const } };
    const html = renderToStaticMarkup(<ShopReconInspectionConcernVerification item={item} lifecycleWorkspace={stageSixLifecycle} returnTo="/vehicles/shop-recon/ro-1" />);

    expect(html).toContain("Inspection &amp; Concern Verification Form");
    expect(html).toContain("Scope control");
    expect(html).toContain("Vehicle verification");
    expect(html).toContain("Inspection checklist");
    expect(html).toContain("Concern outcome");
    expect(html).toContain("Inspection findings");
    expect(html).toContain("Measurements / observations");
    expect(html).toContain("I confirm the inspection result is complete and ready for the next decision.");
    expect(html).toContain("Stage 6 checklist");
    expect(html).toContain("Save Inspection Draft");
    expect(html).toContain("Complete Inspection");
  });

  it("renders Stage 7 with Diagnostic Module above the diagnosis checklist", () => {
    const stageSevenItem = { ...item, shopLifecycleStage: "DIAGNOSIS" as const, shopLifecycleLabel: "Diagnosis", shopLifecycleOrder: 7 };
    const stageSevenLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "DIAGNOSIS" as const, nextAction: "Complete evidence-backed diagnosis" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageSevenItem} lifecycleWorkspace={stageSevenLifecycle} />);

    expect(html).toContain("Official Stage 7 Tool");
    expect(html).toContain("Diagnostic Module");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("#diagnosis");
    expect(html).toContain("Stage 6 verified concern reviewed");
    expect(html).toContain("Diagnostic route selected");
    expect(html).toContain("Required diagnostic tests recorded");
    expect(html).toContain("Scan data / measurements attached");
    expect(html).toContain("Supported cause or uncertainty documented");
    expect(html).toContain("Recommended correction entered");
    expect(html).toContain("Diagnosis submitted for repair-plan decision");
  });

  it("renders Stage 8 with Repair Workbench and Labor Guide above the repair-plan checklist", () => {
    const stageEightItem = { ...item, shopLifecycleStage: "FINDINGS_REPAIR_PLAN" as const, shopLifecycleLabel: "Findings & Repair Plan", shopLifecycleOrder: 8 };
    const stageEightLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "FINDINGS_REPAIR_PLAN" as const, nextAction: "Build repair plan for authorization" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageEightItem} lifecycleWorkspace={stageEightLifecycle} />);

    expect(html).toContain("Official Stage 8 Tools");
    expect(html).toContain("Repair Workbench + Labor Guide");
    expect(html).toContain("Open Repair Workbench");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("#estimate");
    expect(html).toContain("Open Labor Guide");
    expect(html).toContain("/diagnostics/labor-guide?repairOrderId=ro-1");
    expect(html).toContain("Findings reviewed");
    expect(html).toContain("Work needed classified");
    expect(html).toContain("Repair plan created");
    expect(html).toContain("Cost / resource impact prepared");
    expect(html).toContain("Submitted for authorization");
  });

  it("renders Stage 9 with customer or inventory authorization tools above the authorization checklist", () => {
    const stageNineItem = { ...item, shopLifecycleStage: "AUTHORIZATION" as const, shopLifecycleLabel: "Authorization", shopLifecycleOrder: 9 };
    const stageNineLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "AUTHORIZATION" as const, nextAction: "Capture owner authorization" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageNineItem} lifecycleWorkspace={stageNineLifecycle} />);

    expect(html).toContain("Official Stage 9 Tools");
    expect(html).toContain("Repair Workbench + Inventory Lifecycle Authorization");
    expect(html).toContain("Open Repair Workbench / Authorization");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("#authorization");
    expect(html).toContain("Open Inventory Lifecycle Authorization");
    expect(html).toContain("/vehicles/vehicle-1/inventory-planning");
    expect(html).toContain("Current repair-plan version reviewed");
    expect(html).toContain("Approval authority confirmed");
    expect(html).toContain("Decision recorded");
    expect(html).toContain("Approved scope and amount captured");
    expect(html).toContain("Authorization submitted for readiness");
  });

  it("renders Stage 10 with the adopted Parts Ordering Form and Repair Workbench above the readiness checklist", () => {
    const stageTenItem = { ...item, shopLifecycleStage: "PARTS_RESOURCE_READINESS" as const, shopLifecycleLabel: "Parts & Resource Readiness", shopLifecycleOrder: 10 };
    const stageTenLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "PARTS_RESOURCE_READINESS" as const, nextAction: "Confirm parts and resources" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageTenItem} lifecycleWorkspace={stageTenLifecycle} />);

    expect(html).toContain("Official Stage 10 Tools");
    expect(html).toContain("Parts Ordering Form + Repair Workbench");
    expect(html).toContain("Open Parts Ordering Form");
    expect(html).toContain("/diagnostics/parts-ordering?repairOrderId=ro-1&amp;repairOrderNumber=RO-1001&amp;vehicle=2024+Toyota+RAV4");
    expect(html).toContain("Open Repair Workbench");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("Authorized repair plan reviewed");
    expect(html).toContain("Parts demand created or marked not required");
    expect(html).toContain("Parts availability / order status confirmed");
    expect(html).toContain("Resources and procedure needs confirmed");
    expect(html).toContain("Sublet / vendor need resolved");
    expect(html).toContain("Readiness decision submitted");
  });

  it("renders Stage 11 with Shop Dispatch and Repair Workbench above the dispatch checklist", () => {
    const stageElevenItem = { ...item, shopLifecycleStage: "DISPATCH_WORK_STAGING" as const, shopLifecycleLabel: "Dispatch & Work Staging", shopLifecycleOrder: 11 };
    const stageElevenLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "DISPATCH_WORK_STAGING" as const, nextAction: "Dispatch and stage work" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageElevenItem} lifecycleWorkspace={stageElevenLifecycle} />);

    expect(html).toContain("Official Stage 11 Tools");
    expect(html).toContain("Shop Dispatch + Repair Workbench");
    expect(html).toContain("Open Shop Dispatch / Assignment");
    expect(html).toContain("/vehicles/shop-dispatch?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("Open Repair Workbench");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("Authorization and readiness gates passed");
    expect(html).toContain("Technician eligibility confirmed");
    expect(html).toContain("Bay and time slot reserved");
    expect(html).toContain("Vehicle, keys, and parts staged");
    expect(html).toContain("Current repair instructions reviewed");
    expect(html).toContain("WIP limit / queue position confirmed");
    expect(html).toContain("Dispatch published");
  });

  it("renders Stage 12 with Technician Workspace and Repair Workbench above the repair execution checklist", () => {
    const stageTwelveItem = { ...item, shopLifecycleStage: "REPAIR_EXECUTION" as const, shopLifecycleLabel: "Repair Execution", shopLifecycleOrder: 12 };
    const stageTwelveLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "REPAIR_EXECUTION" as const, nextAction: "Perform authorized repair" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageTwelveItem} lifecycleWorkspace={stageTwelveLifecycle} />);

    expect(html).toContain("Official Stage 12 Tools");
    expect(html).toContain("Technician Workspace + Repair Workbench");
    expect(html).toContain("Open Technician Workspace / My Work");
    expect(html).toContain("/my-tasks");
    expect(html).toContain("Open Repair Workbench");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("#repair");
    expect(html).toContain("Dispatch accepted and work started");
    expect(html).toContain("Current authorized instructions reviewed");
    expect(html).toContain("Labor clock / event recorded");
    expect(html).toContain("Authorized repair work performed");
    expect(html).toContain("Parts/materials consumed recorded");
    expect(html).toContain("Repair evidence / measurements attached");
    expect(html).toContain("Changed scope stopped or no-change confirmed");
  });

  it("renders Stage 13 with technician completion tools above the sign-off checklist", () => {
    const stageThirteenItem = { ...item, shopLifecycleStage: "TECHNICIAN_COMPLETION" as const, shopLifecycleLabel: "Technician Completion", shopLifecycleOrder: 13 };
    const stageThirteenLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "TECHNICIAN_COMPLETION" as const, nextAction: "Complete technician sign-off" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageThirteenItem} lifecycleWorkspace={stageThirteenLifecycle} />);

    expect(html).toContain("Official Stage 13 Tools");
    expect(html).toContain("Technician Workspace + Repair Workbench");
    expect(html).toContain("Execution complete confirmed");
    expect(html).toContain("Completion evidence attached");
    expect(html).toContain("Labor closed / no running clock");
    expect(html).toContain("Correction and measurements documented");
    expect(html).toContain("Submitted for independent QC");
  });

  it("renders Stage 14 with Quality Control above the QC checklist", () => {
    const stageFourteenItem = { ...item, shopLifecycleStage: "QUALITY_CONTROL_ROAD_TEST" as const, shopLifecycleLabel: "Quality Control & Road Test", shopLifecycleOrder: 14 };
    const stageFourteenLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "QUALITY_CONTROL_ROAD_TEST" as const, nextAction: "Perform QC and road test" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageFourteenItem} lifecycleWorkspace={stageFourteenLifecycle} />);

    expect(html).toContain("Official Stage 14 Tools");
    expect(html).toContain("Quality Control + Repair Workbench");
    expect(html).toContain("Open Quality Control");
    expect(html).toContain("/vehicles/quality-control?repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("Repair evidence reviewed");
    expect(html).toContain("Independent QC performed");
    expect(html).toContain("Road test completed or marked not required");
    expect(html).toContain("QC disposition passed");
    expect(html).toContain("Rework loop controlled if failed");
  });

  it("renders Stage 15 with lane-aware release readiness tools above the checklist", () => {
    const stageFifteenItem = { ...item, shopLifecycleStage: "RELEASE_HANDOVER_READINESS" as const, shopLifecycleLabel: "Release & Handover Readiness", shopLifecycleOrder: 15 };
    const stageFifteenLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "RELEASE_HANDOVER_READINESS" as const, nextAction: "Prepare release" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageFifteenItem} lifecycleWorkspace={stageFifteenLifecycle} />);

    expect(html).toContain("Official Stage 15 Tools");
    expect(html).toContain("Inventory Lifecycle Return + Repair Workbench");
    expect(html).toContain("Open Inventory Lifecycle Return");
    expect(html).toContain("/vehicles/vehicle-1/inventory-planning");
    expect(html).toContain("QC and road-test pass confirmed");
    expect(html).toContain("Final scope and cost reconciled");
    expect(html).toContain("Keys and documents reconciled");
    expect(html).toContain("Destination and receiving party confirmed");
    expect(html).toContain("Release readiness submitted");
  });

  it("renders Stage 16 with lane-aware Shop exit tools above the handoff checklist", () => {
    const stageSixteenItem = { ...item, shopLifecycleStage: "VEHICLE_HANDOVER_SHOP_EXIT" as const, shopLifecycleLabel: "Vehicle Handover & Shop Exit", shopLifecycleOrder: 16 };
    const stageSixteenLifecycle = { ...lifecycleWorkspace, lifecycle: { ...lifecycleWorkspace.lifecycle, stage: "VEHICLE_HANDOVER_SHOP_EXIT" as const, nextAction: "Record Shop exit" } };
    const html = renderToStaticMarkup(<ShopReconVehicleCard item={stageSixteenItem} lifecycleWorkspace={stageSixteenLifecycle} />);

    expect(html).toContain("Official Stage 16 Tools");
    expect(html).toContain("Inventory Lifecycle Return + Vehicle 360");
    expect(html).toContain("Open Vehicle 360");
    expect(html).toContain("/vehicles/360/vehicle-1");
    expect(html).toContain("Release readiness verified");
    expect(html).toContain("Vehicle and keys transferred");
    expect(html).toContain("Receiving-party acceptance captured");
    expect(html).toContain("Final location and exit recorded");
    expect(html).toContain("Return path synced");
  });
});
