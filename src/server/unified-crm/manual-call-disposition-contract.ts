export const UNIFIED_CRM_MANUAL_CALL_DISPOSITION_CONTRACT_VERSION = "ucrm.manual-call-disposition/v1" as const;
export const UNIFIED_CRM_MANUAL_CALL_DISPOSITION_ERROR_CONTRACT_VERSION = "ucrm.manual-call-disposition-error/v1" as const;

export type UnifiedCrmManualCallOutcome = "REACHED_CUSTOMER" | "LEFT_VOICEMAIL" | "NO_ANSWER" | "BAD_NUMBER" | "CALL_BACK_REQUESTED";

export type UnifiedCrmManualCallDispositionReadModel = {
  activation: {
    callRecordingEnabled: false;
    clickToCallEnabled: false;
    manualOutcomeCaptureEnabled: true;
    transcriptionEnabled: false;
    state: "IMPLEMENTED_UNVERIFIED";
  };
  contractVersion: typeof UNIFIED_CRM_MANUAL_CALL_DISPOSITION_CONTRACT_VERSION;
  generatedAt: string;
  outcomes: {
    label: string;
    nextStepRequired: boolean;
    outcome: UnifiedCrmManualCallOutcome;
  }[];
  rollback: {
    fallback: "customer-interaction-manual-note";
    featureControl: "crm.communications.manualCallDisposition.enabled";
    posture: "manual-only";
  };
  state: "IMPLEMENTED_UNVERIFIED";
  visibility: "management";
};

export type UnifiedCrmManualCallDispositionFailureCode = "AUTHENTICATION_REQUIRED" | "MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED";
const FAILURE_STATUS: Record<UnifiedCrmManualCallDispositionFailureCode, number> = { AUTHENTICATION_REQUIRED: 401, MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED: 403 };

export class UnifiedCrmManualCallDispositionError extends Error {
  readonly code: UnifiedCrmManualCallDispositionFailureCode;
  readonly contractVersion = UNIFIED_CRM_MANUAL_CALL_DISPOSITION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;
  constructor(code: UnifiedCrmManualCallDispositionFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmManualCallDispositionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
