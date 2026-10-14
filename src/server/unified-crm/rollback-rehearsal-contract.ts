export const UNIFIED_CRM_ROLLBACK_REHEARSAL_CONTRACT_VERSION = "ucrm.rollback-rehearsal/v1" as const;
export const UNIFIED_CRM_ROLLBACK_REHEARSAL_ERROR_CONTRACT_VERSION = "ucrm.rollback-rehearsal-error/v1" as const;

export type UnifiedCrmRollbackRehearsalStep = {
  evidenceRequired: string;
  owner: string;
  status: "READY_TO_REHEARSE" | "HELD";
  title:
    | "killSwitches"
    | "priorReleaseRecovery"
    | "inFlightWrites"
    | "retainedEvidence"
    | "customersSalesFallback"
    | "restoreTiming"
    | "decisionLog";
};

export type UnifiedCrmRollbackRehearsalReadModel = {
  contractVersion: typeof UNIFIED_CRM_ROLLBACK_REHEARSAL_CONTRACT_VERSION;
  generatedAt: string;
  rehearsalStatus: "READY_TO_REHEARSE" | "HELD";
  steps: UnifiedCrmRollbackRehearsalStep[];
  visibility: "management";
};

export type UnifiedCrmRollbackRehearsalFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "ROLLBACK_REHEARSAL_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmRollbackRehearsalFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  ROLLBACK_REHEARSAL_NOT_AUTHORIZED: 403
};

export class UnifiedCrmRollbackRehearsalError extends Error {
  readonly code: UnifiedCrmRollbackRehearsalFailureCode;
  readonly contractVersion = UNIFIED_CRM_ROLLBACK_REHEARSAL_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmRollbackRehearsalFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmRollbackRehearsalError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
