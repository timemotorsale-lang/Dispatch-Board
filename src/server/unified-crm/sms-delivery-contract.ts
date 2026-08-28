export const UNIFIED_CRM_SMS_DELIVERY_CONTRACT_VERSION = "ucrm.sms-delivery/v1" as const;
export const UNIFIED_CRM_SMS_DELIVERY_ERROR_CONTRACT_VERSION = "ucrm.sms-delivery-error/v1" as const;

export type UnifiedCrmSmsDeliveryReadinessStatus = "PASS" | "HOLD";

export type UnifiedCrmSmsDeliveryCheck = {
  category:
    | "vendorSelection"
    | "consentOptOut"
    | "templateGovernance"
    | "quietHours"
    | "inboundCorrelation"
    | "deliveryStates"
    | "retryFailure"
    | "audit"
    | "costRateControls"
    | "killSwitch"
    | "browserProof";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmSmsDeliveryReadinessStatus;
};

export type UnifiedCrmSmsDeliveryReadModel = {
  activation: {
    inboundSmsEnabled: false;
    outboundSmsEnabled: false;
    providerName: null;
    state: "HELD";
  };
  checks: UnifiedCrmSmsDeliveryCheck[];
  contractVersion: typeof UNIFIED_CRM_SMS_DELIVERY_CONTRACT_VERSION;
  generatedAt: string;
  guardrails: {
    costCapCents: null;
    quietHoursPolicy: "HELD";
    requiredConsentBasis: "explicit-channel-purpose";
    stopKeywordRequired: true;
  };
  rollback: {
    fallback: "manual-contact-outcome-and-phone-call";
    featureControl: "crm.integrations.sms.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmSmsDeliveryFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "SMS_DELIVERY_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmSmsDeliveryFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  SMS_DELIVERY_NOT_AUTHORIZED: 403
};

export class UnifiedCrmSmsDeliveryError extends Error {
  readonly code: UnifiedCrmSmsDeliveryFailureCode;
  readonly contractVersion = UNIFIED_CRM_SMS_DELIVERY_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmSmsDeliveryFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmSmsDeliveryError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
