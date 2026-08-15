export const UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_COMMAND = "CRM_CUSTOMER_TASK_BRIDGE_CREATE" as const;
export const UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_CONTRACT_VERSION = "ucrm.customer-task-bridge/v1" as const;
export const UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_ERROR_CONTRACT_VERSION = "ucrm.customer-task-bridge-error/v1" as const;

export type UnifiedCrmCustomerTaskBridgeCommandInput = {
  brief: string;
  dueAt: string;
  idempotencyKey: string;
  title: string;
};

export type UnifiedCrmCustomerTaskBridgeCommandResult = {
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_CONTRACT_VERSION;
  customerId: string;
  duplicate: boolean;
  task: {
    dueAt: string;
    href: string;
    id: string;
    title: string;
  };
};

export type UnifiedCrmCustomerTaskBridgeFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_TASK_BRIDGE_NOT_AUTHORIZED"
  | "CUSTOMER_TASK_BRIDGE_OFF"
  | "CUSTOMER_NOT_AVAILABLE"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "INVALID_TASK_BRIDGE_COMMAND"
  | "IDEMPOTENCY_KEY_REUSED"
  | "TASK_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmCustomerTaskBridgeFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_TASK_BRIDGE_NOT_AUTHORIZED: 403,
  CUSTOMER_TASK_BRIDGE_OFF: 503,
  CUSTOMER_NOT_AVAILABLE: 404,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  INVALID_TASK_BRIDGE_COMMAND: 400,
  IDEMPOTENCY_KEY_REUSED: 409,
  TASK_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmCustomerTaskBridgeError extends Error {
  readonly code: UnifiedCrmCustomerTaskBridgeFailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomerTaskBridgeFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomerTaskBridgeError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE" || code === "TASK_SOURCE_UNAVAILABLE";
  }
}
