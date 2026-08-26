export const UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_CONTRACT_VERSION =
  "ucrm.customer-duplicate-candidates/v1" as const;
export const UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_ERROR_CONTRACT_VERSION =
  "ucrm.customer-duplicate-candidates-error/v1" as const;

export type UnifiedCrmCustomerDuplicateCandidate = {
  candidateCustomerId: string;
  explanation: string[];
  maskedEmail: string;
  maskedPhone: string;
  score: number;
  sourceHref: string;
};

export type UnifiedCrmCustomerDuplicateCandidateReadModel = {
  candidates: UnifiedCrmCustomerDuplicateCandidate[];
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_CONTRACT_VERSION;
  customerId: string;
  generatedAt: string;
  state: "NO_CANDIDATES" | "WARNING";
  warningOnly: true;
};

export type UnifiedCrmCustomerDuplicateCandidateFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_DUPLICATE_WARNING_NOT_AUTHORIZED"
  | "CUSTOMER_DUPLICATE_WARNING_OFF"
  | "CUSTOMER_NOT_AVAILABLE"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "INVALID_DUPLICATE_WARNING_QUERY";

const FAILURE_STATUS: Record<UnifiedCrmCustomerDuplicateCandidateFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_DUPLICATE_WARNING_NOT_AUTHORIZED: 403,
  CUSTOMER_DUPLICATE_WARNING_OFF: 503,
  CUSTOMER_NOT_AVAILABLE: 404,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  INVALID_DUPLICATE_WARNING_QUERY: 400
};

export class UnifiedCrmCustomerDuplicateCandidateError extends Error {
  readonly code: UnifiedCrmCustomerDuplicateCandidateFailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomerDuplicateCandidateFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomerDuplicateCandidateError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE";
  }
}
