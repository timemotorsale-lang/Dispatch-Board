export const UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_CONTRACT_VERSION = "ucrm.opportunity-dispatch-bridge/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_ERROR_CONTRACT_VERSION = "ucrm.opportunity-dispatch-bridge-error/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_COMMAND = "CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINK" as const;

export type UnifiedCrmOpportunityDispatchTargetKind = "REPAIR_ORDER" | "REPAIR_JOB";

export type UnifiedCrmOpportunityDispatchBridgeCommandInput =
  | {
      expectedTargetVersion: number;
      expectedVersion: number;
      idempotencyKey: string;
      repairOrderId: string;
      targetKind: "REPAIR_ORDER";
    }
  | {
      expectedTargetVersion: number;
      expectedVersion: number;
      idempotencyKey: string;
      repairJobId: string;
      targetKind: "REPAIR_JOB";
    };

export type UnifiedCrmOpportunityDispatchBridgeCommandResult = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_CONTRACT_VERSION;
  duplicate: boolean;
  opportunityId: string;
  target: {
    href: string;
    repairJobId: string | null;
    repairJobNumber: string | null;
    repairOrderId: string;
    repairOrderNumber: string;
    targetKind: UnifiedCrmOpportunityDispatchTargetKind;
    title: string;
    version: number;
  };
};

export type UnifiedCrmOpportunityDispatchBridgeFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "DISPATCH_BRIDGE_NOT_AUTHORIZED"
  | "DISPATCH_BRIDGE_OFF"
  | "OPPORTUNITY_NOT_AVAILABLE"
  | "OPPORTUNITY_VERSION_CONFLICT"
  | "DISPATCH_TARGET_NOT_AVAILABLE"
  | "DISPATCH_TARGET_VERSION_CONFLICT"
  | "INVALID_DISPATCH_BRIDGE_COMMAND"
  | "IDEMPOTENCY_KEY_REUSED"
  | "DISPATCH_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmOpportunityDispatchBridgeFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  DISPATCH_BRIDGE_NOT_AUTHORIZED: 403,
  DISPATCH_BRIDGE_OFF: 503,
  OPPORTUNITY_NOT_AVAILABLE: 404,
  OPPORTUNITY_VERSION_CONFLICT: 409,
  DISPATCH_TARGET_NOT_AVAILABLE: 404,
  DISPATCH_TARGET_VERSION_CONFLICT: 409,
  INVALID_DISPATCH_BRIDGE_COMMAND: 400,
  IDEMPOTENCY_KEY_REUSED: 409,
  DISPATCH_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmOpportunityDispatchBridgeError extends Error {
  readonly code: UnifiedCrmOpportunityDispatchBridgeFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmOpportunityDispatchBridgeFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmOpportunityDispatchBridgeError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "DISPATCH_BRIDGE_OFF" || code === "DISPATCH_SOURCE_UNAVAILABLE";
  }
}
