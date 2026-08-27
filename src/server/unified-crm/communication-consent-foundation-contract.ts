export const UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_CONTRACT_VERSION = "ucrm.communication-consent-foundation/v1" as const;
export const UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_ERROR_CONTRACT_VERSION = "ucrm.communication-consent-foundation-error/v1" as const;

export type UnifiedCrmCommunicationChannel = "EMAIL" | "SMS" | "PHONE";
export type UnifiedCrmCommunicationConsentStatus = "PASS" | "HOLD";

export type UnifiedCrmCommunicationConsentCheck = {
  category:
    | "channelConsent"
    | "purpose"
    | "suppression"
    | "optOut"
    | "quietHours"
    | "contactPointAuthority"
    | "audit"
    | "fallback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmCommunicationConsentStatus;
};

export type UnifiedCrmCommunicationConsentChannelReadiness = {
  channel: UnifiedCrmCommunicationChannel;
  liveActionEnabled: false;
  reason: string;
  state: "HELD";
};

export type UnifiedCrmCommunicationConsentFoundationReadModel = {
  activation: {
    emailSendEnabled: false;
    phoneDialEnabled: false;
    smsSendEnabled: false;
    state: "HELD";
  };
  channels: UnifiedCrmCommunicationConsentChannelReadiness[];
  checks: UnifiedCrmCommunicationConsentCheck[];
  contractVersion: typeof UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_CONTRACT_VERSION;
  generatedAt: string;
  rollback: {
    fallback: "manual-contact-outcome-with-no-external-delivery";
    featureControl: "crm.communications.consentFoundation.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmCommunicationConsentFoundationFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmCommunicationConsentFoundationFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmCommunicationConsentFoundationError extends Error {
  readonly code: UnifiedCrmCommunicationConsentFoundationFailureCode;
  readonly contractVersion = UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmCommunicationConsentFoundationFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmCommunicationConsentFoundationError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
