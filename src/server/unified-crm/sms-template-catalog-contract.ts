export const UNIFIED_CRM_SMS_TEMPLATE_CATALOG_CONTRACT_VERSION = "ucrm.sms-template-catalog/v1" as const;
export const UNIFIED_CRM_SMS_TEMPLATE_CATALOG_ERROR_CONTRACT_VERSION = "ucrm.sms-template-catalog-error/v1" as const;

export type UnifiedCrmSmsTemplateStatus = "DRAFT_REVIEW" | "HELD_FOR_APPROVAL";
export type UnifiedCrmSmsTemplatePurpose = "APPOINTMENT_REMINDER" | "VEHICLE_UPDATE" | "FOLLOW_UP" | "MISSED_CALL";

export type UnifiedCrmSmsTemplateCatalogItem = {
  id: string;
  body: string;
  maxSegments: number;
  purpose: UnifiedCrmSmsTemplatePurpose;
  requiredConsent: "SMS_OPT_IN";
  status: UnifiedCrmSmsTemplateStatus;
};

export type UnifiedCrmSmsTemplateCatalogCheck = {
  category: "templateVersioning" | "purposeLabel" | "consentReminder" | "stopLanguage" | "segmentLimit" | "sendDisabled" | "audit";
  evidence: string;
  holdOwner: string | null;
  status: "PASS" | "HOLD";
};

export type UnifiedCrmSmsTemplateCatalogReadModel = {
  activation: {
    catalogReviewEnabled: true;
    templatePublishEnabled: false;
    outboundSmsEnabled: false;
    state: "IMPLEMENTED_UNVERIFIED";
  };
  checks: UnifiedCrmSmsTemplateCatalogCheck[];
  contractVersion: typeof UNIFIED_CRM_SMS_TEMPLATE_CATALOG_CONTRACT_VERSION;
  generatedAt: string;
  templates: UnifiedCrmSmsTemplateCatalogItem[];
  rollback: {
    fallback: "manual-contact-outcome-with-no-sms-delivery";
    featureControl: "crm.communications.smsTemplateCatalog.enabled";
    posture: "review-only";
  };
  state: "IMPLEMENTED_UNVERIFIED";
  visibility: "management";
};

export type UnifiedCrmSmsTemplateCatalogFailureCode = "AUTHENTICATION_REQUIRED" | "SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmSmsTemplateCatalogFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED: 403
};

export class UnifiedCrmSmsTemplateCatalogError extends Error {
  readonly code: UnifiedCrmSmsTemplateCatalogFailureCode;
  readonly contractVersion = UNIFIED_CRM_SMS_TEMPLATE_CATALOG_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmSmsTemplateCatalogFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmSmsTemplateCatalogError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
