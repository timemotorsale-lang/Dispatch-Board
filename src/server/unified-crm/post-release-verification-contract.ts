export const UNIFIED_CRM_POST_RELEASE_VERIFICATION_CONTRACT_VERSION =
  "ucrm.post-release-verification/v1" as const;
export const UNIFIED_CRM_POST_RELEASE_VERIFICATION_ERROR_CONTRACT_VERSION =
  "ucrm.post-release-verification-error/v1" as const;

export type UnifiedCrmPostReleaseCheckStatus = "PASS" | "FAIL" | "PENDING";

export type UnifiedCrmPostReleaseCheck = {
  checkId: string;
  name: string;
  owner: string;
  rollbackIfFailed: boolean;
  status: UnifiedCrmPostReleaseCheckStatus;
};

export type UnifiedCrmPostReleaseVerificationReadModel = {
  checks: UnifiedCrmPostReleaseCheck[];
  contractVersion: typeof UNIFIED_CRM_POST_RELEASE_VERIFICATION_CONTRACT_VERSION;
  generatedAt: string;
  healthDecision: "PENDING_ENABLEMENT" | "HEALTHY" | "ROLLBACK_REQUIRED" | "HELD";
  supportIntakeOwner: string;
  visibility: "management";
};

export type UnifiedCrmPostReleaseVerificationFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "POST_RELEASE_VERIFICATION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmPostReleaseVerificationFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  POST_RELEASE_VERIFICATION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmPostReleaseVerificationError extends Error {
  readonly code: UnifiedCrmPostReleaseVerificationFailureCode;
  readonly contractVersion = UNIFIED_CRM_POST_RELEASE_VERIFICATION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmPostReleaseVerificationFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmPostReleaseVerificationError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
