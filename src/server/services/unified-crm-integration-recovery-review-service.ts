import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_CONTRACT_VERSION,
  UnifiedCrmIntegrationRecoveryReviewError,
  type UnifiedCrmIntegrationRecoveryItem,
  type UnifiedCrmIntegrationRecoveryReviewReadModel
} from "@/server/unified-crm/integration-recovery-review-contract";

type Dependencies = { now?: () => Date };

const reviewItems: Omit<UnifiedCrmIntegrationRecoveryItem, "externalReplayEnabled">[] = [
  {
    id: "email-calendar-oauth-held",
    providerArea: "EMAIL_CALENDAR",
    queue: "RECONCILIATION",
    state: "HELD",
    customerImpact: "NONE_VISIBLE",
    title: "Mailbox/calendar sync not connected",
    detail: "OAuth, backfill, and sync conflict rules are not approved, so no provider events are imported.",
    safeNextStep: "Complete provider decision intake before enabling sync reconciliation.",
    sourceHref: "/api/crm/v1/admin/provider-decision-intake"
  },
  {
    id: "sms-delivery-retry-held",
    providerArea: "SMS",
    queue: "RETRY",
    state: "HELD",
    customerImpact: "POSSIBLE_DUPLICATE_RISK",
    title: "SMS retry replay is disabled",
    detail: "Delivery retries stay blocked until consent, quiet hours, idempotency, and cost caps are approved.",
    safeNextStep: "Use manual customer follow-up and record the outcome after contact.",
    sourceHref: "/api/crm/v1/communications/sms-templates"
  },
  {
    id: "telephony-transcript-dead-letter-held",
    providerArea: "TELEPHONY",
    queue: "DEAD_LETTER",
    state: "BLOCKED",
    customerImpact: "SOURCE_TRUTH_CONFLICT",
    title: "Call recording/transcription dead-letter review is unavailable",
    detail: "Recording consent, retention, restricted access, and AI receptionist boundaries are not approved.",
    safeNextStep: "Continue with manual call disposition and do not import transcripts.",
    sourceHref: "/api/crm/v1/communications/manual-call-disposition"
  }
];

export async function getUnifiedCrmIntegrationRecoveryReview(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmIntegrationRecoveryReviewReadModel> {
  if (!actor) throw new UnifiedCrmIntegrationRecoveryReviewError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM integration recovery review.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmIntegrationRecoveryReviewError("INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED", "CRM integration recovery review is available to the manager workspace.");
  }

  const items = reviewItems.map((item) => ({ ...item, externalReplayEnabled: false as const }));
  return {
    contractVersion: UNIFIED_CRM_INTEGRATION_RECOVERY_REVIEW_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: "READY_REVIEW",
    visibility: "management",
    summary: {
      reviewItemCount: items.length,
      retryReplayEnabled: false,
      reconciliationOnly: true,
      manualReviewRequired: true
    },
    items,
    rollback: {
      fallback: "manual-integration-recovery-review",
      featureControl: "crm.admin.integrationRecovery.enabled",
      posture: "read-only-no-replay"
    }
  };
}
