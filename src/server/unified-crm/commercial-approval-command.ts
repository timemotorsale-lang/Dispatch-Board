export const UNIFIED_CRM_COMMERCIAL_APPROVAL_REQUEST_COMMAND = "REQUEST_COMMERCIAL_APPROVAL" as const;
export const UNIFIED_CRM_COMMERCIAL_APPROVAL_DECISION_COMMAND = "DECIDE_COMMERCIAL_APPROVAL" as const;
export const UNIFIED_CRM_COMMERCIAL_APPROVAL_CONTRACT_VERSION = "ucrm.commercial-approval/v1" as const;
export const UNIFIED_CRM_COMMERCIAL_APPROVAL_ERROR_CONTRACT_VERSION = "ucrm.commercial-approval-error/v1" as const;

export type UnifiedCrmCommercialApprovalDecision = "APPROVED" | "RETURNED" | "DENIED";
export type UnifiedCrmCommercialApprovalStatus = "PENDING" | UnifiedCrmCommercialApprovalDecision;

export type UnifiedCrmCommercialApprovalRequestInput = {
  amountCents?: unknown;
  discountCents?: unknown;
  expectedQuoteVersion?: unknown;
  idempotencyKey?: unknown;
  purpose?: unknown;
  reason?: unknown;
};

export type UnifiedCrmCommercialApprovalDecisionInput = {
  decision?: unknown;
  expectedVersion?: unknown;
  idempotencyKey?: unknown;
  reason?: unknown;
};

export type UnifiedCrmCommercialApprovalResult = {
  amountCents: number;
  contractVersion: typeof UNIFIED_CRM_COMMERCIAL_APPROVAL_CONTRACT_VERSION;
  decision: UnifiedCrmCommercialApprovalDecision | null;
  discountCents: number;
  duplicate: boolean;
  purpose: string;
  quoteId: string;
  quoteNumber: string;
  quoteVersionNumber: number;
  requestId: string;
  requestedByUserId: string;
  status: UnifiedCrmCommercialApprovalStatus;
  version: number;
};

export type UnifiedCrmCommercialApprovalFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "COMMERCIAL_APPROVAL_OFF"
  | "COMMERCIAL_APPROVAL_SOURCE_UNAVAILABLE"
  | "COMMERCIAL_APPROVAL_VERSION_CONFLICT"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_COMMERCIAL_APPROVAL_COMMAND"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE"
  | "QUOTE_NOT_AVAILABLE"
  | "REQUEST_NOT_AVAILABLE"
  | "REQUEST_NOT_PENDING"
  | "SELF_APPROVAL_NOT_ALLOWED"
  | "UNAUTHORIZED_COMMERCIAL_APPROVAL";

const FAILURE_STATUS: Record<UnifiedCrmCommercialApprovalFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  COMMERCIAL_APPROVAL_OFF: 503,
  COMMERCIAL_APPROVAL_SOURCE_UNAVAILABLE: 503,
  COMMERCIAL_APPROVAL_VERSION_CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_COMMERCIAL_APPROVAL_COMMAND: 400,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403,
  QUOTE_NOT_AVAILABLE: 404,
  REQUEST_NOT_AVAILABLE: 404,
  REQUEST_NOT_PENDING: 409,
  SELF_APPROVAL_NOT_ALLOWED: 409,
  UNAUTHORIZED_COMMERCIAL_APPROVAL: 403
};

export class UnifiedCrmCommercialApprovalError extends Error {
  readonly code: UnifiedCrmCommercialApprovalFailureCode;
  readonly contractVersion = UNIFIED_CRM_COMMERCIAL_APPROVAL_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCommercialApprovalFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCommercialApprovalError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "COMMERCIAL_APPROVAL_OFF" || code === "COMMERCIAL_APPROVAL_SOURCE_UNAVAILABLE";
  }
}

export function statusForUnifiedCrmCommercialApprovalError(code: string | undefined) {
  return code && code in FAILURE_STATUS ? FAILURE_STATUS[code as UnifiedCrmCommercialApprovalFailureCode] : 500;
}
