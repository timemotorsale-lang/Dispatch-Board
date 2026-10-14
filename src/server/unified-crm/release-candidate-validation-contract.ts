export const UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_CONTRACT_VERSION =
  "ucrm.release-candidate-validation/v1" as const;
export const UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_ERROR_CONTRACT_VERSION =
  "ucrm.release-candidate-validation-error/v1" as const;

export type UnifiedCrmReleaseCandidateEvidenceStatus = "CONFIRMED_CURRENT" | "NEEDS_RERUN" | "HELD";

export type UnifiedCrmReleaseCandidateEvidence = {
  evidenceId: string;
  milestone: string;
  owner: string;
  requiredAction: string;
  status: UnifiedCrmReleaseCandidateEvidenceStatus;
};

export type UnifiedCrmReleaseCandidateValidationReadModel = {
  contractVersion: typeof UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_CONTRACT_VERSION;
  evidence: UnifiedCrmReleaseCandidateEvidence[];
  generatedAt: string;
  releaseCandidate: {
    configuration: "production";
    exactCommit: "pending";
    migrationVersion: "pending";
  };
  validationDecision: "HELD" | "VALIDATED";
  visibility: "management";
};

export type UnifiedCrmReleaseCandidateValidationFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmReleaseCandidateValidationFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmReleaseCandidateValidationError extends Error {
  readonly code: UnifiedCrmReleaseCandidateValidationFailureCode;
  readonly contractVersion = UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmReleaseCandidateValidationFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmReleaseCandidateValidationError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
