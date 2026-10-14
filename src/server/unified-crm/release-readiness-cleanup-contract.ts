export const UNIFIED_CRM_RELEASE_READINESS_CLEANUP_CONTRACT_VERSION = "ucrm.release-readiness-cleanup/v1" as const;
export const UNIFIED_CRM_RELEASE_READINESS_CLEANUP_ERROR_CONTRACT_VERSION = "ucrm.release-readiness-cleanup-error/v1" as const;

export type UnifiedCrmReleaseReadinessCleanupItem = {
  id: string;
  area: "REGRESSION" | "ACCESSIBILITY" | "FALLBACK" | "ROLLBACK" | "BUSINESS_DECISION" | "PILOT_GATE";
  state: "PASS" | "HELD";
  title: string;
  evidence: string;
  requiredBeforeRelease: string | null;
};

export type UnifiedCrmReleaseReadinessCleanupReadModel = {
  contractVersion: typeof UNIFIED_CRM_RELEASE_READINESS_CLEANUP_CONTRACT_VERSION;
  generatedAt: string;
  state: "HELD";
  visibility: "management";
  releaseAllowed: false;
  mergeReviewReady: false;
  items: UnifiedCrmReleaseReadinessCleanupItem[];
  summary: {
    passCount: number;
    heldCount: number;
    releaseBlockingCount: number;
  };
  rollback: {
    fallback: "existing-dispatch-customers-sales-consoles";
    featureControl: "crm.releaseReadiness.enabled";
    posture: "fail-closed";
  };
};

export type UnifiedCrmReleaseReadinessCleanupFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmReleaseReadinessCleanupFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED: 403
};

export class UnifiedCrmReleaseReadinessCleanupError extends Error {
  readonly code: UnifiedCrmReleaseReadinessCleanupFailureCode;
  readonly contractVersion = UNIFIED_CRM_RELEASE_READINESS_CLEANUP_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmReleaseReadinessCleanupFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmReleaseReadinessCleanupError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
