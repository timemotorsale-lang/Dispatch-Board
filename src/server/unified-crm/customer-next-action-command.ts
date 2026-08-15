export const UNIFIED_CRM_CUSTOMER_NEXT_ACTION_COMMAND = "SET_CUSTOMER_NEXT_ACTION" as const;
export const UNIFIED_CRM_CUSTOMER_NEXT_ACTION_CONTRACT_VERSION = "ucrm.customer-next-action/v1" as const;
export const UNIFIED_CRM_CUSTOMER_NEXT_ACTION_ERROR_CONTRACT_VERSION = "ucrm.customer-next-action-error/v1" as const;

export type UnifiedCrmCustomerNextActionOperation = "SET" | "COMPLETE";

export type UnifiedCrmCustomerNextActionCommandInput = {
  dueAt?: unknown;
  expectedCurrentNextActionAt?: unknown;
  idempotencyKey?: unknown;
  note?: unknown;
  operation?: unknown;
};

export type UnifiedCrmCustomerNextActionCommand = {
  dueAt: Date | null;
  expectedCurrentNextActionAt: Date | null;
  idempotencyKey: string;
  note: string | null;
  operation: UnifiedCrmCustomerNextActionOperation;
};

export type UnifiedCrmCustomerNextActionCommandResult = {
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_NEXT_ACTION_CONTRACT_VERSION;
  customerId: string;
  duplicate: boolean;
  nextActionAt: string | null;
  operation: UnifiedCrmCustomerNextActionOperation;
  version: number;
};

export type UnifiedCrmCustomerNextActionFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_360_NOT_AUTHORIZED"
  | "CUSTOMER_360_OFF"
  | "CUSTOMER_NOT_AVAILABLE"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "CUSTOMER_OWNER_REQUIRED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_NEXT_ACTION_COMMAND"
  | "NO_ACTIVE_NEXT_ACTION"
  | "STALE_NEXT_ACTION";

const FAILURE_STATUS: Record<UnifiedCrmCustomerNextActionFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_360_NOT_AUTHORIZED: 403,
  CUSTOMER_360_OFF: 503,
  CUSTOMER_NOT_AVAILABLE: 404,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  CUSTOMER_OWNER_REQUIRED: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_NEXT_ACTION_COMMAND: 400,
  NO_ACTIVE_NEXT_ACTION: 409,
  STALE_NEXT_ACTION: 409
};

export class UnifiedCrmCustomerNextActionError extends Error {
  readonly code: UnifiedCrmCustomerNextActionFailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_NEXT_ACTION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomerNextActionFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomerNextActionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE";
  }
}
