import { shopStaffedMinutesBetween, SHOP_RECON_STAGES, SHOP_RECON_TARGETS, type ShopReconStageCode } from "./foundation";

export type ShopReconGateFact =
  | "IDENTITY_MATCHED" | "CUSTODY_ACCEPTED" | "LANE_CONFIRMED" | "SAFETY_TRIAGED"
  | "INSPECTION_COMPLETE" | "DIAGNOSIS_COMPLETE" | "FINDINGS_VERIFIED" | "PLAN_CURRENT"
  | "AUTHORIZATION_CURRENT" | "PARTS_READY" | "TECHNICIAN_ELIGIBLE" | "BAY_ELIGIBLE"
  | "PROCEDURE_CURRENT" | "DISPATCH_CONFIRMED" | "EXECUTION_COMPLETE" | "COMPLETION_EVIDENCE"
  | "QC_PASSED" | "ROAD_TEST_PASSED_OR_NOT_REQUIRED" | "HANDOFF_ACCEPTED";

const requiredFacts: Record<ShopReconStageCode, readonly ShopReconGateFact[]> = {
  SHOP_ENTRY: [],
  CUSTODY_CHECK_IN: ["IDENTITY_MATCHED"],
  LANE_SCOPE_CONFIRMATION: ["IDENTITY_MATCHED", "CUSTODY_ACCEPTED"],
  SAFETY_PRIORITY_TRIAGE: ["LANE_CONFIRMED", "CUSTODY_ACCEPTED"],
  INSPECTION: ["SAFETY_TRIAGED"],
  DIAGNOSIS: ["INSPECTION_COMPLETE"],
  FINDINGS_VERIFICATION: ["DIAGNOSIS_COMPLETE"],
  REPAIR_PLAN_ESTIMATE: ["FINDINGS_VERIFIED"],
  AUTHORIZATION_APPROVAL: ["PLAN_CURRENT"],
  PARTS_RESOURCE_READINESS: ["AUTHORIZATION_CURRENT"],
  READY_FOR_DISPATCH: ["AUTHORIZATION_CURRENT", "PARTS_READY", "TECHNICIAN_ELIGIBLE", "BAY_ELIGIBLE", "PROCEDURE_CURRENT"],
  ASSIGNED_STAGED: ["DISPATCH_CONFIRMED"],
  REPAIR_EXECUTION: ["DISPATCH_CONFIRMED", "AUTHORIZATION_CURRENT"],
  TECHNICIAN_COMPLETE: ["EXECUTION_COMPLETE", "COMPLETION_EVIDENCE"],
  QC_RELEASE_READINESS: ["EXECUTION_COMPLETE", "COMPLETION_EVIDENCE"],
  HANDOFF_SHOP_EXIT: ["QC_PASSED", "ROAD_TEST_PASSED_OR_NOT_REQUIRED", "HANDOFF_ACCEPTED"],
};

const codeAt = (position: number) => SHOP_RECON_STAGES.find(stage => stage.order === position)?.code ?? null;

export const SHOP_RECON_TRANSITIONS: Record<ShopReconStageCode, readonly ShopReconStageCode[]> = Object.fromEntries(
  SHOP_RECON_STAGES.map(stage => {
    const next = codeAt(stage.order + 1);
    const loops: ShopReconStageCode[] = [];
    if (stage.order >= 6 && stage.order <= 9) loops.push("INSPECTION", "DIAGNOSIS");
    if (stage.order >= 10 && stage.order <= 15) loops.push("REPAIR_PLAN_ESTIMATE", "AUTHORIZATION_APPROVAL", "PARTS_RESOURCE_READINESS");
    if (stage.code === "QC_RELEASE_READINESS") loops.push("REPAIR_EXECUTION");
    return [stage.code, [...new Set([...(next ? [next] : []), ...loops])]];
  }),
) as unknown as Record<ShopReconStageCode, readonly ShopReconStageCode[]>;

export function evaluateShopReconTransition(input: {
  fromStage: ShopReconStageCode;
  toStage: ShopReconStageCode;
  facts: Partial<Record<ShopReconGateFact, boolean>>;
}) {
  const transitionAllowed = SHOP_RECON_TRANSITIONS[input.fromStage].includes(input.toStage);
  const missingFacts = requiredFacts[input.toStage].filter(fact => input.facts[fact] !== true);
  return {
    allowed: transitionAllowed && missingFacts.length === 0,
    transitionAllowed,
    missingFacts,
    blockerCodes: [
      ...(!transitionAllowed ? ["BLK-WORKFLOW-TRANSITION_INVALID"] : []),
      ...missingFacts.map(fact => `BLK-GATE-${fact}`),
    ],
  };
}

export type ShopReconTargetBand = "ON_TRACK" | "WARNING" | "BREACHED" | "CRITICAL" | "VARIABLE";

export type ShopReconWorkLane = "INVENTORY_RECON" | "CUSTOMER_REPAIR";

export function shopReconLaneIntelligence(origin: string) {
  if (origin === "INVENTORY_RECON") return {
    workLane: "INVENTORY_RECON" as const,
    workLaneLabel: "Inventory Recon",
    cardTone: "DARK_BLUE",
    commitmentLabel: "Frontline target",
    authorizationPath: "Inventory approval",
    completionHandoff: "Return to Inventory lifecycle",
  };
  return {
    workLane: "CUSTOMER_REPAIR" as const,
    workLaneLabel: "Customer Vehicle",
    cardTone: "SLATE_GRAY",
    commitmentLabel: "Customer promise",
    authorizationPath: "Customer/advisor authorization",
    completionHandoff: "Advisor/customer handoff",
  };
}

export function scoreShopReconPriority(input: {
  workLane: ShopReconWorkLane;
  targetBand: ShopReconTargetBand;
  operatingState: string;
  commitmentAtRisk: boolean;
  operationalTargetOverdue: boolean;
  waitingParts: boolean;
  approvalPending: boolean;
  unassigned: boolean;
  qcPending: number;
}) {
  const reasons: Array<{ code: string; points: number }> = [];
  const add = (code: string, points: number, applies: boolean) => { if (applies) reasons.push({ code, points }); };
  add("TARGET_CRITICAL", 40, input.targetBand === "CRITICAL");
  add("TARGET_BREACHED", 30, input.targetBand === "BREACHED");
  add("TARGET_WARNING", 15, input.targetBand === "WARNING");
  add("OPERATING_BLOCKED", 25, input.operatingState === "BLOCKED");
  add("OPERATING_WAITING", 10, input.operatingState === "WAITING");
  add("CUSTOMER_PROMISE_RISK", 20, input.workLane === "CUSTOMER_REPAIR" && input.commitmentAtRisk);
  add("INVENTORY_FRONTLINE_TARGET_RISK", 15, input.workLane === "INVENTORY_RECON" && input.commitmentAtRisk);
  add("CUSTOMER_INTERNAL_TARGET_OVERDUE", 15, input.workLane === "CUSTOMER_REPAIR" && input.operationalTargetOverdue);
  add("QC_QUEUE", 15, input.qcPending > 0);
  add("READY_UNASSIGNED", 10, input.unassigned);
  add(input.workLane === "CUSTOMER_REPAIR" ? "CUSTOMER_AUTHORIZATION_PENDING" : "INVENTORY_APPROVAL_PENDING", 8, input.approvalPending);
  add("PARTS_CONSTRAINT", input.workLane === "CUSTOMER_REPAIR" ? 8 : 5, input.waitingParts);
  const score = reasons.reduce((sum, reason) => sum + reason.points, 0);
  return { score, band: score >= 50 ? "P1" : score >= 30 ? "P2" : score >= 15 ? "P3" : "P4", reasons } as const;
}

export function shopReconStageWipLimit(stage: ShopReconStageCode) {
  const limits: Partial<Record<ShopReconStageCode, number>> = {
    READY_FOR_DISPATCH: 2,
    ASSIGNED_STAGED: 2,
    REPAIR_EXECUTION: 2,
    TECHNICIAN_COMPLETE: 2,
    QC_RELEASE_READINESS: 2,
  };
  return limits[stage] ?? null;
}

export function evaluateShopReconStageWip(stage: ShopReconStageCode, count: number) {
  const limit = shopReconStageWipLimit(stage);
  return { limit, breached: limit !== null && count > limit, remaining: limit === null ? null : Math.max(0, limit - count) };
}

type OrderEvidence = {
  stage: string;
  operatingState: string;
  stateReason: string | null;
  stageStartedAt?: Date | string;
  serviceVisit: { arrivedAt?: Date | string; keysReceivedCount?: number };
  inspectionVersions?: unknown[];
  diagnosisVersions?: unknown[];
  estimateVersions: Array<{ status: string; authorizations: Array<{ disposition: string }> }>;
  releaseAuthorization: { id: string } | null;
  repairJobs: Array<{ status: string; partDemands: Array<{ quantityRequired: number; quantityReserved: number }>; dispatches: unknown[] }>;
};

const zoneByStage: Record<ShopReconStageCode, string> = {
  SHOP_ENTRY: "Z01_INBOUND", CUSTODY_CHECK_IN: "Z02_CHECK_IN", LANE_SCOPE_CONFIRMATION: "Z02_CHECK_IN",
  SAFETY_PRIORITY_TRIAGE: "Z03_TRIAGE_INSPECTION", INSPECTION: "Z03_TRIAGE_INSPECTION", DIAGNOSIS: "Z04_DIAGNOSTIC",
  FINDINGS_VERIFICATION: "Z04_DIAGNOSTIC", REPAIR_PLAN_ESTIMATE: "Z05_CONTROLLED_WAIT", AUTHORIZATION_APPROVAL: "Z05_CONTROLLED_WAIT",
  PARTS_RESOURCE_READINESS: "Z05_CONTROLLED_WAIT", READY_FOR_DISPATCH: "Z07_READY_QUEUE", ASSIGNED_STAGED: "Z07_READY_QUEUE",
  REPAIR_EXECUTION: "Z08_REPAIR_BAY", TECHNICIAN_COMPLETE: "Z10_QC", QC_RELEASE_READINESS: "Z10_QC", HANDOFF_SHOP_EXIT: "Z11_OUTBOUND",
};

export function deriveShopReconStage(orderRecord: OrderEvidence): ShopReconStageCode {
  if (["HANDOFF", "CLOSED"].includes(orderRecord.stage) || orderRecord.releaseAuthorization) return "HANDOFF_SHOP_EXIT";
  if (orderRecord.stage === "ADVISOR_REVIEW") return "QC_RELEASE_READINESS";
  if (orderRecord.stage === "QUALITY_CONTROL" || orderRecord.repairJobs.some(job => ["READY_FOR_QC", "QC_PASSED"].includes(job.status))) return "QC_RELEASE_READINESS";
  if (orderRecord.repairJobs.some(job => ["IN_PROGRESS", "PAUSED"].includes(job.status))) return "REPAIR_EXECUTION";
  if (orderRecord.repairJobs.some(job => job.status === "DISPATCHED")) return "ASSIGNED_STAGED";
  if (orderRecord.stage === "READY_FOR_REPAIR") return "READY_FOR_DISPATCH";
  if (orderRecord.repairJobs.some(job => job.status === "WAITING_PARTS" || job.partDemands.some(part => part.quantityReserved < part.quantityRequired))) return "PARTS_RESOURCE_READINESS";
  const authorization = orderRecord.estimateVersions.flatMap(estimate => estimate.authorizations).find(item => ["ACCEPTED", "PARTIAL"].includes(item.disposition));
  if (authorization) return "PARTS_RESOURCE_READINESS";
  if (orderRecord.stage === "AUTHORIZATION" || orderRecord.estimateVersions.some(estimate => estimate.status === "PRESENTED")) return "AUTHORIZATION_APPROVAL";
  if (orderRecord.stage === "ESTIMATE" || orderRecord.estimateVersions.length) return "REPAIR_PLAN_ESTIMATE";
  if (orderRecord.diagnosisVersions?.length) return "FINDINGS_VERIFICATION";
  if (orderRecord.stage === "DIAGNOSIS" || orderRecord.inspectionVersions?.length) return "DIAGNOSIS";
  if ((orderRecord.serviceVisit.keysReceivedCount ?? 0) < 1) return "CUSTODY_CHECK_IN";
  return "SAFETY_PRIORITY_TRIAGE";
}

export function deriveShopReconWorkflow(orderRecord: OrderEvidence, now: Date) {
  const stage = deriveShopReconStage(orderRecord);
  const definition = SHOP_RECON_STAGES.find(item => item.code === stage)!;
  const targetMinutes = SHOP_RECON_TARGETS.stageMinutes[stage];
  const startedAt = new Date(orderRecord.stageStartedAt ?? orderRecord.serviceVisit.arrivedAt ?? now);
  const elapsedMinutes = shopStaffedMinutesBetween(startedAt, now);
  const ratio = targetMinutes ? elapsedMinutes / targetMinutes : null;
  const targetBand: ShopReconTargetBand = ratio === null ? "VARIABLE" : ratio >= 1.5 ? "CRITICAL" : ratio >= 1 ? "BREACHED" : ratio >= .75 ? "WARNING" : "ON_TRACK";
  const nextStage = codeAt(definition.order + 1);
  return {
    stage,
    stageLabel: definition.label,
    stageOrder: definition.order,
    nextStage,
    zoneCode: zoneByStage[stage],
    targetMinutes,
    elapsedMinutes,
    targetBand,
    operatingState: orderRecord.operatingState,
    blockerCodes: orderRecord.stateReason ? [orderRecord.stateReason] : [],
  };
}
