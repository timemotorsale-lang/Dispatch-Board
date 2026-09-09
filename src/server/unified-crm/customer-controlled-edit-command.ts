export const UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_COMMAND = "UPDATE_CUSTOMER_CONTACT_CONTROLLED" as const;
export const UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_CONTRACT_VERSION = "ucrm.customer-controlled-edit/v1" as const;
export const UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_ERROR_CONTRACT_VERSION =
  "ucrm.customer-controlled-edit-error/v1" as const;

export type UnifiedCrmCustomerControlledEditInput = {
  address?: unknown;
  displayName?: unknown;
  email?: unknown;
  expectedVersion?: unknown;
  idempotencyKey?: unknown;
  phoneNumber?: unknown;
  preferredContactMethod?: unknown;
  reason?: unknown;
};

export type UnifiedCrmCustomerControlledEditCommand = {
  address?: string | null;
  displayName?: string;
  email?: string | null;
  expectedVersion: number;
  idempotencyKey: string;
  phoneNumber?: string | null;
  preferredContactMethod?: string | null;
  reason: string;
};

export type UnifiedCrmCustomerControlledEditResult = {
  changedFields: string[];
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_CONTRACT_VERSION;
  customerId: string;
  duplicate: boolean;
  version: number;
};

export type UnifiedCrmCustomerControlledEditFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_360_NOT_AUTHORIZED"
  | "CUSTOMER_360_OFF"
  | "CUSTOMER_NOT_AVAILABLE"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_CUSTOMER_EDIT_COMMAND"
  | "STALE_CUSTOMER_VERSION";

const FAILURE_STATUS: Record<UnifiedCrmCustomerControlledEditFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_360_NOT_AUTHORIZED: 403,
  CUSTOMER_360_OFF: 503,
  CUSTOMER_NOT_AVAILABLE: 404,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_CUSTOMER_EDIT_COMMAND: 400,
  STALE_CUSTOMER_VERSION: 409
};

export class UnifiedCrmCustomerControlledEditError extends Error {
  readonly code: UnifiedCrmCustomerControlledEditFailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomerControlledEditFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomerControlledEditError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE";
  }
}
