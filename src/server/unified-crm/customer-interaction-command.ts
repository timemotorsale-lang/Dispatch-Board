export const UNIFIED_CRM_CUSTOMER_INTERACTION_COMMAND = "LOG_CUSTOMER_INTERACTION" as const;
export const UNIFIED_CRM_CUSTOMER_INTERACTION_CONTRACT_VERSION = "ucrm.customer-interaction/v1" as const;
export const UNIFIED_CRM_CUSTOMER_INTERACTION_ERROR_CONTRACT_VERSION = "ucrm.customer-interaction-error/v1" as const;

export type UnifiedCrmCustomerInteractionChannel = "PHONE" | "TEXT" | "EMAIL" | "MEETING" | "VISIT";
export type UnifiedCrmCustomerInteractionDirection = "INBOUND" | "OUTBOUND";
export type UnifiedCrmCustomerInteractionConsentState = "NOT_REQUIRED" | "CONFIRMED" | "UNKNOWN";

export type UnifiedCrmCustomerInteractionCommandInput = {
  channel?: unknown;
  consentState?: unknown;
  direction?: unknown;
  idempotencyKey?: unknown;
  nextActionAt?: unknown;
  nextStep?: unknown;
  occurredAt?: unknown;
  outcome?: unknown;
  summary?: unknown;
};

export type UnifiedCrmCustomerInteractionCommand = {
  channel: UnifiedCrmCustomerInteractionChannel;
  consentState: UnifiedCrmCustomerInteractionConsentState;
  direction: UnifiedCrmCustomerInteractionDirection;
  idempotencyKey: string;
  nextActionAt: Date | null;
  nextStep: string | null;
  occurredAt: Date;
  outcome: string | null;
  summary: string;
};

export type UnifiedCrmCustomerInteractionCommandResult = {
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_INTERACTION_CONTRACT_VERSION;
  customerId: string;
  duplicate: boolean;
  interactionId: string;
  occurredAt: string;
  nextActionAt: string | null;
  version: number;
};

export type UnifiedCrmCustomerInteractionFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_360_NOT_AUTHORIZED"
  | "CUSTOMER_360_OFF"
  | "CUSTOMER_NOT_AVAILABLE"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_INTERACTION_COMMAND"
  | "OUTBOUND_CONSENT_REQUIRED";

const FAILURE_STATUS: Record<UnifiedCrmCustomerInteractionFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_360_NOT_AUTHORIZED: 403,
  CUSTOMER_360_OFF: 503,
  CUSTOMER_NOT_AVAILABLE: 404,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_INTERACTION_COMMAND: 400,
  OUTBOUND_CONSENT_REQUIRED: 409
};

export class UnifiedCrmCustomerInteractionError extends Error {
  readonly code: UnifiedCrmCustomerInteractionFailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_INTERACTION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomerInteractionFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomerInteractionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE";
  }
}
