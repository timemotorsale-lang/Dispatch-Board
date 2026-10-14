export const UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_CONTRACT_VERSION = "ucrm.performance-observability/v1" as const;
export const UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_ERROR_CONTRACT_VERSION = "ucrm.performance-observability-error/v1" as const;

export type UnifiedCrmPerformanceObservabilityStatus = "PASS" | "HOLD";

export type UnifiedCrmPerformanceObservabilityCheck = {
  category:
    | "slos"
    | "dataVolumes"
    | "queryBudgets"
    | "pageLatency"
    | "searchLatency"
    | "freshnessLag"
    | "structuredLogs"
    | "alerts"
    | "correlation";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmPerformanceObservabilityStatus;
};

export type UnifiedCrmPerformanceObservabilityReadModel = {
  checks: UnifiedCrmPerformanceObservabilityCheck[];
  contractVersion: typeof UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_CONTRACT_VERSION;
  generatedAt: string;
  state: "PASS" | "HELD";
  targets: {
    dashboardReconciliationMs: number;
    globalSearchMs: number;
    pageInteractionMs: number;
  };
  visibility: "management";
};

export type UnifiedCrmPerformanceObservabilityFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmPerformanceObservabilityFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED: 403
};

export class UnifiedCrmPerformanceObservabilityError extends Error {
  readonly code: UnifiedCrmPerformanceObservabilityFailureCode;
  readonly contractVersion = UNIFIED_CRM_PERFORMANCE_OBSERVABILITY_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmPerformanceObservabilityFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmPerformanceObservabilityError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
