import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_SMS_TEMPLATE_CATALOG_CONTRACT_VERSION,
  UnifiedCrmSmsTemplateCatalogError,
  type UnifiedCrmSmsTemplateCatalogCheck,
  type UnifiedCrmSmsTemplateCatalogReadModel
} from "@/server/unified-crm/sms-template-catalog-contract";

type Dependencies = { now?: () => Date };

const checks: UnifiedCrmSmsTemplateCatalogCheck[] = [
  { category: "templateVersioning", evidence: "SMS templates must be versioned before publishing so old messages keep their original wording.", holdOwner: "product-owner", status: "HOLD" },
  { category: "purposeLabel", evidence: "Every template has a purpose label for consent and audit review.", holdOwner: null, status: "PASS" },
  { category: "consentReminder", evidence: "Templates require SMS opt-in and cannot bypass suppression checks.", holdOwner: null, status: "PASS" },
  { category: "stopLanguage", evidence: "STOP/START wording must be approved before SMS activation.", holdOwner: "security-privacy", status: "HOLD" },
  { category: "segmentLimit", evidence: "Segment limits are visible so costs and customer experience can be reviewed before send.", holdOwner: null, status: "PASS" },
  { category: "sendDisabled", evidence: "Outbound SMS remains disabled until UCRM-083 and UCRM-110 gates pass.", holdOwner: null, status: "PASS" },
  { category: "audit", evidence: "Template publish/edit audit is pending before template mutation is added.", holdOwner: "security-privacy", status: "HOLD" }
];

export async function getUnifiedCrmSmsTemplateCatalog(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmSmsTemplateCatalogReadModel> {
  if (!actor) throw new UnifiedCrmSmsTemplateCatalogError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM SMS template catalog.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmSmsTemplateCatalogError("SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED", "CRM SMS template catalog is available to the manager workspace.");
  }

  return {
    activation: { catalogReviewEnabled: true, outboundSmsEnabled: false, templatePublishEnabled: false, state: "IMPLEMENTED_UNVERIFIED" },
    checks: checks.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_SMS_TEMPLATE_CATALOG_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "manual-contact-outcome-with-no-sms-delivery", featureControl: "crm.communications.smsTemplateCatalog.enabled", posture: "review-only" },
    state: "IMPLEMENTED_UNVERIFIED",
    templates: [
      { id: "vehicle-update", body: "Hi {{customerName}}, quick update from Time Motor Sales: {{vehicleStatus}}. Reply STOP to opt out.", maxSegments: 2, purpose: "VEHICLE_UPDATE", requiredConsent: "SMS_OPT_IN", status: "HELD_FOR_APPROVAL" },
      { id: "appointment-reminder", body: "Reminder: your appointment with Time Motor Sales is {{appointmentTime}}. Reply STOP to opt out.", maxSegments: 2, purpose: "APPOINTMENT_REMINDER", requiredConsent: "SMS_OPT_IN", status: "HELD_FOR_APPROVAL" },
      { id: "missed-call", body: "Time Motor Sales tried to reach you about {{reason}}. Please call us when convenient. Reply STOP to opt out.", maxSegments: 2, purpose: "MISSED_CALL", requiredConsent: "SMS_OPT_IN", status: "DRAFT_REVIEW" }
    ],
    visibility: "management"
  };
}
