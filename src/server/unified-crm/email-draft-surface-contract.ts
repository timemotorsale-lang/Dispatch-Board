export const UNIFIED_CRM_EMAIL_DRAFT_SURFACE_CONTRACT_VERSION = "ucrm.email-draft-surface/v1" as const;
export const UNIFIED_CRM_EMAIL_DRAFT_SURFACE_ERROR_CONTRACT_VERSION = "ucrm.email-draft-surface-error/v1" as const;

export type UnifiedCrmEmailDraftSurfaceCheckStatus = "PASS" | "HOLD";
export type UnifiedCrmEmailDraftSurfaceCheck = {
  category: "draftOnly" | "customerContext" | "consentReminder" | "templateBoundary" | "providerSend" | "audit" | "fallback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmEmailDraftSurfaceCheckStatus;
};

export type UnifiedCrmEmailDraftSurfaceReadModel = {
  activation: {
    draftReviewEnabled: true;
    mailboxSyncEnabled: false;
    providerSendEnabled: false;
    state: "IMPLEMENTED_UNVERIFIED";
  };
  checks: UnifiedCrmEmailDraftSurfaceCheck[];
  contractVersion: typeof UNIFIED_CRM_EMAIL_DRAFT_SURFACE_CONTRACT_VERSION;
  generatedAt: string;
  sampleDraft: {
    body: string;
    subject: string;
    warning: "Draft only — not sent.";
  };
  rollback: {
    fallback: "manual-email-outside-crm-and-manual-contact-outcome";
    featureControl: "crm.communications.emailDraftSurface.enabled";
    posture: "review-only";
  };
  state: "IMPLEMENTED_UNVERIFIED";
  visibility: "management";
};

export type UnifiedCrmEmailDraftSurfaceFailureCode = "AUTHENTICATION_REQUIRED" | "EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED";
const FAILURE_STATUS: Record<UnifiedCrmEmailDraftSurfaceFailureCode, number> = { AUTHENTICATION_REQUIRED: 401, EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED: 403 };

export class UnifiedCrmEmailDraftSurfaceError extends Error {
  readonly code: UnifiedCrmEmailDraftSurfaceFailureCode;
  readonly contractVersion = UNIFIED_CRM_EMAIL_DRAFT_SURFACE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;
  constructor(code: UnifiedCrmEmailDraftSurfaceFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmEmailDraftSurfaceError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
