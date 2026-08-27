export const UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_CONTRACT_VERSION = "ucrm.integration-recovery-review/v1" as const;
export const UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_ERROR_CONTRACT_VERSION = "ucrm.integration-recovery-review-error/v1" as const;

export type UnifiedCrmIntegrationRecoveryItem = {
  id: string;
  providerArea: "EMAIL_CALENDAR" | "SMS" | "TELEPHONY" | "ESIGNATURE" | "ACCOUNTING_DMS";
  queue: "RETRY" | "RECONCILIATION" | "DEAD_LETTER";
  state: "HELD" | "NEEDS_REVIEW" | "BLOCKED";
  externalReplayEnabled: false;
  customerImpact: "NONE_VISIBLE" | "POSSIBLE_DUPLICATE_RISK" | "SOURCE_TRUTH_CONFLICT";
  title: string;
  detail: string;
  safeNextStep: string;
  sourceHref: string;
};

export type UnifiedCrmIntegrationRecoveryReviewReadModel = {
  contractVersion: typeof UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_CONTRACT_VERSION;
  generatedAt: string;
  state: "READY_REVIEW";
  visibility: "management";
  summary: {
    reviewItemCount: number;
    retryReplayEnabled: false;
    reconciliationOnly: true;
    manualReviewRequired: boolean;
  };
  items: UnifiedCrmIntegrationRecoveryItem[];
  rollback: {
    fallback: "manual-integration-recovery-review";
    featureControl: "crm.admin.integrationRecovery.enabled";
    posture: "read-only-no-replay";
  };
};

export type UnifiedCrmIntegrationRecoveryReviewFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmIntegrationRecoveryReviewFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED: 403
};

export class UnifiedCrmIntegrationRecoveryReviewError extends Error {
  readonly code: UnifiedCrmIntegrationRecoveryReviewFailureCode;
  readonly contractVersion = UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmIntegrationRecoveryReviewFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmIntegrationRecoveryReviewError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
