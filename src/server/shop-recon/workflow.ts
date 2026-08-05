import { shopStaffedMinutesBetween, SHOP_RECON_STAGES, SHOP_RECON_TARGETS, type ShopReconStageCode } from "./foundation";

export type ShopReconGateFact =
  | "JOB_INTAKE_COMPLETE" | "JOB_SCOPE_DEFINED" | "WORK_ORDER_CREATED" | "IDENTITY_MATCHED" | "CUSTODY_ACCEPTED" | "SAFETY_TRIAGED"
  | "INSPECTION_COMPLETE" | "DIAGNOSIS_COMPLETE" | "PLAN_CURRENT"
  | "AUTHORIZATION_CURRENT" | "PARTS_READY" | "TECHNICIAN_ELIGIBLE" | "BAY_ELIGIBLE"
  | "PROCEDURE_CURRENT" | "DISPATCH_READY" | "DISPATCH_CONFIRMED" | "EXECUTION_COMPLETE" | "COMPLETION_EVIDENCE" | "TECHNICIAN_SIGNOFF"
  | "QC_PASSED" | "ROAD_TEST_PASSED_OR_NOT_REQUIRED" | "RELEASE_READY" | "HANDOFF_ACCEPTED";

export const SHOP_RECON_REQUIRED_FACTS: Record<ShopReconStageCode, readonly ShopReconGateFact[]> = {
  SERVICE_RECON_JOB_INTAKE: [],
  JOB_SCOPE_DEFINITION: ["JOB_INTAKE_COMPLETE"],
  WORK_ORDER_CREATION: ["JOB_SCOPE_DEFINED"],
  VEHICLE_INTAKE_CUSTODY: ["WORK_ORDER_CREATED"],
  SAFETY_MOBILITY_TRIAGE: ["IDENTITY_MATCHED", "CUSTODY_ACCEPTED"],
  INSPECTION_CONCERN_VERIFICATION: ["SAFETY_TRIAGED"],
  DIAGNOSIS: ["INSPECTION_COMPLETE"],
  FINDINGS_REPAIR_PLAN: ["DIAGNOSIS_COMPLETE"],
  AUTHORIZATION: ["PLAN_CURRENT"],
  PARTS_RESOURCE_READINESS: ["AUTHORIZATION_CURRENT"],
  DISPATCH_WORK_STAGING: ["AUTHORIZATION_CURRENT", "PARTS_READY", "TECHNICIAN_ELIGIBLE", "BAY_ELIGIBLE", "PROCEDURE_CURRENT"],
  REPAIR_EXECUTION: ["DISPATCH_READY", "DISPATCH_CONFIRMED", "AUTHORIZATION_CURRENT"],
  TECHNICIAN_COMPLETION: ["EXECUTION_COMPLETE", "COMPLETION_EVIDENCE"],
  QUALITY_CONTROL_ROAD_TEST: ["EXECUTION_COMPLETE", "COMPLETION_EVIDENCE", "TECHNICIAN_SIGNOFF"],
  RELEASE_HANDOVER_READINESS: ["QC_PASSED", "ROAD_TEST_PASSED_OR_NOT_REQUIRED"],
  VEHICLE_HANDOVER_SHOP_EXIT: ["RELEASE_READY"],
};

const codeAt = (position: number) => SHOP_RECON_STAGES.find(stage => stage.order === position)?.code ?? null;

export const SHOP_RECON_TRANSITIONS: Record<ShopReconStageCode, readonly ShopReconStageCode[]> = Object.fromEntries(
  SHOP_RECON_STAGES.map(stage => {
    const next = codeAt(stage.order + 1);
    const loops: ShopReconStageCode[] = [];
    if (stage.order >= 7 && stage.order <= 9) loops.push("INSPECTION_CONCERN_VERIFICATION", "DIAGNOSIS");
    if (stage.order >= 10 && stage.order <= 15) loops.push("FINDINGS_REPAIR_PLAN", "AUTHORIZATION", "PARTS_RESOURCE_READINESS");
    if (stage.code === "QUALITY_CONTROL_ROAD_TEST") loops.push("REPAIR_EXECUTION");
    if (stage.code === "VEHICLE_HANDOVER_SHOP_EXIT") loops.push("VEHICLE_HANDOVER_SHOP_EXIT");
    return [stage.code, [...new Set([...(next ? [next] : []), ...loops])]];
  }),
) as unknown as Record<ShopReconStageCode, readonly ShopReconStageCode[]>;

export function evaluateShopReconTransition(input: {
  fromStage: ShopReconStageCode;
  toStage: ShopReconStageCode;
  facts: Partial<Record<ShopReconGateFact, boolean>>;
}) {
  const transitionAllowed = SHOP_RECON_TRANSITIONS[input.fromStage].includes(input.toStage);
  const missingFacts = SHOP_RECON_REQUIRED_FACTS[input.toStage].filter(fact => input.facts[fact] !== true);
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
    cardTone: "BRIGHT_BLUE",
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
    DISPATCH_WORK_STAGING: 2,
    REPAIR_EXECUTION: 2,
    TECHNICIAN_COMPLETION: 2,
    QUALITY_CONTROL_ROAD_TEST: 2,
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
  shopReconLifecycle?: { stage: ShopReconStageCode; operatingState: string; stageStartedAt: Date | string; zoneCode: string; blockerCodes: unknown } | null;
};

export const SHOP_RECON_ZONE_BY_STAGE: Record<ShopReconStageCode, string> = {
  SERVICE_RECON_JOB_INTAKE: "PRE_ARRIVAL_COORDINATION", JOB_SCOPE_DEFINITION: "PRE_ARRIVAL_COORDINATION", WORK_ORDER_CREATION: "PRE_ARRIVAL_COORDINATION",
  VEHICLE_INTAKE_CUSTODY: "Z02_CHECK_IN", SAFETY_MOBILITY_TRIAGE: "Z03_TRIAGE_INSPECTION", INSPECTION_CONCERN_VERIFICATION: "Z03_TRIAGE_INSPECTION",
  DIAGNOSIS: "Z04_DIAGNOSTIC", FINDINGS_REPAIR_PLAN: "Z05_CONTROLLED_WAIT", AUTHORIZATION: "Z05_CONTROLLED_WAIT",
  PARTS_RESOURCE_READINESS: "Z06_PARTS_KIT", DISPATCH_WORK_STAGING: "Z07_READY_QUEUE", REPAIR_EXECUTION: "Z08_REPAIR_BAY",
  TECHNICIAN_COMPLETION: "Z10_QC", QUALITY_CONTROL_ROAD_TEST: "Z10_QC", RELEASE_HANDOVER_READINESS: "Z11_OUTBOUND", VEHICLE_HANDOVER_SHOP_EXIT: "Z11_OUTBOUND",
};

export function deriveShopReconStage(orderRecord: OrderEvidence): ShopReconStageCode {
  if (["HANDOFF", "CLOSED"].includes(orderRecord.stage) || orderRecord.releaseAuthorization) return "VEHICLE_HANDOVER_SHOP_EXIT";
  if (orderRecord.stage === "ADVISOR_REVIEW") return "RELEASE_HANDOVER_READINESS";
  if (orderRecord.stage === "QUALITY_CONTROL" || orderRecord.repairJobs.some(job => ["READY_FOR_QC", "QC_PASSED"].includes(job.status))) return "QUALITY_CONTROL_ROAD_TEST";
  if (orderRecord.repairJobs.some(job => ["IN_PROGRESS", "PAUSED"].includes(job.status))) return "REPAIR_EXECUTION";
  if (orderRecord.repairJobs.some(job => job.status === "DISPATCHED")) return "DISPATCH_WORK_STAGING";
  if (orderRecord.stage === "READY_FOR_REPAIR") return "DISPATCH_WORK_STAGING";
  if (orderRecord.repairJobs.some(job => job.status === "WAITING_PARTS" || job.partDemands.some(part => part.quantityReserved < part.quantityRequired))) return "PARTS_RESOURCE_READINESS";
  const authorization = orderRecord.estimateVersions.flatMap(estimate => estimate.authorizations).find(item => ["ACCEPTED", "PARTIAL"].includes(item.disposition));
  if (authorization) return "PARTS_RESOURCE_READINESS";
  if (orderRecord.stage === "AUTHORIZATION" || orderRecord.estimateVersions.some(estimate => estimate.status === "PRESENTED")) return "AUTHORIZATION";
  if (orderRecord.stage === "ESTIMATE" || orderRecord.estimateVersions.length) return "FINDINGS_REPAIR_PLAN";
  if (orderRecord.diagnosisVersions?.length) return "DIAGNOSIS";
  if (orderRecord.stage === "DIAGNOSIS" || orderRecord.inspectionVersions?.length) return "INSPECTION_CONCERN_VERIFICATION";
  if (!orderRecord.serviceVisit.arrivedAt) return "SERVICE_RECON_JOB_INTAKE";
  if ((orderRecord.serviceVisit.keysReceivedCount ?? 0) < 1) return "VEHICLE_INTAKE_CUSTODY";
  return "SAFETY_MOBILITY_TRIAGE";
}

export function deriveShopReconWorkflow(orderRecord: OrderEvidence, now: Date) {
  const persisted = orderRecord.shopReconLifecycle, stage = persisted?.stage ?? deriveShopReconStage(orderRecord);
  const definition = SHOP_RECON_STAGES.find(item => item.code === stage)!;
  const targetMinutes = SHOP_RECON_TARGETS.stageMinutes[stage];
  const startedAt = new Date(persisted?.stageStartedAt ?? orderRecord.stageStartedAt ?? orderRecord.serviceVisit.arrivedAt ?? now);
  const elapsedMinutes = shopStaffedMinutesBetween(startedAt, now);
  const ratio = targetMinutes ? elapsedMinutes / targetMinutes : null;
  const targetBand: ShopReconTargetBand = ratio === null ? "VARIABLE" : ratio >= 1.5 ? "CRITICAL" : ratio >= 1 ? "BREACHED" : ratio >= .75 ? "WARNING" : "ON_TRACK";
  const nextStage = codeAt(definition.order + 1);
  return {
    stage,
    stageLabel: definition.label,
    stageOrder: definition.order,
    nextStage,
    zoneCode: persisted?.zoneCode ?? SHOP_RECON_ZONE_BY_STAGE[stage],
    targetMinutes,
    elapsedMinutes,
    targetBand,
    operatingState: persisted?.operatingState ?? orderRecord.operatingState,
    blockerCodes: persisted && Array.isArray(persisted.blockerCodes) ? persisted.blockerCodes.filter((item): item is string => typeof item === "string") : orderRecord.stateReason ? [orderRecord.stateReason] : [],
  };
}
