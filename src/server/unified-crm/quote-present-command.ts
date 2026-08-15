export const UNIFIED_CRM_QUOTE_PRESENT_CONTRACT_VERSION = "ucrm.quote-present/v1" as const;
export const UNIFIED_CRM_QUOTE_PRESENT_ERROR_CONTRACT_VERSION = "ucrm.quote-present-error/v1" as const;

export type UnifiedCrmQuotePresentCommandResult = {
  contractVersion: typeof UNIFIED_CRM_QUOTE_PRESENT_CONTRACT_VERSION;
  quoteId: string;
};

export type UnifiedCrmQuotePresentFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE"
  | "QUOTE_MUTATION_HELD"
  | "QUOTE_NOT_AUTHORIZED"
  | "QUOTE_OFF";

const FAILURE_STATUS: Record<UnifiedCrmQuotePresentFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403,
  QUOTE_MUTATION_HELD: 409,
  QUOTE_NOT_AUTHORIZED: 403,
  QUOTE_OFF: 503
};

export class UnifiedCrmQuotePresentError extends Error {
  readonly code: UnifiedCrmQuotePresentFailureCode;
  readonly contractVersion = UNIFIED_CRM_QUOTE_PRESENT_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmQuotePresentFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmQuotePresentError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "QUOTE_OFF";
  }
}
