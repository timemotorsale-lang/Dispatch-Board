export const VEHICLE_LIFECYCLE_STAGES = [
  "ACQUISITION_OPPORTUNITY",
  "APPRAISAL",
  "APPROVAL_MAX_BID",
  "PURCHASED_OR_TRADE_IN",
  "TRANSPORTATION",
  "RECEIVED",
  "INSPECTION",
  "RECONDITIONING",
  "TITLE_DOCUMENT_READINESS",
  "PHOTOGRAPHY_MERCHANDISING",
  "FRONTLINE_READY",
  "RESERVED_DEAL_PENDING",
  "SOLD",
  "DELIVERED",
  "WHOLESALED_OR_OTHER_DISPOSITION"
] as const;

export const PART_LIFECYCLE_STAGES = [
  "DEMAND_IDENTIFIED",
  "PART_SOURCED",
  "VENDOR_COMPARISON",
  "APPROVAL",
  "PURCHASE_ORDER",
  "ORDERED",
  "RECEIVED",
  "INSPECTED",
  "BINNED",
  "RESERVED_FOR_REPAIR_ORDER",
  "ISSUED_TO_TECHNICIAN",
  "INSTALLED",
  "RETURNED_CORE_OR_WARRANTY_CLAIM",
  "RECONCILED",
  "CANCELLED"
] as const;

export const SHOP_WORKFLOW_STAGES = [
  "VEHICLE_INTAKE",
  "DIAGNOSTIC",
  "ESTIMATE_PREPARATION",
  "APPROVAL",
  "PARTS_ORDERING",
  "READY_FOR_REPAIR",
  "REPAIRS",
  "QUALITY_CONTROL",
  "DELIVERY_OR_INVENTORY_HANDOFF",
  "COMPLETED",
  "CANCELLED"
] as const;

export type VehicleLifecycleStage = (typeof VEHICLE_LIFECYCLE_STAGES)[number];
export type PartLifecycleStage = (typeof PART_LIFECYCLE_STAGES)[number];
export type ShopWorkflowStage = (typeof SHOP_WORKFLOW_STAGES)[number];
export type InventoryLifecycleStage = VehicleLifecycleStage | PartLifecycleStage | ShopWorkflowStage;
export type InventorySubjectType = "VEHICLE" | "PART" | "PURCHASE_ORDER" | "REPAIR_ORDER" | "WORK_ORDER" | "LOCATION";
export type DecisionConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
export type DecisionPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export type InventoryDecision<T> = {
  algorithmVersion: string;
  confidence: DecisionConfidence;
  decisionType: string;
  eligible: boolean;
  evaluatedAt: Date;
  explanation: string;
  hardRuleCode: string | null;
  inputFingerprint: string;
  managerReviewRequired: boolean;
  missingInputs: string[];
  priority: DecisionPriority;
  reasonCodes: string[];
  result: T;
  score: number | null;
  subject: { id: string; type: InventorySubjectType };
};

export type InventoryHardRule =
  | "SAFETY_STOP"
  | "TITLE_COMPLIANCE_STOP"
  | "CUSTOMER_DELIVERY_BLOCKED"
  | "CRITICAL_NO_OWNER"
  | "FINANCIAL_AUTHORIZATION_REQUIRED"
  | "INSUFFICIENT_APPRAISAL_EVIDENCE";

export type InventoryRiskFlags = {
  criticalCustomerDeliveryBlock?: boolean;
  criticalWorkHasNoOwner?: boolean;
  financialAuthorizationMissing?: boolean;
  safetyStop?: boolean;
  titleComplianceStop?: boolean;
};

export type LifecycleEvent<TStage extends string> = {
  actorId: string;
  correlationId: string;
  effectiveAt: Date;
  fromStage: TStage | null;
  source: "USER" | "SYSTEM" | "INTEGRATION";
  toStage: TStage;
};

export const VEHICLE_TRANSITIONS: Readonly<Record<VehicleLifecycleStage, readonly VehicleLifecycleStage[]>> = {
  ACQUISITION_OPPORTUNITY: ["APPRAISAL"],
  APPRAISAL: ["APPROVAL_MAX_BID", "WHOLESALED_OR_OTHER_DISPOSITION"],
  APPROVAL_MAX_BID: ["PURCHASED_OR_TRADE_IN", "WHOLESALED_OR_OTHER_DISPOSITION"],
  PURCHASED_OR_TRADE_IN: ["TRANSPORTATION", "RECEIVED"],
  TRANSPORTATION: ["RECEIVED"],
  RECEIVED: ["INSPECTION"],
  INSPECTION: ["RECONDITIONING", "TITLE_DOCUMENT_READINESS", "WHOLESALED_OR_OTHER_DISPOSITION"],
  RECONDITIONING: ["TITLE_DOCUMENT_READINESS", "PHOTOGRAPHY_MERCHANDISING", "WHOLESALED_OR_OTHER_DISPOSITION"],
  TITLE_DOCUMENT_READINESS: ["PHOTOGRAPHY_MERCHANDISING", "FRONTLINE_READY", "WHOLESALED_OR_OTHER_DISPOSITION"],
  PHOTOGRAPHY_MERCHANDISING: ["FRONTLINE_READY", "RECONDITIONING"],
  FRONTLINE_READY: ["RESERVED_DEAL_PENDING", "SOLD", "WHOLESALED_OR_OTHER_DISPOSITION", "RECONDITIONING"],
  RESERVED_DEAL_PENDING: ["SOLD", "FRONTLINE_READY"],
  SOLD: ["DELIVERED", "FRONTLINE_READY"],
  DELIVERED: [],
  WHOLESALED_OR_OTHER_DISPOSITION: []
};

export const PART_TRANSITIONS: Readonly<Record<PartLifecycleStage, readonly PartLifecycleStage[]>> = {
  DEMAND_IDENTIFIED: ["PART_SOURCED", "CANCELLED"],
  PART_SOURCED: ["VENDOR_COMPARISON", "APPROVAL", "CANCELLED"],
  VENDOR_COMPARISON: ["APPROVAL", "PURCHASE_ORDER", "CANCELLED"],
  APPROVAL: ["PURCHASE_ORDER", "CANCELLED"],
  PURCHASE_ORDER: ["ORDERED", "CANCELLED"],
  ORDERED: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["INSPECTED", "RETURNED_CORE_OR_WARRANTY_CLAIM"],
  INSPECTED: ["BINNED", "RETURNED_CORE_OR_WARRANTY_CLAIM"],
  BINNED: ["RESERVED_FOR_REPAIR_ORDER", "RETURNED_CORE_OR_WARRANTY_CLAIM"],
  RESERVED_FOR_REPAIR_ORDER: ["ISSUED_TO_TECHNICIAN", "BINNED"],
  ISSUED_TO_TECHNICIAN: ["INSTALLED", "BINNED", "RETURNED_CORE_OR_WARRANTY_CLAIM"],
  INSTALLED: ["RETURNED_CORE_OR_WARRANTY_CLAIM", "RECONCILED"],
  RETURNED_CORE_OR_WARRANTY_CLAIM: ["RECONCILED"],
  RECONCILED: [],
  CANCELLED: []
};

export const SHOP_TRANSITIONS: Readonly<Record<ShopWorkflowStage, readonly ShopWorkflowStage[]>> = {
  VEHICLE_INTAKE: ["DIAGNOSTIC", "CANCELLED"],
  DIAGNOSTIC: ["ESTIMATE_PREPARATION", "APPROVAL", "CANCELLED"],
  ESTIMATE_PREPARATION: ["APPROVAL", "CANCELLED"],
  APPROVAL: ["PARTS_ORDERING", "READY_FOR_REPAIR", "CANCELLED"],
  PARTS_ORDERING: ["READY_FOR_REPAIR", "CANCELLED"],
  READY_FOR_REPAIR: ["REPAIRS", "PARTS_ORDERING", "CANCELLED"],
  REPAIRS: ["QUALITY_CONTROL", "PARTS_ORDERING"],
  QUALITY_CONTROL: ["DELIVERY_OR_INVENTORY_HANDOFF", "REPAIRS"],
  DELIVERY_OR_INVENTORY_HANDOFF: ["COMPLETED", "REPAIRS"],
  COMPLETED: [],
  CANCELLED: []
};

export function evaluateHardRule(flags: InventoryRiskFlags): InventoryHardRule | null {
  if (flags.safetyStop) return "SAFETY_STOP";
  if (flags.titleComplianceStop) return "TITLE_COMPLIANCE_STOP";
  if (flags.criticalCustomerDeliveryBlock) return "CUSTOMER_DELIVERY_BLOCKED";
  if (flags.criticalWorkHasNoOwner) return "CRITICAL_NO_OWNER";
  if (flags.financialAuthorizationMissing) return "FINANCIAL_AUTHORIZATION_REQUIRED";
  return null;
}

export function isVehicleTransitionAllowed(from: VehicleLifecycleStage, to: VehicleLifecycleStage) {
  return VEHICLE_TRANSITIONS[from].includes(to);
}

export function isPartTransitionAllowed(from: PartLifecycleStage, to: PartLifecycleStage) {
  return PART_TRANSITIONS[from].includes(to);
}

export function isShopTransitionAllowed(from: ShopWorkflowStage, to: ShopWorkflowStage) {
  return SHOP_TRANSITIONS[from].includes(to);
}
