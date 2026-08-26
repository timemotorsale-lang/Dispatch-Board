export const UNIFIED_CRM_INTERNAL_RELEASE_DECISION_CONTRACT_VERSION =
  "ucrm.internal-release-decision/v1" as const;
export const UNIFIED_CRM_INTERNAL_RELEASE_DECISION_ERROR_CONTRACT_VERSION =
  "ucrm.internal-release-decision-error/v1" as const;

export type UnifiedCrmInternalReleaseDecisionReadModel = {
  approvedCapabilities: string[];
  approvedCohorts: string[];
  contractVersion: typeof UNIFIED_CRM_INTERNAL_RELEASE_DECISION_CONTRACT_VERSION;
  decision: "HELD" | "APPROVED" | "REDUCED_SCOPE_APPROVED";
  evidenceCommit: "pending";
  generatedAt: string;
  knownLimitations: string[];
  migrationVersion: "pending";
  requiredBeforeEnablement: string[];
  rollbackTrigger: "pending";
  visibility: "management";
};

export type UnifiedCrmInternalReleaseDecisionFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmInternalReleaseDecisionFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmInternalReleaseDecisionError extends Error {
  readonly code: UnifiedCrmInternalReleaseDecisionFailureCode;
  readonly contractVersion = UNIFIED_CRM_INTERNAL_RELEASE_DECISION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmInternalReleaseDecisionFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmInternalReleaseDecisionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
