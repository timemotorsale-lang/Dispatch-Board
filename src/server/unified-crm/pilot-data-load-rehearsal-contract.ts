export const UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_CONTRACT_VERSION = "ucrm.pilot-data-load-rehearsal/v1" as const;
export const UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_ERROR_CONTRACT_VERSION = "ucrm.pilot-data-load-rehearsal-error/v1" as const;

export type UnifiedCrmPilotDataLoadOutcomeStatus = "READY" | "DUPLICATE" | "INVALID";

export type UnifiedCrmPilotDataLoadInputRow = {
  customerName?: unknown;
  customerNumber?: unknown;
  email?: unknown;
  opportunityTitle?: unknown;
  phone?: unknown;
  sourceReference?: unknown;
  stockNumber?: unknown;
  vin?: unknown;
};

export type UnifiedCrmPilotDataLoadMappedRow = {
  customerName: string;
  customerNumber: string | null;
  email: string | null;
  opportunityTitle: string;
  phone: string | null;
  sourceReference: string;
  stockNumber: string | null;
  vin: string | null;
};

export type UnifiedCrmPilotDataLoadOutcome = {
  duplicateReasons: string[];
  errors: string[];
  mapped: UnifiedCrmPilotDataLoadMappedRow | null;
  rowNumber: number;
  status: UnifiedCrmPilotDataLoadOutcomeStatus;
};

export type UnifiedCrmPilotDataLoadRehearsalReport = {
  backupPlan: {
    estimatedBackupMinutes: number;
    estimatedRestoreMinutes: number;
    requiredBeforeLiveLoad: boolean;
    rollbackAuthority: "ADMINISTRATOR_ASSISTED";
  };
  checksum: string;
  contractVersion: typeof UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_CONTRACT_VERSION;
  counts: {
    duplicate: number;
    invalid: number;
    ready: number;
    total: number;
  };
  dryRun: true;
  generatedAt: string;
  outcomes: UnifiedCrmPilotDataLoadOutcome[];
  provenance: {
    actorUserId: string;
    organizationId: string;
    sourceSystem: string;
  };
  state: "READY_FOR_ADMIN_REVIEW" | "BLOCKED";
};

export type UnifiedCrmPilotDataLoadRehearsalFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "PILOT_DATA_LOAD_NOT_AUTHORIZED"
  | "PILOT_DATA_LOAD_INVALID"
  | "PILOT_DATA_LOAD_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmPilotDataLoadRehearsalFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  PILOT_DATA_LOAD_NOT_AUTHORIZED: 403,
  PILOT_DATA_LOAD_INVALID: 400,
  PILOT_DATA_LOAD_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmPilotDataLoadRehearsalError extends Error {
  readonly code: UnifiedCrmPilotDataLoadRehearsalFailureCode;
  readonly contractVersion = UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmPilotDataLoadRehearsalFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmPilotDataLoadRehearsalError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "PILOT_DATA_LOAD_SOURCE_UNAVAILABLE";
  }
}
