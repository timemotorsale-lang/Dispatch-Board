import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_CONTRACT_VERSION,
  UnifiedCrmEmailCalendarProviderBError,
  type UnifiedCrmEmailCalendarProviderBReadModel,
  type UnifiedCrmEmailCalendarProviderBReadinessCheck
} from "@/server/unified-crm/email-calendar-provider-b-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmEmailCalendarProviderBReadinessCheck[] = [
  {
    category: "independentProviderSelection",
    evidence: "Provider B must be approved independently; Provider A approval does not select or authorize this provider.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "separateOauthApproval",
    evidence: "Provider B OAuth scopes, consent screen, token storage, refresh, and revoke behavior require separate security approval.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "leastPrivilegeComparison",
    evidence: "Provider B must prove equal or stronger least-privilege behavior for every enabled mail/calendar capability.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "syncConflictSeparation",
    evidence: "Provider B sync cannot reuse Provider A conflict rules unless those rules are explicitly approved for this provider.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "dedupeIsolation",
    evidence: "Provider B dedupe keys must include provider identity so events from two providers cannot collapse incorrectly.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "revokeAndFallback",
    evidence: "Provider B disconnect must disable its own sync/send path without disabling Provider A or manual CRM fallbacks.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "retryReplayIsolation",
    evidence: "Provider B retries must bind to provider-specific idempotency keys and cannot replay through another provider family.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "reconciliation",
    evidence: "Provider B must reconcile independently against CRM envelopes and source-owned domains before claims become current.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "securityPrivacy",
    evidence: "Provider B payload redaction, webhook validation, restricted-field masking, and provider-log access remain gated.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "browserProof",
    evidence: "Authenticated browser proof remains pending because no second provider has been selected.",
    holdOwner: "quality",
    status: "HOLD"
  },
  {
    category: "rollback",
    evidence: "Rollback must prove disabling Provider B returns users to manual contact outcomes and source calendars.",
    holdOwner: "operations",
    status: "HOLD"
  }
];

export async function getUnifiedCrmEmailCalendarProviderB(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmEmailCalendarProviderBReadModel> {
  if (!actor) {
    throw new UnifiedCrmEmailCalendarProviderBError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM second email and calendar provider readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmEmailCalendarProviderBError(
      "EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED",
      "CRM second email and calendar provider readiness is available to the manager workspace."
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
    contractVersion: UNIFIED_CRM_EMAIL_CALENDAR_PROVIDER_B_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    independence: {
      doesNotInheritProviderAApproval: true,
      requiresSeparateCredentials: true,
      requiresSeparateRollbackProof: true
    },
    rollback: {
      fallback: "manual-contact-outcome-and-source-calendar",
      featureControl: "crm.integrations.emailCalendar.providerB.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
