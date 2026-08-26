export const UNIFIED_CRM_PILOT_EXECUTION_CONTRACT_VERSION = "ucrm.pilot-execution/v1" as const;
export const UNIFIED_CRM_PILOT_EXECUTION_ERROR_CONTRACT_VERSION = "ucrm.pilot-execution-error/v1" as const;

export type UnifiedCrmPilotExecutionWorkflow = {
  evidenceRequired: string;
  owner: string;
  status: "READY_TO_RUN" | "HELD";
  title:
    | "managerDailyReview"
    | "staffFollowUp"
    | "globalSearch"
    | "opportunityProgression"
    | "quoteGovernance"
    | "dispatchHandoff"
    | "savedViews";
};

export type UnifiedCrmPilotExecutionReadModel = {
  contractVersion: typeof UNIFIED_CRM_PILOT_EXECUTION_CONTRACT_VERSION;
  generatedAt: string;
  measures: string[];
  pilotStatus: "READY_TO_RUN" | "HELD";
  releaseScope: "INTERNAL_PILOT_ONLY";
  reportingRequirements: string[];
  visibility: "management";
  workflows: UnifiedCrmPilotExecutionWorkflow[];
};

export type UnifiedCrmPilotExecutionFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PILOT_EXECUTION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmPilotExecutionFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PILOT_EXECUTION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmPilotExecutionError extends Error {
  readonly code: UnifiedCrmPilotExecutionFailureCode;
  readonly contractVersion = UNIFIED_CRM_PILOT_EXECUTION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmPilotExecutionFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmPilotExecutionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
