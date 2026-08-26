export const UNIFIED_CRM_PILOT_GO_NO_GO_CONTRACT_VERSION = "ucrm.pilot-go-no-go/v1" as const;
export const UNIFIED_CRM_PILOT_GO_NO_GO_ERROR_CONTRACT_VERSION = "ucrm.pilot-go-no-go-error/v1" as const;

export type UnifiedCrmPilotDecisionArea = {
  area: "product" | "operations" | "security" | "engineering";
  blockers: string[];
  decision: "APPROVED" | "HELD" | "REDUCED_SCOPE";
  owner: string;
};

export type UnifiedCrmPilotGoNoGoReadModel = {
  contractVersion: typeof UNIFIED_CRM_PILOT_GO_NO_GO_CONTRACT_VERSION;
  decision: "HELD" | "APPROVED" | "REDUCED_SCOPE_CONTINUATION";
  decisionAreas: UnifiedCrmPilotDecisionArea[];
  enabledScope: string[];
  generatedAt: string;
  requiredBeforeApproval: string[];
  visibility: "management";
};

export type UnifiedCrmPilotGoNoGoFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PILOT_GO_NO_GO_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmPilotGoNoGoFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PILOT_GO_NO_GO_NOT_AUTHORIZED: 403
};

export class UnifiedCrmPilotGoNoGoError extends Error {
  readonly code: UnifiedCrmPilotGoNoGoFailureCode;
  readonly contractVersion = UNIFIED_CRM_PILOT_GO_NO_GO_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmPilotGoNoGoFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmPilotGoNoGoError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
