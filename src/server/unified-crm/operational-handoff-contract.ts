export const UNIFIED_CRM_OPERATIONAL_HANDOFF_CONTRACT_VERSION = "ucrm.operational-handoff/v1" as const;
export const UNIFIED_CRM_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION =
  "ucrm.operational-handoff-error/v1" as const;

export type UnifiedCrmOperationalHandoffArea =
  | "monitoring"
  | "support"
  | "permissions"
  | "flag_changes"
  | "incident_response"
  | "data_recovery"
  | "training"
  | "rollback_authority";

export type UnifiedCrmOperationalHandoffStatus = "CONFIRMED" | "PENDING_OWNER_CONFIRMATION";

export type UnifiedCrmOperationalHandoffOwner = {
  area: UnifiedCrmOperationalHandoffArea;
  owner: string;
  requiredConfirmation: string;
  status: UnifiedCrmOperationalHandoffStatus;
};

export type UnifiedCrmOperationalHandoffReadModel = {
  contractVersion: typeof UNIFIED_CRM_OPERATIONAL_HANDOFF_CONTRACT_VERSION;
  generatedAt: string;
  handoffDecision: "HELD" | "READY_FOR_INTERNAL_RELEASE_DECISION";
  owners: UnifiedCrmOperationalHandoffOwner[];
  requiredBeforeReleaseDecision: string[];
  visibility: "management";
};

export type UnifiedCrmOperationalHandoffFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "OPERATIONAL_HANDOFF_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmOperationalHandoffFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  OPERATIONAL_HANDOFF_NOT_AUTHORIZED: 403
};

export class UnifiedCrmOperationalHandoffError extends Error {
  readonly code: UnifiedCrmOperationalHandoffFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPERATIONAL_HANDOFF_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmOperationalHandoffFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmOperationalHandoffError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
