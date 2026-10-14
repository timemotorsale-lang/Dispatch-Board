export const UNIFIED_CRM_CUSTOMER_NOTE_COMMAND = "LOG_CUSTOMER_NOTE" as const;
export const UNIFIED_CRM_CUSTOMER_NOTE_CONTRACT_VERSION = "ucrm.customer-note/v1" as const;
export const UNIFIED_CRM_CUSTOMER_NOTE_ERROR_CONTRACT_VERSION = "ucrm.customer-note-error/v1" as const;

export type UnifiedCrmCustomerNoteVisibility = "INTERNAL" | "RESTRICTED";

export type UnifiedCrmCustomerNoteCommandInput = {
  body?: unknown;
  idempotencyKey?: unknown;
  visibility?: unknown;
};

export type UnifiedCrmCustomerNoteCommand = {
  body: string;
  idempotencyKey: string;
  visibility: UnifiedCrmCustomerNoteVisibility;
};

export type UnifiedCrmCustomerNoteCommandResult = {
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_NOTE_CONTRACT_VERSION;
  customerId: string;
  duplicate: boolean;
  noteId: string;
  visibility: UnifiedCrmCustomerNoteVisibility;
  version: number;
};

export type UnifiedCrmCustomerNoteFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_360_NOT_AUTHORIZED"
  | "CUSTOMER_360_OFF"
  | "CUSTOMER_NOT_AVAILABLE"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_NOTE_COMMAND"
  | "RESTRICTED_NOTE_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmCustomerNoteFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_360_NOT_AUTHORIZED: 403,
  CUSTOMER_360_OFF: 503,
  CUSTOMER_NOT_AVAILABLE: 404,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_NOTE_COMMAND: 400,
  RESTRICTED_NOTE_NOT_AUTHORIZED: 403
};

export class UnifiedCrmCustomerNoteError extends Error {
  readonly code: UnifiedCrmCustomerNoteFailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_NOTE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomerNoteFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomerNoteError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE";
  }
}
