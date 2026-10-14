export const UNIFIED_CRM_PILOT_FINDING_CLOSURE_CONTRACT_VERSION = "ucrm.pilot-finding-closure/v1" as const;
export const UNIFIED_CRM_PILOT_FINDING_CLOSURE_ERROR_CONTRACT_VERSION =
  "ucrm.pilot-finding-closure-error/v1" as const;

export type UnifiedCrmPilotFindingClosureStatus =
  | "FIXED_WITH_REGRESSION"
  | "ACCEPTED_LIMITATION"
  | "REMOVED_FROM_SCOPE"
  | "PENDING_CLOSURE";

export type UnifiedCrmPilotFindingClosure = {
  acceptedBy?: string;
  acceptedOn?: string;
  closureEvidence: string[];
  findingId: string;
  owner: string;
  releaseImpact: "BLOCKS_RELEASE" | "ALLOWED_WITH_LIMIT" | "REMOVED_FROM_ENABLED_SCOPE";
  status: UnifiedCrmPilotFindingClosureStatus;
  summary: string;
};

export type UnifiedCrmPilotFindingClosureReadModel = {
  closureDecision: "HELD" | "READY_FOR_RELEASE_CANDIDATE_VALIDATION";
  contractVersion: typeof UNIFIED_CRM_PILOT_FINDING_CLOSURE_CONTRACT_VERSION;
  enabledScope: string[];
  findings: UnifiedCrmPilotFindingClosure[];
  generatedAt: string;
  requiredBeforeReleaseCandidateValidation: string[];
  visibility: "management";
};

export type UnifiedCrmPilotFindingClosureFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PILOT_FINDING_CLOSURE_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmPilotFindingClosureFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PILOT_FINDING_CLOSURE_NOT_AUTHORIZED: 403
};

export class UnifiedCrmPilotFindingClosureError extends Error {
  readonly code: UnifiedCrmPilotFindingClosureFailureCode;
  readonly contractVersion = UNIFIED_CRM_PILOT_FINDING_CLOSURE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmPilotFindingClosureFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmPilotFindingClosureError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
