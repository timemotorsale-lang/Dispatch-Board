import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_EMAIL_DRAFT_SURFACE_CONTRACT_VERSION,
  UnifiedCrmEmailDraftSurfaceError,
  type UnifiedCrmEmailDraftSurfaceCheck,
  type UnifiedCrmEmailDraftSurfaceReadModel
} from "@/server/unified-crm/email-draft-surface-contract";

type Dependencies = { now?: () => Date };

const checks: UnifiedCrmEmailDraftSurfaceCheck[] = [
  { category: "draftOnly", evidence: "Email content may be prepared as a review-only draft and must never be labeled sent.", holdOwner: null, status: "PASS" },
  { category: "customerContext", evidence: "Draft context must come from permitted customer/opportunity read models and avoid restricted fields.", holdOwner: null, status: "PASS" },
  { category: "consentReminder", evidence: "Draft surfaces must show consent/suppression readiness before any future send action.", holdOwner: null, status: "PASS" },
  { category: "templateBoundary", evidence: "Approved templates and free-form rules remain pending before production send.", holdOwner: "product-owner", status: "HOLD" },
  { category: "providerSend", evidence: "Provider send remains disabled until UCRM-081/provider approval and UCRM-110 consent gates pass.", holdOwner: "product-owner", status: "HOLD" },
  { category: "audit", evidence: "Draft preview/open/save audit policy remains pending before persisted draft commands are added.", holdOwner: "security-privacy", status: "HOLD" },
  { category: "fallback", evidence: "Fallback remains manual email outside CRM plus manual contact outcome capture.", holdOwner: null, status: "PASS" }
];

export async function getUnifiedCrmEmailDraftSurface(actor: AuthenticatedUser | null, dependencies: Dependencies = {}): Promise<UnifiedCrmEmailDraftSurfaceReadModel> {
  if (!actor) throw new UnifiedCrmEmailDraftSurfaceError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM email draft readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmEmailDraftSurfaceError("EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED", "CRM email draft readiness is available to the manager workspace.");
  return {
    activation: { draftReviewEnabled: true, mailboxSyncEnabled: false, providerSendEnabled: false, state: "IMPLEMENTED_UNVERIFIED" },
    checks: checks.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_EMAIL_DRAFT_SURFACE_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "manual-email-outside-crm-and-manual-contact-outcome", featureControl: "crm.communications.emailDraftSurface.enabled", posture: "review-only" },
    sampleDraft: {
      body: "Hi {{customerName}}, quick update from Time Motor Sales: {{nextStep}}. Reply or call us if you have questions.",
      subject: "Update from Time Motor Sales",
      warning: "Draft only — not sent."
    },
    state: "IMPLEMENTED_UNVERIFIED",
    visibility: "management"
  };
}
