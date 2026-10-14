import type { AuthenticatedUser } from "@/server/auth/store";
import { isGeneralManager, isManager } from "@/server/policies/access";
import { INVENTORY_TEAM_FUNCTIONS } from "@/lib/inventory-team-functions";

export const VEHICLE_CAPABILITIES = [
  "VEHICLE_OPERATIONS_VIEW",
  "VEHICLE_IDENTITY_CREATE",
  "VEHICLE_COMMAND_EXECUTE",
  "VEHICLE_ROLLOUT_MANAGE",
  "VEHICLE_HEALTH_VIEW",
  "VEHICLE_CAPABILITY_MANAGE",
  "VEHICLE_DUPLICATE_RESOLVE",
  "INVENTORY_UNIT_VIEW",
  "INVENTORY_UNIT_MANAGE",
  "INVENTORY_INTAKE_EDIT",
  "INVENTORY_ACQUISITION_MANAGE",
  "INVENTORY_RECON_MANAGE",
  "INVENTORY_READINESS_VERIFY",
  "INVENTORY_PUBLISH_MANAGE",
  "INVENTORY_RELEASE_MANAGE",
  "INVENTORY_COST_VIEW",
  "INVENTORY_PRICING_MANAGE",
  "REPAIR_ORDER_VIEW",
  "REPAIR_ORDER_MANAGE",
  "PARTS_VIEW",
  "PARTS_MANAGE",
  "VEHICLE_EVIDENCE_VIEW",
  "VEHICLE_EVIDENCE_MANAGE",
  "VEHICLE_EVIDENCE_RESTRICTED_VIEW",
  "VEHICLE_DISCOVERY_VIEW",
  "WORK_KNOWLEDGE_VIEW",
  "WORK_KNOWLEDGE_MANAGE",
  "CUSTOMER_INTAKE_CREATE",
  "VEHICLE_OUTPUT_CREATE",
  "VEHICLE_OUTPUT_RESTRICTED",
  "CUSTOMER_LIFECYCLE_VIEW",
  "CUSTOMER_LIFECYCLE_MANAGE",
  "WARRANTY_VIEW",
  "WARRANTY_MANAGE",
  "COMMERCIAL_HANDOFF_VIEW",
  "COMMERCIAL_HANDOFF_MANAGE",
  "VEHICLE_PORTAL_MANAGE",
  "VEHICLE_POLICY_VIEW",
  "VEHICLE_POLICY_MANAGE",
  "VEHICLE_POLICY_APPROVE",
  "DIAGNOSTIC_CASE_VIEW",
  "DIAGNOSTIC_CASE_CREATE",
  "DIAGNOSTIC_CASE_ASSIGN",
  "DIAGNOSTIC_CASE_TRANSITION",
  "DIAGNOSTIC_EVIDENCE_VIEW",
  "DIAGNOSTIC_EVIDENCE_RECORD",
  "DIAGNOSTIC_EVIDENCE_LINK",
  "DIAGNOSTIC_TEST_DEFINITION_MANAGE",
  "DIAGNOSTIC_TEST_PLAN_MANAGE",
  "DIAGNOSTIC_TEST_EXECUTE",
  "DIAGNOSTIC_REASONING_EVALUATE",
  "DIAGNOSTIC_ADAPTIVE_TEST_EVALUATE",
  "DIAGNOSTIC_ADAPTIVE_TEST_OVERRIDE",
  "DIAGNOSTIC_CONCLUSION_PROPOSE",
  "DIAGNOSTIC_CONCLUSION_CONFIRM",
  "DIAGNOSTIC_HIGH_RISK_CONFIRM",
  "DIAGNOSTIC_CONCLUSION_REVIEW",
  "DIAGNOSTIC_REPAIR_HANDOFF_MANAGE",
  "DIAGNOSTIC_ESTIMATE_ADVISOR_REVIEW",
  "DIAGNOSTIC_VERIFICATION_MANAGE"
] as const;
export type VehicleCapability = (typeof VEHICLE_CAPABILITIES)[number];

export type VehicleCapabilityGrantRecord = {
  capability: string;
  constraints?: unknown;
  effect: "ALLOW" | "DENY";
  locationId: string | null;
  validFrom: Date;
  validTo: Date | null;
};

const RECON_OPERATOR_CAPABILITIES: readonly VehicleCapability[] = [
  "VEHICLE_OPERATIONS_VIEW",
  "VEHICLE_IDENTITY_CREATE",
  "INVENTORY_UNIT_VIEW",
  "INVENTORY_UNIT_MANAGE",
  "REPAIR_ORDER_VIEW",
  "REPAIR_ORDER_MANAGE",
  "PARTS_VIEW",
  "PARTS_MANAGE",
  "VEHICLE_EVIDENCE_VIEW",
  "VEHICLE_EVIDENCE_MANAGE",
  "VEHICLE_DISCOVERY_VIEW",
  "WORK_KNOWLEDGE_VIEW",
  "WORK_KNOWLEDGE_MANAGE",
  "CUSTOMER_INTAKE_CREATE"
];

const ROLE_DEFAULT_CAPABILITIES: Readonly<Record<string, readonly VehicleCapability[]>> = {
  "Inventory Manager": RECON_OPERATOR_CAPABILITIES,
  Mechanic: ["INVENTORY_UNIT_VIEW", "REPAIR_ORDER_VIEW", "VEHICLE_OPERATIONS_VIEW", "VEHICLE_IDENTITY_CREATE", "VEHICLE_EVIDENCE_VIEW", "DIAGNOSTIC_CASE_VIEW", "DIAGNOSTIC_CASE_CREATE", "DIAGNOSTIC_CASE_TRANSITION", "DIAGNOSTIC_EVIDENCE_VIEW", "DIAGNOSTIC_EVIDENCE_RECORD", "DIAGNOSTIC_EVIDENCE_LINK", "DIAGNOSTIC_TEST_PLAN_MANAGE", "DIAGNOSTIC_TEST_EXECUTE", "DIAGNOSTIC_REASONING_EVALUATE", "DIAGNOSTIC_ADAPTIVE_TEST_EVALUATE", "DIAGNOSTIC_ADAPTIVE_TEST_OVERRIDE", "DIAGNOSTIC_CONCLUSION_PROPOSE", "DIAGNOSTIC_REPAIR_HANDOFF_MANAGE", "DIAGNOSTIC_ESTIMATE_ADVISOR_REVIEW", "DIAGNOSTIC_VERIFICATION_MANAGE"],
  Parts: ["VEHICLE_OPERATIONS_VIEW", "REPAIR_ORDER_VIEW", "PARTS_VIEW", "PARTS_MANAGE"],
  "Parts Manager": ["VEHICLE_OPERATIONS_VIEW", "REPAIR_ORDER_VIEW", "PARTS_VIEW", "PARTS_MANAGE"],
  "Parts Specialist": ["VEHICLE_OPERATIONS_VIEW", "REPAIR_ORDER_VIEW", "PARTS_VIEW", "PARTS_MANAGE"],
  "Quality Control": ["VEHICLE_OPERATIONS_VIEW", "REPAIR_ORDER_VIEW", "REPAIR_ORDER_MANAGE", "VEHICLE_EVIDENCE_VIEW"],
  "Quality Inspector": ["VEHICLE_OPERATIONS_VIEW", "REPAIR_ORDER_VIEW", "REPAIR_ORDER_MANAGE", "VEHICLE_EVIDENCE_VIEW"],
  "Service Advisor": [...RECON_OPERATOR_CAPABILITIES, "DIAGNOSTIC_CASE_VIEW", "DIAGNOSTIC_ESTIMATE_ADVISOR_REVIEW"],
  "Operations Coordinator": ["VEHICLE_OPERATIONS_VIEW", "VEHICLE_IDENTITY_CREATE", "INVENTORY_UNIT_VIEW", "REPAIR_ORDER_VIEW", "PARTS_VIEW", "VEHICLE_EVIDENCE_VIEW", "VEHICLE_DISCOVERY_VIEW", "WORK_KNOWLEDGE_VIEW", "CUSTOMER_LIFECYCLE_VIEW", "CUSTOMER_INTAKE_CREATE"],
  "Front Desk Operations Coordinator": ["VEHICLE_OPERATIONS_VIEW", "VEHICLE_IDENTITY_CREATE", "INVENTORY_UNIT_VIEW", "REPAIR_ORDER_VIEW", "PARTS_VIEW", "VEHICLE_EVIDENCE_VIEW", "VEHICLE_DISCOVERY_VIEW", "WORK_KNOWLEDGE_VIEW", "CUSTOMER_LIFECYCLE_VIEW", "CUSTOMER_INTAKE_CREATE"],
  "Vehicle Operations Lead": RECON_OPERATOR_CAPABILITIES
};

const VEHICLE_OPERATIONS_LEAD_DEFAULT_CAPABILITIES = ROLE_DEFAULT_CAPABILITIES["Vehicle Operations Lead"];

function isEffectiveVehicleOperationsLead(actor: AuthenticatedUser) {
  return actor.roles.includes("Vehicle Operations Lead") ||
    (actor.roles.includes("Inventory Manager") && actor.roles.includes("Service Department Manager"));
}

function isEffectiveOperationsCoordinator(actor: AuthenticatedUser) {
  return actor.roles.includes("Operations Coordinator") ||
    actor.roles.includes("Front Desk Operations Coordinator") ||
    (actor.roles.includes("Office Manager") && actor.roles.includes("Marketing/Advertisement Manager"));
}

export function evaluateVehicleCapability(input: {
  actor: AuthenticatedUser | null;
  capability: VehicleCapability;
  grants?: VehicleCapabilityGrantRecord[];
  locationId: string | null;
  amountCents?: number | null;
  cumulativeRelatedAmountCents?: number | null;
  priorActorUserId?: string | null;
  requestedFields?: string[];
  resourceOwnerUserId?: string | null;
  now?: Date;
}) {
  if (!input.actor?.isActive) return { allowed: false, reason: "AUTHENTICATION_REQUIRED" } as const;
  const inventoryTask = ["INVENTORY_INTAKE_EDIT", "INVENTORY_ACQUISITION_MANAGE", "INVENTORY_RECON_MANAGE", "INVENTORY_READINESS_VERIFY", "INVENTORY_PUBLISH_MANAGE", "INVENTORY_RELEASE_MANAGE", "INVENTORY_COST_VIEW"].includes(input.capability);
  const legacyCapability = inventoryTask ? "INVENTORY_UNIT_MANAGE" : input.capability;
  const now = input.now ?? new Date();
  const scopedGrants = (input.grants ?? []).filter((grant) => {
    return (grant.capability === input.capability || (inventoryTask && grant.capability === legacyCapability)) &&
      !(grant.locationId && grant.locationId !== input.locationId) &&
      grant.validFrom <= now &&
      !(grant.validTo && grant.validTo < now);
  });
  const matching = scopedGrants.filter((grant) => {
    const constraints = grant.constraints && typeof grant.constraints === "object" && !Array.isArray(grant.constraints) ? grant.constraints as Record<string, unknown> : {};
    if (constraints.ownResourcesOnly === true && input.resourceOwnerUserId !== input.actor?.id) return false;
    if (typeof constraints.maxAmountCents === "number" && typeof input.amountCents === "number" && input.amountCents > constraints.maxAmountCents) return false;
    if (typeof constraints.maxCumulativeAmountCents === "number" && typeof input.cumulativeRelatedAmountCents === "number" && input.cumulativeRelatedAmountCents > constraints.maxCumulativeAmountCents) return false;
    if (constraints.requiresIndependentApproval === true && input.priorActorUserId === input.actor?.id) return false;
    const fieldAllowlist = Array.isArray(constraints.fieldAllowlist) ? constraints.fieldAllowlist.filter((field): field is string => typeof field === "string") : [];
    if (fieldAllowlist.length && input.requestedFields?.some(field => !fieldAllowlist.includes(field))) return false;
    return true;
  });
  if (matching.some((grant) => grant.effect === "DENY")) return { allowed: false, reason: "EXPLICIT_DENY" } as const;
  if (scopedGrants.some((grant) => grant.effect === "ALLOW") && !matching.some((grant) => grant.effect === "ALLOW")) {
    return { allowed: false, reason: "GRANT_CONSTRAINTS_NOT_MET" } as const;
  }
  if (["DIAGNOSTIC_CONCLUSION_CONFIRM", "DIAGNOSTIC_HIGH_RISK_CONFIRM", "DIAGNOSTIC_CONCLUSION_REVIEW"].includes(input.capability)) return matching.some((grant) => grant.effect === "ALLOW") ? { allowed: true, reason: "EXPLICIT_GRANT" } as const : { allowed: false, reason: "EXPLICIT_TECHNICAL_GRANT_REQUIRED" } as const;
  if (isGeneralManager(input.actor)) return { allowed: true, reason: "GENERAL_MANAGER" } as const;
  if (input.capability === "VEHICLE_ROLLOUT_MANAGE" || input.capability === "VEHICLE_CAPABILITY_MANAGE" || input.capability === "VEHICLE_DUPLICATE_RESOLVE" || input.capability === "VEHICLE_EVIDENCE_RESTRICTED_VIEW" || input.capability === "VEHICLE_OUTPUT_RESTRICTED" || input.capability === "VEHICLE_PORTAL_MANAGE" || input.capability === "VEHICLE_POLICY_APPROVE") {
    return matching.some((grant) => grant.effect === "ALLOW")
      ? { allowed: true, reason: "EXPLICIT_GRANT" } as const
      : { allowed: false, reason: "GENERAL_MANAGER_OR_GRANT_REQUIRED" } as const;
  }
  if (isManager(input.actor)) return { allowed: true, reason: "MANAGER_DEFAULT" } as const;
  if (input.actor.roles.some((role) => ROLE_DEFAULT_CAPABILITIES[role]?.includes(legacyCapability))) {
    return { allowed: true, reason: "ROLE_DEFAULT" } as const;
  }
  if (
    isEffectiveVehicleOperationsLead(input.actor) &&
    VEHICLE_OPERATIONS_LEAD_DEFAULT_CAPABILITIES.includes(legacyCapability)
  ) {
    return { allowed: true, reason: "VEHICLE_OPERATIONS_LEAD_DEFAULT" } as const;
  }
  if (
    isEffectiveOperationsCoordinator(input.actor) &&
    ROLE_DEFAULT_CAPABILITIES["Operations Coordinator"].includes(legacyCapability)
  ) {
    return { allowed: true, reason: "OPERATIONS_COORDINATOR_DEFAULT" } as const;
  }
  const duties = input.actor.duties.all;
  const assignedFunctions = INVENTORY_TEAM_FUNCTIONS.filter(item => duties.includes(item.name));
  const inventoryView = ["INVENTORY_UNIT_VIEW", "VEHICLE_OPERATIONS_VIEW", "VEHICLE_EVIDENCE_VIEW", "REPAIR_ORDER_VIEW", "PARTS_VIEW"].includes(input.capability);
  const acquisition = duties.includes("Manage inventory acquisition");
  const recon = duties.includes("Execute inventory recon");
  const assigned = assignedFunctions.some(item => item.capability === input.capability) ||
    (inventoryView && assignedFunctions.length > 0) ||
    (input.capability === "INVENTORY_INTAKE_EDIT" && (acquisition || duties.includes("Edit acquisition intake"))) ||
    (input.capability === "INVENTORY_PRICING_MANAGE" && duties.includes("Edit inventory pricing")) ||
    (input.capability === "INVENTORY_COST_VIEW" && (acquisition || recon || duties.includes("Edit inventory pricing"))) ||
    (input.capability === "VEHICLE_IDENTITY_CREATE" && acquisition) ||
    (["REPAIR_ORDER_MANAGE", "PARTS_MANAGE", "VEHICLE_EVIDENCE_MANAGE"].includes(input.capability) && recon);
  if (assigned) return { allowed: true, reason: "ASSIGNED_TEAM_FUNCTION" } as const;
  return matching.some((grant) => grant.effect === "ALLOW")
    ? { allowed: true, reason: "EXPLICIT_GRANT" } as const
    : { allowed: false, reason: "CAPABILITY_REQUIRED" } as const;
}

export function assertVehicleCapability(input: Parameters<typeof evaluateVehicleCapability>[0]) {
  const decision = evaluateVehicleCapability(input);
  if (!decision.allowed) throw new Error(`Vehicle capability required: ${input.capability} (${decision.reason}).`);
  return decision;
}
