export const UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_CONTRACT_VERSION = "ucrm.email-calendar-provider-b/v1" as const;
export const UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_ERROR_CONTRACT_VERSION = "ucrm.email-calendar-provider-b-error/v1" as const;

export type UnifiedCrmEmailCalendarProviderBReadinessStatus = "PASS" | "HOLD";

export type UnifiedCrmEmailCalendarProviderBReadinessCheck = {
  category:
    | "independentProviderSelection"
    | "separateOauthApproval"
    | "leastPrivilegeComparison"
    | "syncConflictSeparation"
    | "dedupeIsolation"
    | "revokeAndFallback"
    | "retryReplayIsolation"
    | "reconciliation"
    | "securityPrivacy"
    | "browserProof"
    | "rollback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmEmailCalendarProviderBReadinessStatus;
};

export type UnifiedCrmEmailCalendarProviderBReadModel = {
  activation: {
    externalSendEnabled: false;
    calendarWriteEnabled: false;
    inboundSyncEnabled: false;
    providerName: null;
    state: "HELD";
  };
  checks: UnifiedCrmEmailCalendarProviderBReadinessCheck[];
  contractVersion: typeof UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_CONTRACT_VERSION;
  generatedAt: string;
  independence: {
    doesNotInheritProviderAApproval: true;
    requiresSeparateCredentials: true;
    requiresSeparateRollbackProof: true;
  };
  rollback: {
    fallback: "manual-contact-outcome-and-source-calendar";
    featureControl: "crm.integrations.emailCalendar.providerB.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmEmailCalendarProviderBFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmEmailCalendarProviderBFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED: 403
};

export class UnifiedCrmEmailCalendarProviderBError extends Error {
  readonly code: UnifiedCrmEmailCalendarProviderBFailureCode;
  readonly contractVersion = UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmEmailCalendarProviderBFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmEmailCalendarProviderBError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
