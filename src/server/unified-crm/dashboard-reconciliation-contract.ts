export const UNIFIED_CRM_DASHBOARD_RECONCILIATION_CONTRACT_VERSION = "ucrm.dashboard-reconciliation/v1" as const;
export const UNIFIED_CRM_DASHBOARD_RECONCILIATION_ERROR_CONTRACT_VERSION = "ucrm.dashboard-reconciliation-error/v1" as const;

export type UnifiedCrmDashboardReconciliationMetricId =
  | "ownedWork"
  | "overdueFollowUp"
  | "pipeline"
  | "quotes"
  | "dispatchHandoffs";

export type UnifiedCrmDashboardReconciliationStatus = "PASS" | "WARN" | "FAIL";

export type UnifiedCrmDashboardReconciliationSample = {
  entity: "opportunity" | "quote" | "dispatch";
  href: string;
  id: string;
  label: string;
  updatedAt: string;
};

export type UnifiedCrmDashboardReconciliationMetric = {
  count: number;
  href: string;
  id: UnifiedCrmDashboardReconciliationMetricId;
  label: string;
  samples: UnifiedCrmDashboardReconciliationSample[];
};

export type UnifiedCrmDashboardReconciliationCheck = {
  detail: string;
  id: "freshness" | "drillThrough" | "masking" | "performance" | "managerWorkflow";
  status: UnifiedCrmDashboardReconciliationStatus;
};

export type UnifiedCrmDashboardReconciliationReadModel = {
  checks: UnifiedCrmDashboardReconciliationCheck[];
  contractVersion: typeof UNIFIED_CRM_DASHBOARD_RECONCILIATION_CONTRACT_VERSION;
  generatedAt: string;
  metrics: UnifiedCrmDashboardReconciliationMetric[];
  queryTimeMs: number;
  state: UnifiedCrmDashboardReconciliationStatus;
  visibility: "organization";
};

export type UnifiedCrmDashboardReconciliationFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "DASHBOARD_RECONCILIATION_NOT_AUTHORIZED"
  | "DASHBOARD_RECONCILIATION_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmDashboardReconciliationFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  DASHBOARD_RECONCILIATION_NOT_AUTHORIZED: 403,
  DASHBOARD_RECONCILIATION_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmDashboardReconciliationError extends Error {
  readonly code: UnifiedCrmDashboardReconciliationFailureCode;
  readonly contractVersion = UNIFIED_CRM_DASHBOARD_RECONCILIATION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmDashboardReconciliationFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmDashboardReconciliationError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "DASHBOARD_RECONCILIATION_SOURCE_UNAVAILABLE";
  }
}
