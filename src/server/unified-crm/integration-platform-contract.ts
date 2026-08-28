export const UNIFIED_CRM_INTEGRATION_PLATFORM_CONTRACT_VERSION = "ucrm.integration-platform/v1" as const;
export const UNIFIED_CRM_INTEGRATION_PLATFORM_ERROR_CONTRACT_VERSION = "ucrm.integration-platform-error/v1" as const;

export type UnifiedCrmIntegrationPlatformCapability =
  | "credentialIsolation"
  | "tenantMapping"
  | "adapterInterface"
  | "idempotency"
  | "deliverySyncState"
  | "retryReplay"
  | "reconciliation"
  | "rateLimits"
  | "webhookValidation"
  | "audit"
  | "killSwitch"
  | "providerActivation";

export type UnifiedCrmIntegrationPlatformStatus = "PASS" | "HOLD";

export type UnifiedCrmIntegrationPlatformCheck = {
  capability: UnifiedCrmIntegrationPlatformCapability;
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmIntegrationPlatformStatus;
};

export type UnifiedCrmIntegrationProviderFamily =
  | "EMAIL_CALENDAR"
  | "SMS"
  | "TELEPHONY_TRANSCRIPTION"
  | "E_SIGNATURE"
  | "ACCOUNTING_DMS";

export type UnifiedCrmIntegrationProviderGate = {
  family: UnifiedCrmIntegrationProviderFamily;
  activationState: "HELD";
  reason: string;
  requiredMilestone: "UCRM-081" | "UCRM-082" | "UCRM-083" | "UCRM-084" | "UCRM-085" | "UCRM-086";
};

export type UnifiedCrmIntegrationPlatformReadModel = {
  checks: UnifiedCrmIntegrationPlatformCheck[];
  contractVersion: typeof UNIFIED_CRM_INTEGRATION_PLATFORM_CONTRACT_VERSION;
  generatedAt: string;
  providerGates: UnifiedCrmIntegrationProviderGate[];
  rollback: {
    defaultState: "DISABLED";
    featureControl: "crm.integrations.enabled";
    posture: "fail-closed";
  };
  state: "PASS" | "HELD";
  visibility: "management";
};

export type UnifiedCrmIntegrationPlatformFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "INTEGRATION_PLATFORM_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmIntegrationPlatformFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  INTEGRATION_PLATFORM_NOT_AUTHORIZED: 403
};

export class UnifiedCrmIntegrationPlatformError extends Error {
  readonly code: UnifiedCrmIntegrationPlatformFailureCode;
  readonly contractVersion = UNIFIED_CRM_INTEGRATION_PLATFORM_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmIntegrationPlatformFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmIntegrationPlatformError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
