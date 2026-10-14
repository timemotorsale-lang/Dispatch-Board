export const UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_CONTRACT_VERSION = "ucrm.quote-operational-handoff/v1" as const;
export const UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION = "ucrm.quote-operational-handoff-error/v1" as const;

export type UnifiedCrmQuoteOperationalHandoffModel = {
  approval: {
    amountCents: number;
    approvedVersion: number;
    discountCents: number;
    requestId: string;
    status: "APPROVED";
  };
  blockedEffects: readonly {
    effect: "MARK_SOLD" | "MARK_DELIVERED" | "CREATE_INVOICE" | "COMPLETE_DISPATCH";
    reason: string;
  }[];
  contractVersion: typeof UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_CONTRACT_VERSION;
  generatedAt: string;
  handoff: {
    customerLabel: string;
    opportunityNumber: string | null;
    quoteId: string;
    quoteNumber: string;
    quoteVersionNumber: number;
    reviewHref: string;
  };
  state: "PREPARED_HELD";
};

export type UnifiedCrmQuoteOperationalHandoffFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "HANDOFF_APPROVAL_REQUIRED"
  | "HANDOFF_OFF"
  | "HANDOFF_SOURCE_UNAVAILABLE"
  | "QUOTE_NOT_AVAILABLE"
  | "UNAUTHORIZED_HANDOFF";

const FAILURE_STATUS: Record<UnifiedCrmQuoteOperationalHandoffFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  HANDOFF_APPROVAL_REQUIRED: 409,
  HANDOFF_OFF: 503,
  HANDOFF_SOURCE_UNAVAILABLE: 503,
  QUOTE_NOT_AVAILABLE: 404,
  UNAUTHORIZED_HANDOFF: 403
};

export class UnifiedCrmQuoteOperationalHandoffError extends Error {
  readonly code: UnifiedCrmQuoteOperationalHandoffFailureCode;
  readonly contractVersion = UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmQuoteOperationalHandoffFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmQuoteOperationalHandoffError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "HANDOFF_OFF" || code === "HANDOFF_SOURCE_UNAVAILABLE";
  }
}

export function statusForUnifiedCrmQuoteOperationalHandoffError(code: string | undefined) {
  return code && code in FAILURE_STATUS ? FAILURE_STATUS[code as UnifiedCrmQuoteOperationalHandoffFailureCode] : 500;
}
