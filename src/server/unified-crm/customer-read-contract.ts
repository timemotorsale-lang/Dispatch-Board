export const UNIFIED_CRM_CUSTOMER_LIST_CONTRACT_VERSION = "ucrm.customer-list/v1" as const;
export const UNIFIED_CRM_CUSTOMER_ERROR_CONTRACT_VERSION = "ucrm.error/v1" as const;

export const UNIFIED_CRM_CUSTOMER_LIST_STATUSES = ["active", "inactive", "all"] as const;
export const UNIFIED_CRM_CUSTOMER_LIST_OWNERS = ["all", "mine", "unassigned"] as const;

export type UnifiedCrmCustomerListStatus = (typeof UNIFIED_CRM_CUSTOMER_LIST_STATUSES)[number];
export type UnifiedCrmCustomerListOwner = (typeof UNIFIED_CRM_CUSTOMER_LIST_OWNERS)[number];
export type UnifiedCrmCustomerReadMode = "OFF" | "REVIEW";

export type UnifiedCrmCustomerListQueryInput = {
  cursor?: unknown;
  limit?: unknown;
  owner?: unknown;
  q?: unknown;
  status?: unknown;
};

export type UnifiedCrmCustomerListQuery = {
  cursor: string | null;
  limit: number;
  owner: UnifiedCrmCustomerListOwner;
  q: string;
  status: UnifiedCrmCustomerListStatus;
};

export type UnifiedCrmCustomerCursor = {
  id: string;
  updatedAt: Date;
};

export type UnifiedCrmCustomerListItem = {
  id: string;
  displayName: string;
  customerNumber: string;
  contactCompleteness: "complete" | "partial" | "missing";
  duplicateRisk: boolean;
  hasNextAction: boolean;
  maskedPhone: string;
  maskedEmail: string;
  ownerName: string;
  preferredContactMethod: string | null;
  sourceCode: string | null;
  status: "active" | "inactive" | "retired";
  lastInteractionAt: string | null;
  nextActionAt: string | null;
  updatedAt: string;
  sourceHref: string;
};

export type UnifiedCrmCustomerListReadModel = {
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_LIST_CONTRACT_VERSION;
  state: "READY" | "EMPTY";
  visibility: "organization" | "owned";
  generatedAt: string;
  source: {
    authority: "CUSTOMERS";
    label: "Customers";
    href: "/customers";
    readMode: "LIVE_CANONICAL";
    observedAt: string;
  };
  freshness: {
    status: "CURRENT";
    observedAt: string;
    newestRecordUpdatedAt: string | null;
  };
  query: Omit<UnifiedCrmCustomerListQuery, "cursor" | "limit">;
  items: UnifiedCrmCustomerListItem[];
  page: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type UnifiedCrmCustomerReadFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_READ_NOT_AUTHORIZED"
  | "CUSTOMER_READ_OFF"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "INVALID_CUSTOMER_QUERY"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmCustomerReadFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_READ_NOT_AUTHORIZED: 403,
  CUSTOMER_READ_OFF: 503,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  INVALID_CUSTOMER_QUERY: 400,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmCustomerReadError extends Error {
  readonly code: UnifiedCrmCustomerReadFailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomerReadFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomerReadError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE";
  }
}
