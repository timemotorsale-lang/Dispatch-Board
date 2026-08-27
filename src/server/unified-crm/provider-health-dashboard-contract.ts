export const UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_CONTRACT_VERSION = "ucrm.provider-health-dashboard/v1" as const;
export const UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_ERROR_CONTRACT_VERSION = "ucrm.provider-health-dashboard-error/v1" as const;

export type UnifiedCrmProviderHealthState = "DISABLED" | "HELD" | "DEGRADED" | "READY_REVIEW";

export type UnifiedCrmProviderHealthChannel = {
  id: "email-calendar" | "sms" | "telephony" | "esignature" | "accounting-dms";
  label: string;
  state: UnifiedCrmProviderHealthState;
  featureControl: string;
  liveTrafficEnabled: false;
  lastCheckedAt: string;
  detail: string;
  disabledReason: string;
  rollback: {
    fallback: string;
    killSwitch: string;
  };
};

export type UnifiedCrmProviderHealthDashboardReadModel = {
  contractVersion: typeof UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_CONTRACT_VERSION;
  generatedAt: string;
  state: "READY_REVIEW";
  visibility: "management";
  summary: {
    totalChannels: number;
    liveTrafficEnabled: false;
    heldOrDisabledCount: number;
    degradedCount: number;
  };
  channels: UnifiedCrmProviderHealthChannel[];
  rollback: {
    fallback: "manual-provider-status-review";
    featureControl: "crm.admin.providerHealth.enabled";
    posture: "read-only";
  };
};

export type UnifiedCrmProviderHealthDashboardFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmProviderHealthDashboardFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED: 403
};

export class UnifiedCrmProviderHealthDashboardError extends Error {
  readonly code: UnifiedCrmProviderHealthDashboardFailureCode;
  readonly contractVersion = UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmProviderHealthDashboardFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmProviderHealthDashboardError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
