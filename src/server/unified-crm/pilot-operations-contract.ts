export const UNIFIED_CRM_PILOT_OPERATIONS_CONTRACT_VERSION = "ucrm.pilot-operations/v1" as const;
export const UNIFIED_CRM_PILOT_OPERATIONS_ERROR_CONTRACT_VERSION = "ucrm.pilot-operations-error/v1" as const;

export type UnifiedCrmPilotOperationsPackage = {
  contractVersion: typeof UNIFIED_CRM_PILOT_OPERATIONS_CONTRACT_VERSION;
  generatedAt: string;
  packageStatus: "READY_FOR_REVIEW";
  sections: Array<{
    items: string[];
    owner: string;
    title:
      | "cohort"
      | "featureFlags"
      | "training"
      | "support"
      | "knownLimits"
      | "monitoring"
      | "incidentEscalation"
      | "privacy"
      | "backup"
      | "rollback";
  }>;
  visibility: "management";
};

export type UnifiedCrmPilotOperationsFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PILOT_OPERATIONS_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmPilotOperationsFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PILOT_OPERATIONS_NOT_AUTHORIZED: 403
};

export class UnifiedCrmPilotOperationsError extends Error {
  readonly code: UnifiedCrmPilotOperationsFailureCode;
  readonly contractVersion = UNIFIED_CRM_PILOT_OPERATIONS_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmPilotOperationsFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmPilotOperationsError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
