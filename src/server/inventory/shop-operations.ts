import type { InventoryDecision, InventoryRiskFlags, ShopWorkflowStage } from "./domain";
import { evaluateHardRule, isShopTransitionAllowed } from "./domain";
import { calculateCriticalRatio } from "./lifecycle";
import { clamp, stableFingerprint, weightedScore } from "./math";

export type ShopWorkOrigin = "CUSTOMER_REPAIR" | "INVENTORY_RECON";
export type VehicleWorkflowRoute = "RETAIL_INVENTORY" | "SHOP_CUSTOMER_REPAIR" | "SHOP_INVENTORY_RECON";

export function routeVehicleWorkflow(input: {
  dealershipOwned: boolean;
  intendedForRetailSale: boolean;
  repairOrDiagnosticWorkRequired: boolean;
}) {
  if (!input.dealershipOwned) {
    return {
      route: "SHOP_CUSTOMER_REPAIR" as VehicleWorkflowRoute,
      reasonCodes: ["WORKFLOW_CUSTOMER_OWNED_VEHICLE"]
    };
  }
  if (input.intendedForRetailSale && input.repairOrDiagnosticWorkRequired) {
    return {
      route: "SHOP_INVENTORY_RECON" as VehicleWorkflowRoute,
      reasonCodes: ["WORKFLOW_DEALERSHIP_STOCK_RECON_REQUIRED"]
    };
  }
  return {
    route: "RETAIL_INVENTORY" as VehicleWorkflowRoute,
    reasonCodes: ["WORKFLOW_DEALERSHIP_STOCK_RETAIL_LIFECYCLE"]
  };
}

export function evaluateShopTransition(input: {
  approvalAccepted: boolean;
  currentStage: ShopWorkflowStage;
  diagnosticEvidenceComplete: boolean;
  nextStage: ShopWorkflowStage;
  partsReady: boolean;
  qcPassed: boolean;
  riskFlags?: InventoryRiskFlags;
}) {
  const reasonCodes: string[] = [];
  const hardRuleCode = evaluateHardRule(input.riskFlags ?? {});
  if (!isShopTransitionAllowed(input.currentStage, input.nextStage)) reasonCodes.push("SHOP_TRANSITION_NOT_ALLOWED");
  if (input.nextStage === "ESTIMATE_PREPARATION" && !input.diagnosticEvidenceComplete) reasonCodes.push("SHOP_DIAGNOSTIC_EVIDENCE_REQUIRED");
  if (["PARTS_ORDERING", "READY_FOR_REPAIR", "REPAIRS"].includes(input.nextStage) && !input.approvalAccepted) reasonCodes.push("SHOP_APPROVAL_REQUIRED");
  if (input.nextStage === "REPAIRS" && !input.partsReady) reasonCodes.push("SHOP_PARTS_NOT_READY");
  if (input.nextStage === "DELIVERY_OR_INVENTORY_HANDOFF" && !input.qcPassed) reasonCodes.push("SHOP_QC_NOT_PASSED");
  if (hardRuleCode) reasonCodes.unshift(`HARD_${hardRuleCode}`);
  return { allowed: reasonCodes.length === 0, hardRuleCode, reasonCodes };
}

export function scoreShopWorkPriority(input: {
  customerCommitment: number;
  estimatedWorkRemainingHours: number;
  evaluatedAt: Date;
  inventoryLifecycleAgePressure: number;
  origin: ShopWorkOrigin;
  partsReadiness: number;
  requiredCompletionAt: Date;
  revenueRelease: number;
  riskFlags?: InventoryRiskFlags;
  safetyImpact: number;
  workOrderId: string;
}) : InventoryDecision<{ criticalRatio: number; origin: ShopWorkOrigin; recommendedAction: string }> {
  const timeRemainingHours = (input.requiredCompletionAt.getTime() - input.evaluatedAt.getTime()) / 3_600_000;
  const criticalRatio = calculateCriticalRatio(timeRemainingHours, input.estimatedWorkRemainingHours);
  const schedulePressure = clamp(1 - criticalRatio, 0, 1);
  const originPressure = input.origin === "INVENTORY_RECON" ? input.inventoryLifecycleAgePressure : input.customerCommitment;
  const score = weightedScore([
    { value: input.safetyImpact, weight: 25 },
    { value: schedulePressure, weight: 20 },
    { value: input.customerCommitment, weight: 15 },
    { value: input.revenueRelease, weight: 15 },
    { value: originPressure, weight: 15 },
    { value: input.partsReadiness, weight: 10 }
  ]);
  const hardRuleCode = evaluateHardRule(input.riskFlags ?? {});
  const eligible = input.partsReadiness > 0 || input.safetyImpact > 0;
  const recommendedAction = !eligible ? "RESOLVE_PARTS_OR_PREREQUISITES" : hardRuleCode || score >= 75 ? "PRIORITIZE_NOW" : score >= 50 ? "QUEUE_NEXT" : "STANDARD_QUEUE";
  const reasonCodes = [
    `SHOP_ORIGIN_${input.origin}`,
    ...(criticalRatio < 1 ? ["SHOP_SCHEDULE_AT_RISK"] : []),
    ...(input.partsReadiness <= 0 ? ["SHOP_PARTS_NOT_READY"] : []),
    ...(hardRuleCode ? [`HARD_${hardRuleCode}`] : [])
  ];

  return {
    algorithmVersion: "shop-work-priority/1.0.0",
    confidence: input.estimatedWorkRemainingHours > 0 ? "HIGH" : "LOW",
    decisionType: "SHOP_WORK_PRIORITY",
    eligible,
    evaluatedAt: input.evaluatedAt,
    explanation: `${input.origin === "INVENTORY_RECON" ? "Inventory recon" : "Customer repair"} work priority is ${score}/100 with a ${criticalRatio.toFixed(2)} critical ratio.`,
    hardRuleCode,
    inputFingerprint: stableFingerprint(input),
    managerReviewRequired: Boolean(hardRuleCode),
    missingInputs: input.estimatedWorkRemainingHours > 0 ? [] : ["estimatedWorkRemainingHours"],
    priority: hardRuleCode || score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : "NORMAL",
    reasonCodes,
    result: { criticalRatio, origin: input.origin, recommendedAction },
    score,
    subject: { id: input.workOrderId, type: "WORK_ORDER" }
  };
}

export function determineShopHandoff(origin: ShopWorkOrigin, qcPassed: boolean) {
  if (!qcPassed) {
    return { allowed: false, destination: "REPAIRS" as const, reasonCodes: ["SHOP_QC_NOT_PASSED"] };
  }
  return origin === "CUSTOMER_REPAIR"
    ? { allowed: true, destination: "CUSTOMER_DELIVERY" as const, reasonCodes: ["SHOP_HANDOFF_CUSTOMER_DELIVERY"] }
    : { allowed: true, destination: "INVENTORY_TITLE_OR_MERCHANDISING" as const, reasonCodes: ["SHOP_HANDOFF_INVENTORY_RECON_COMPLETE"] };
}

