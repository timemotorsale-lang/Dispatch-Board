export const UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_CONTRACT_VERSION = "ucrm.manager-exception-queue/v1" as const;
export const UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_ERROR_CONTRACT_VERSION = "ucrm.manager-exception-queue-error/v1" as const;

export type UnifiedCrmManagerExceptionKind =
  | "unassigned"
  | "stalled"
  | "overdue"
  | "approval"
  | "dispatchHandoff";

export type UnifiedCrmManagerExceptionQueueInput = {
  limit?: unknown;
  offset?: unknown;
};

export type UnifiedCrmManagerExceptionQueueQuery = {
  limit: number;
  offset: number;
};

export type UnifiedCrmManagerExceptionQueueItem = {
  id: string;
  kind: UnifiedCrmManagerExceptionKind;
  label: string;
  detail: string;
  ownerName: string;
  ageLabel: string;
  href: string;
  recommendedAction: string;
  updatedAt: string;
};

export type UnifiedCrmManagerExceptionQueueReadModel = {
  contractVersion: typeof UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_CONTRACT_VERSION;
  state: "READY" | "EMPTY";
  visibility: "organization";
  generatedAt: string;
  query: UnifiedCrmManagerExceptionQueueQuery;
  items: UnifiedCrmManagerExceptionQueueItem[];
  summary: Record<UnifiedCrmManagerExceptionKind, number>;
  page: {
    hasMore: boolean;
    nextOffset: number | null;
  };
};

export type UnifiedCrmManagerExceptionQueueFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_MANAGER_EXCEPTION_QUERY"
  | "MANAGER_EXCEPTION_NOT_AUTHORIZED"
  | "MANAGER_EXCEPTION_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmManagerExceptionQueueFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  INVALID_MANAGER_EXCEPTION_QUERY: 400,
  MANAGER_EXCEPTION_NOT_AUTHORIZED: 403,
  MANAGER_EXCEPTION_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmManagerExceptionQueueError extends Error {
  readonly code: UnifiedCrmManagerExceptionQueueFailureCode;
  readonly contractVersion = UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmManagerExceptionQueueFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmManagerExceptionQueueError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "MANAGER_EXCEPTION_SOURCE_UNAVAILABLE";
  }
}

export function normalizeUnifiedCrmManagerExceptionQueueQuery(
  input: UnifiedCrmManagerExceptionQueueInput | URLSearchParams = {}
): UnifiedCrmManagerExceptionQueueQuery {
  const get = (key: keyof UnifiedCrmManagerExceptionQueueInput) =>
    input instanceof URLSearchParams ? input.get(key) : input[key];
  const limit = Number(get("limit") ?? 10);
  const offset = Number(get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new UnifiedCrmManagerExceptionQueueError(
      "INVALID_MANAGER_EXCEPTION_QUERY",
      "Manager exception limit must be between 1 and 25."
    );
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) {
    throw new UnifiedCrmManagerExceptionQueueError(
      "INVALID_MANAGER_EXCEPTION_QUERY",
      "Manager exception offset is invalid."
    );
  }
  return { limit, offset };
}
