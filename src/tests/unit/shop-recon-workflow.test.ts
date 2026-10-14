import { describe, expect, it } from "vitest";

import { deriveShopReconWorkflow, evaluateShopReconStageWip, evaluateShopReconTransition, scoreShopReconPriority, shopReconLaneIntelligence, SHOP_RECON_TRANSITIONS } from "@/server/shop-recon/workflow";

const base = {
  stage: "INTAKE",
  stageStartedAt: "2026-08-03T14:00:00.000Z",
  operatingState: "ACTIVE",
  stateReason: null,
  serviceVisit: { arrivedAt: "2026-08-03T14:00:00.000Z", keysReceivedCount: 1 },
  inspectionVersions: [],
  diagnosisVersions: [],
  estimateVersions: [],
  releaseAuthorization: null,
  repairJobs: [],
};

describe("Shop and Recon sixteen-stage workflow", () => {
  it("requires hard-gate evidence before a forward transition", () => {
    const blocked = evaluateShopReconTransition({ fromStage: "PARTS_RESOURCE_READINESS", toStage: "DISPATCH_WORK_STAGING", facts: { AUTHORIZATION_CURRENT: true, PARTS_READY: true } });
    expect(blocked.allowed).toBe(false);
    expect(blocked.missingFacts).toEqual(["TECHNICIAN_ELIGIBLE", "BAY_ELIGIBLE", "PROCEDURE_CURRENT"]);
    const allowed = evaluateShopReconTransition({ fromStage: "PARTS_RESOURCE_READINESS", toStage: "DISPATCH_WORK_STAGING", facts: { AUTHORIZATION_CURRENT: true, PARTS_READY: true, TECHNICIAN_ELIGIBLE: true, BAY_ELIGIBLE: true, PROCEDURE_CURRENT: true } });
    expect(allowed.allowed).toBe(true);
  });

  it("supports controlled changed-scope and QC rework loops", () => {
    expect(SHOP_RECON_TRANSITIONS.REPAIR_EXECUTION).toContain("FINDINGS_REPAIR_PLAN");
    expect(SHOP_RECON_TRANSITIONS.QUALITY_CONTROL_ROAD_TEST).toContain("REPAIR_EXECUTION");
  });

  it("requires a ready, attributable dispatch before repair execution", () => {
    const assigned = evaluateShopReconTransition({ fromStage: "DISPATCH_WORK_STAGING", toStage: "REPAIR_EXECUTION", facts: { DISPATCH_READY: true, DISPATCH_CONFIRMED: true, AUTHORIZATION_CURRENT: true } });
    expect(assigned.allowed).toBe(true);
    expect(evaluateShopReconTransition({ fromStage: "DISPATCH_WORK_STAGING", toStage: "REPAIR_EXECUTION", facts: { AUTHORIZATION_CURRENT: true } }).missingFacts).toEqual(["DISPATCH_READY", "DISPATCH_CONFIRMED"]);
  });

  it("requires execution evidence and technician sign-off before independent QC", () => {
    const blocked = evaluateShopReconTransition({ fromStage: "TECHNICIAN_COMPLETION", toStage: "QUALITY_CONTROL_ROAD_TEST", facts: { EXECUTION_COMPLETE: true, COMPLETION_EVIDENCE: true } });
    expect(blocked.allowed).toBe(false);
    expect(blocked.missingFacts).toEqual(["TECHNICIAN_SIGNOFF"]);
    const allowed = evaluateShopReconTransition({ fromStage: "TECHNICIAN_COMPLETION", toStage: "QUALITY_CONTROL_ROAD_TEST", facts: { EXECUTION_COMPLETE: true, COMPLETION_EVIDENCE: true, TECHNICIAN_SIGNOFF: true } });
    expect(allowed.allowed).toBe(true);
  });

  it("closes the terminal shop-exit stage only after QC, road test and handoff acceptance", () => {
    const blocked = evaluateShopReconTransition({ fromStage: "VEHICLE_HANDOVER_SHOP_EXIT", toStage: "VEHICLE_HANDOVER_SHOP_EXIT", facts: {} });
    expect(blocked.allowed).toBe(false);
    expect(blocked.missingFacts).toEqual(["RELEASE_READY"]);
    const allowed = evaluateShopReconTransition({ fromStage: "VEHICLE_HANDOVER_SHOP_EXIT", toStage: "VEHICLE_HANDOVER_SHOP_EXIT", facts: { RELEASE_READY: true } });
    expect(allowed.allowed).toBe(true);
  });

  it("derives early stages from custody and inspection evidence", () => {
    expect(deriveShopReconWorkflow({ ...base, serviceVisit: { ...base.serviceVisit, keysReceivedCount: 0 } }, new Date("2026-08-03T14:10:00.000Z")).stage).toBe("VEHICLE_INTAKE_CUSTODY");
    expect(deriveShopReconWorkflow(base, new Date("2026-08-03T14:10:00.000Z")).stage).toBe("SAFETY_MOBILITY_TRIAGE");
    expect(deriveShopReconWorkflow({ ...base, stage: "DIAGNOSIS", inspectionVersions: [{}], diagnosisVersions: [{}] }, new Date("2026-08-03T15:00:00.000Z")).stage).toBe("DIAGNOSIS");
  });

  it("derives readiness, execution, QC and handoff from authoritative repair facts", () => {
    expect(deriveShopReconWorkflow({ ...base, stage: "READY_FOR_REPAIR" }, new Date()).stage).toBe("DISPATCH_WORK_STAGING");
    expect(deriveShopReconWorkflow({ ...base, repairJobs: [{ status: "IN_PROGRESS", partDemands: [], dispatches: [{}] }] }, new Date()).stage).toBe("REPAIR_EXECUTION");
    expect(deriveShopReconWorkflow({ ...base, repairJobs: [{ status: "READY_FOR_QC", partDemands: [], dispatches: [{}] }] }, new Date()).stage).toBe("QUALITY_CONTROL_ROAD_TEST");
    expect(deriveShopReconWorkflow({ ...base, stage: "HANDOFF", releaseAuthorization: { id: "release-1" } }, new Date()).stage).toBe("VEHICLE_HANDOVER_SHOP_EXIT");
  });

  it("reports stage target bands without turning them into promises", () => {
    const workflow = deriveShopReconWorkflow({ ...base, serviceVisit: { ...base.serviceVisit, keysReceivedCount: 0 } }, new Date("2026-08-03T14:40:00.000Z"));
    expect(workflow.targetBand).toBe("BREACHED");
    expect(workflow.elapsedMinutes).toBe(40);
  });

  it("counts only published Monday-Friday 9-6 Central shop time", () => {
    const workflow = deriveShopReconWorkflow({ ...base, stageStartedAt: "2026-08-07T22:30:00.000Z", serviceVisit: { ...base.serviceVisit, keysReceivedCount: 0 } }, new Date("2026-08-10T14:30:00.000Z"));
    expect(workflow.elapsedMinutes).toBe(60);
  });

  it("calculates explainable work priority without making an automatic dispatch decision", () => {
    const priority = scoreShopReconPriority({ workLane: "INVENTORY_RECON", targetBand: "CRITICAL", operatingState: "BLOCKED", commitmentAtRisk: false, operationalTargetOverdue: false, waitingParts: false, approvalPending: false, unassigned: true, qcPending: 0 });
    expect(priority).toMatchObject({ score: 75, band: "P1" });
    expect(priority.reasons.map(reason => reason.code)).toEqual(["TARGET_CRITICAL", "OPERATING_BLOCKED", "READY_UNASSIGNED"]);
  });

  it("keeps ownership lane semantics separate from urgency", () => {
    expect(shopReconLaneIntelligence("INVENTORY_RECON")).toMatchObject({ workLaneLabel: "Inventory Recon", cardTone: "DARK_BLUE", commitmentLabel: "Frontline target" });
    expect(shopReconLaneIntelligence("CUSTOMER_REPAIR")).toMatchObject({ workLaneLabel: "Customer Vehicle", cardTone: "BRIGHT_BLUE", commitmentLabel: "Customer promise" });
    const customer = scoreShopReconPriority({ workLane: "CUSTOMER_REPAIR", targetBand: "ON_TRACK", operatingState: "ACTIVE", commitmentAtRisk: true, operationalTargetOverdue: false, waitingParts: false, approvalPending: true, unassigned: false, qcPending: 0 });
    expect(customer.reasons.map(reason => reason.code)).toEqual(["CUSTOMER_PROMISE_RISK", "CUSTOMER_AUTHORIZATION_PENDING"]);
  });

  it("flags controlled queue WIP breaches", () => {
    expect(evaluateShopReconStageWip("REPAIR_EXECUTION", 3)).toEqual({ limit: 2, breached: true, remaining: 0 });
    expect(evaluateShopReconStageWip("DIAGNOSIS", 4).limit).toBeNull();
  });
});
