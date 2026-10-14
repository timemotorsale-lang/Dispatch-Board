export const UNIFIED_CRM_GLOBAL_SEARCH_CONTRACT_VERSION = "ucrm.global-search/v1" as const;
export const UNIFIED_CRM_GLOBAL_SEARCH_ERROR_CONTRACT_VERSION = "ucrm.global-search-error/v1" as const;

export type UnifiedCrmGlobalSearchEntity =
  | "customer"
  | "contact"
  | "opportunity"
  | "quote"
  | "task"
  | "appointment"
  | "vehicle"
  | "dispatch";

export type UnifiedCrmGlobalSearchQueryInput = {
  limit?: unknown;
  q?: unknown;
};

export type UnifiedCrmGlobalSearchQuery = {
  limit: number;
  q: string;
};

export type UnifiedCrmGlobalSearchResult = {
  entity: UnifiedCrmGlobalSearchEntity;
  id: string;
  label: string;
  secondary: string;
  href: string;
  matchedOn: string;
  rank: number;
  updatedAt: string | null;
};

export type UnifiedCrmGlobalSearchGroup = {
  entity: UnifiedCrmGlobalSearchEntity;
  label: string;
  count: number;
  results: UnifiedCrmGlobalSearchResult[];
};

export type UnifiedCrmGlobalSearchReadModel = {
  contractVersion: typeof UNIFIED_CRM_GLOBAL_SEARCH_CONTRACT_VERSION;
  state: "READY" | "EMPTY";
  visibility: "organization" | "owned";
  generatedAt: string;
  query: UnifiedCrmGlobalSearchQuery;
  groups: UnifiedCrmGlobalSearchGroup[];
  resultCount: number;
  source: {
    authority: "UNIFIED_CRM";
    label: "Unified CRM global search";
    readMode: "LIVE_CANONICAL";
    observedAt: string;
  };
  freshness: {
    status: "CURRENT";
    observedAt: string;
    newestRecordUpdatedAt: string | null;
  };
};

export type UnifiedCrmGlobalSearchFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "GLOBAL_SEARCH_NOT_AUTHORIZED"
  | "GLOBAL_SEARCH_OFF"
  | "GLOBAL_SEARCH_SOURCE_UNAVAILABLE"
  | "INVALID_GLOBAL_SEARCH_QUERY"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmGlobalSearchFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  GLOBAL_SEARCH_NOT_AUTHORIZED: 403,
  GLOBAL_SEARCH_OFF: 503,
  GLOBAL_SEARCH_SOURCE_UNAVAILABLE: 503,
  INVALID_GLOBAL_SEARCH_QUERY: 400,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmGlobalSearchError extends Error {
  readonly code: UnifiedCrmGlobalSearchFailureCode;
  readonly contractVersion = UNIFIED_CRM_GLOBAL_SEARCH_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmGlobalSearchFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmGlobalSearchError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "GLOBAL_SEARCH_OFF" || code === "GLOBAL_SEARCH_SOURCE_UNAVAILABLE";
  }
}

export function normalizeUnifiedCrmGlobalSearchQuery(
  input: UnifiedCrmGlobalSearchQueryInput | URLSearchParams = {}
): UnifiedCrmGlobalSearchQuery {
  const get = (key: keyof UnifiedCrmGlobalSearchQueryInput) =>
    input instanceof URLSearchParams ? input.get(key) : input[key];
  const q = String(get("q") ?? "").trim().replace(/\s+/g, " ");
  const requestedLimit = Number(get("limit") ?? 12);
  if (q.length < 2 || q.length > 80) {
    throw new UnifiedCrmGlobalSearchError(
      "INVALID_GLOBAL_SEARCH_QUERY",
      "Search needs between 2 and 80 characters."
    );
  }
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 25) {
    throw new UnifiedCrmGlobalSearchError(
      "INVALID_GLOBAL_SEARCH_QUERY",
      "Search limit must be between 1 and 25."
    );
  }
  return { limit: requestedLimit, q };
}
