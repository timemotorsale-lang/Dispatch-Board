export const UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_COMMAND = "CRM_OPPORTUNITY_TASK_BRIDGE_CREATE" as const;
export const UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_CONTRACT_VERSION = "ucrm.opportunity-task-bridge/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_ERROR_CONTRACT_VERSION = "ucrm.opportunity-task-bridge-error/v1" as const;

export type UnifiedCrmOpportunityTaskBridgeCommandInput = {
  brief: string;
  dueAt: string;
  expectedVersion: number;
  idempotencyKey: string;
  title: string;
};

export type UnifiedCrmOpportunityTaskBridgeCommandResult = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_CONTRACT_VERSION;
  duplicate: boolean;
  opportunityId: string;
  task: {
    dueAt: string;
    href: string;
    id: string;
    title: string;
  };
};

export type UnifiedCrmOpportunityTaskBridgeFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "OPPORTUNITY_TASK_BRIDGE_NOT_AUTHORIZED"
  | "OPPORTUNITY_TASK_BRIDGE_OFF"
  | "OPPORTUNITY_NOT_AVAILABLE"
  | "OPPORTUNITY_VERSION_CONFLICT"
  | "INVALID_TASK_BRIDGE_COMMAND"
  | "IDEMPOTENCY_KEY_REUSED"
  | "TASK_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmOpportunityTaskBridgeFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  OPPORTUNITY_TASK_BRIDGE_NOT_AUTHORIZED: 403,
  OPPORTUNITY_TASK_BRIDGE_OFF: 503,
  OPPORTUNITY_NOT_AVAILABLE: 404,
  OPPORTUNITY_VERSION_CONFLICT: 409,
  INVALID_TASK_BRIDGE_COMMAND: 400,
  IDEMPOTENCY_KEY_REUSED: 409,
  TASK_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmOpportunityTaskBridgeError extends Error {
  readonly code: UnifiedCrmOpportunityTaskBridgeFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmOpportunityTaskBridgeFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmOpportunityTaskBridgeError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "TASK_SOURCE_UNAVAILABLE";
  }
}
