export const UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_CONTRACT_VERSION = "ucrm.email-calendar-provider-a/v1" as const;
export const UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_ERROR_CONTRACT_VERSION = "ucrm.email-calendar-provider-a-error/v1" as const;

export type UnifiedCrmEmailCalendarProviderAReadinessStatus = "PASS" | "HOLD";

export type UnifiedCrmEmailCalendarProviderAReadinessCheck = {
  category:
    | "providerSelection"
    | "oauthLeastPrivilege"
    | "consentPurpose"
    | "syncDirection"
    | "backfillWindow"
    | "dedupeConflict"
    | "revokeDisconnect"
    | "retryReconciliation"
    | "securityPrivacy"
    | "browserProof"
    | "rollback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmEmailCalendarProviderAReadinessStatus;
};

export type UnifiedCrmEmailCalendarProviderAReadModel = {
  activation: {
    externalSendEnabled: false;
    calendarWriteEnabled: false;
    inboundSyncEnabled: false;
    providerName: null;
    state: "HELD";
  };
  checks: UnifiedCrmEmailCalendarProviderAReadinessCheck[];
  contractVersion: typeof UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_CONTRACT_VERSION;
  generatedAt: string;
  rollback: {
    fallback: "manual-contact-outcome-and-source-calendar";
    featureControl: "crm.integrations.emailCalendar.providerA.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmEmailCalendarProviderAFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmEmailCalendarProviderAFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED: 403
};

export class UnifiedCrmEmailCalendarProviderAError extends Error {
  readonly code: UnifiedCrmEmailCalendarProviderAFailureCode;
  readonly contractVersion = UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmEmailCalendarProviderAFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmEmailCalendarProviderAError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
