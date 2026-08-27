export const UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_CONTRACT_VERSION = "ucrm.telephony-transcription/v1" as const;
export const UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_ERROR_CONTRACT_VERSION = "ucrm.telephony-transcription-error/v1" as const;

export type UnifiedCrmTelephonyTranscriptionStatus = "PASS" | "HOLD";

export type UnifiedCrmTelephonyTranscriptionCheck = {
  category:
    | "providerSelection"
    | "callingAuthority"
    | "recordingConsent"
    | "retentionPolicy"
    | "transcriptionProvenance"
    | "restrictedAccess"
    | "inboundRouting"
    | "aiReceptionistBoundary"
    | "providerFailure"
    | "audit"
    | "legalApproval"
    | "killSwitch";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmTelephonyTranscriptionStatus;
};

export type UnifiedCrmTelephonyTranscriptionReadModel = {
  activation: {
    aiReceptionistEnabled: false;
    callRecordingEnabled: false;
    clickToCallEnabled: false;
    inboundCallRoutingEnabled: false;
    providerName: null;
    transcriptionEnabled: false;
    state: "HELD";
  };
  checks: UnifiedCrmTelephonyTranscriptionCheck[];
  contractVersion: typeof UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_CONTRACT_VERSION;
  generatedAt: string;
  rollback: {
    fallback: "manual-call-and-manual-contact-outcome";
    featureControl: "crm.integrations.telephony.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmTelephonyTranscriptionFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmTelephonyTranscriptionFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmTelephonyTranscriptionError extends Error {
  readonly code: UnifiedCrmTelephonyTranscriptionFailureCode;
  readonly contractVersion = UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmTelephonyTranscriptionFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmTelephonyTranscriptionError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
