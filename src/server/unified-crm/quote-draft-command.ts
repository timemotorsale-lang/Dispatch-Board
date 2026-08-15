export const UNIFIED_CRM_QUOTE_DRAFT_COMMAND = "SAVE_QUOTE_DRAFT" as const;
export const UNIFIED_CRM_QUOTE_DRAFT_CONTRACT_VERSION = "ucrm.quote-draft/v1" as const;
export const UNIFIED_CRM_QUOTE_DRAFT_ERROR_CONTRACT_VERSION = "ucrm.quote-draft-error/v1" as const;
export type UnifiedCrmQuoteDraftMode = "OFF" | "REVIEW";

export type UnifiedCrmQuoteDraftLineItemInput = {
  description?: unknown;
  quantity?: unknown;
  taxable?: unknown;
  unitPriceCents?: unknown;
};

export type UnifiedCrmQuoteDraftCommandInput = {
  customerId?: unknown;
  discountCents?: unknown;
  expectedVersion?: unknown;
  idempotencyKey?: unknown;
  lineItems?: unknown;
  opportunityId?: unknown;
  priceSource?: unknown;
  quoteId?: unknown;
  reason?: unknown;
  taxRateBasisPoints?: unknown;
  termsSummary?: unknown;
};

export type UnifiedCrmQuoteDraftLineItem = {
  description: string;
  quantity: number;
  taxable: boolean;
  unitPriceCents: number;
};

export type UnifiedCrmQuoteDraftCommand = {
  customerId: string | null;
  discountCents: number;
  expectedVersion: number;
  idempotencyKey: string;
  lineItems: UnifiedCrmQuoteDraftLineItem[];
  opportunityId: string | null;
  priceSource: string;
  quoteId: string | null;
  reason: string;
  taxRateBasisPoints: number;
  termsSummary: string;
};

export type UnifiedCrmQuoteDraftCommandResult = {
  contractVersion: typeof UNIFIED_CRM_QUOTE_DRAFT_CONTRACT_VERSION;
  duplicate: boolean;
  latestVersionNumber: number;
  quoteId: string;
  quoteNumber: string;
  state: "DRAFT";
  version: number;
  versionNumber?: number;
};

export type UnifiedCrmQuoteDraftFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_QUOTE_COMMAND"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE"
  | "QUOTE_DRAFT_OFF"
  | "QUOTE_MUTATION_HELD"
  | "QUOTE_NOT_AUTHORIZED"
  | "QUOTE_NOT_AVAILABLE"
  | "QUOTE_OFF"
  | "QUOTE_SOURCE_UNAVAILABLE"
  | "QUOTE_VERSION_CONFLICT";

const FAILURE_STATUS: Record<UnifiedCrmQuoteDraftFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  IDEMPOTENCY_KEY_REUSED: 409,
  INVALID_QUOTE_COMMAND: 400,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403,
  QUOTE_DRAFT_OFF: 503,
  QUOTE_MUTATION_HELD: 409,
  QUOTE_NOT_AUTHORIZED: 403,
  QUOTE_NOT_AVAILABLE: 404,
  QUOTE_OFF: 503,
  QUOTE_SOURCE_UNAVAILABLE: 503,
  QUOTE_VERSION_CONFLICT: 409
};

export class UnifiedCrmQuoteDraftError extends Error {
  readonly code: UnifiedCrmQuoteDraftFailureCode;
  readonly contractVersion = UNIFIED_CRM_QUOTE_DRAFT_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmQuoteDraftFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmQuoteDraftError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "QUOTE_SOURCE_UNAVAILABLE" || code === "QUOTE_OFF";
  }
}

export function resolveUnifiedCrmQuoteDraftMode(options: { nodeEnv?: string | undefined; mode?: unknown } = {}): UnifiedCrmQuoteDraftMode {
  const configured = options.mode ?? process.env.UNIFIED_CRM_QUOTE_DRAFT_MODE;
  if (configured !== undefined && configured !== null) {
    return typeof configured === "string" && configured.trim().toUpperCase() === "REVIEW"
      ? "REVIEW"
      : "OFF";
  }
  return (options.nodeEnv ?? process.env.NODE_ENV) === "production" ? "OFF" : "REVIEW";
}
