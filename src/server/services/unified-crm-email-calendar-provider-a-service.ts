import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_CONTRACT_VERSION,
  UnifiedCrmEmailCalendarProviderAError,
  type UnifiedCrmEmailCalendarProviderAReadModel,
  type UnifiedCrmEmailCalendarProviderAReadinessCheck
} from "@/server/unified-crm/email-calendar-provider-a-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmEmailCalendarProviderAReadinessCheck[] = [
  {
    category: "providerSelection",
    evidence: "Provider A remains unselected; no Google, Microsoft, or other provider behavior is inferred.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "oauthLeastPrivilege",
    evidence: "OAuth scopes must be approved per provider before authorization URLs, token exchange, refresh, or revoke are implemented.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "consentPurpose",
    evidence: "Customer contact purpose, suppression, opt-out, and audit checks remain mandatory immediately before any production send.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "syncDirection",
    evidence: "Read/write direction and field ownership must be approved so provider events cannot overwrite source-owned Customer or Appointment truth.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "backfillWindow",
    evidence: "Backfill window, historical message visibility, and calendar import bounds are not yet approved.",
    holdOwner: "data-owner",
    status: "HOLD"
  },
  {
    category: "dedupeConflict",
    evidence: "Dedupe keys and conflict handling must be provider-specific and reconciliation-backed.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "revokeDisconnect",
    evidence: "Disconnect must disable sync/send, preserve audit, and expose degraded state before any provider is authorized.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "retryReconciliation",
    evidence: "Retry/replay must use the UCRM-080 idempotency and reconciliation contract before live provider calls are enabled.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "securityPrivacy",
    evidence: "Token storage, payload redaction, restricted-field visibility, webhook validation, and provider-log access remain gated.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "browserProof",
    evidence: "Authenticated browser proof remains pending because no provider has been approved or connected.",
    holdOwner: "quality",
    status: "HOLD"
  },
  {
    category: "rollback",
    evidence: "Rollback falls back to manual contact outcomes and source calendar workflows with provider feature control disabled.",
    holdOwner: null,
    status: "PASS"
  }
];

export async function getUnifiedCrmEmailCalendarProviderA(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmEmailCalendarProviderAReadModel> {
  if (!actor) {
    throw new UnifiedCrmEmailCalendarProviderAError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM email and calendar provider readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmEmailCalendarProviderAError(
      "EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED",
      "CRM email and calendar provider readiness is available to the manager workspace."
    );
  }

  return {
    activation: {
      calendarWriteEnabled: false,
      externalSendEnabled: false,
      inboundSyncEnabled: false,
      providerName: null,
      state: "HELD"
    },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_A_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: {
      fallback: "manual-contact-outcome-and-source-calendar",
      featureControl: "crm.integrations.emailCalendar.providerA.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
