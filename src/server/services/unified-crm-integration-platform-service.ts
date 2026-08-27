import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_INTEGRATION_PLATFORM_CONTRACT_VERSION,
  UnifiedCrmIntegrationPlatformError,
  type UnifiedCrmIntegrationPlatformCheck,
  type UnifiedCrmIntegrationPlatformReadModel,
  type UnifiedCrmIntegrationProviderGate
} from "@/server/unified-crm/integration-platform-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmIntegrationPlatformCheck[] = [
  {
    capability: "credentialIsolation",
    evidence: "Integration credentials must be stored outside UI state and never returned in read models, logs, fixtures, or error envelopes.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "tenantMapping",
    evidence: "Every adapter request must resolve one organization scope before provider account lookup, sync, delivery, replay, or webhook acceptance.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "adapterInterface",
    evidence: "Provider families share one contract vocabulary for authorization, sync cursor, delivery attempt, inbound event, health, and disablement.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "idempotency",
    evidence: "Outbound sends, sync imports, webhook processing, and replay attempts must bind idempotency to organization, provider, subject, purpose, and payload hash.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "deliverySyncState",
    evidence: "External activity can be queued, sent, delivered, failed, revoked, conflicted, reconciled, or disabled without claiming success from an API response alone.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "retryReplay",
    evidence: "Retries must be bounded, replay-safe, and visible; a provider timeout can never duplicate a customer communication or overwrite source truth.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "reconciliation",
    evidence: "Provider state must reconcile against CRM envelopes and source-owned domains before dashboards, activity, or next actions treat it as current.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "rateLimits",
    evidence: "Each provider family requires rate, cost, quiet-hour, abuse, and backoff controls before activation.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "webhookValidation",
    evidence: "Inbound provider events require signature verification, tenant/provider mapping, replay protection, and dead-letter visibility before processing.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "audit",
    evidence: "Connector actions must write purpose, actor/system identity, provider family, external reference, consent basis, and correlation identifiers without storing secrets.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "killSwitch",
    evidence: "The default integration feature control is disabled and every provider family must fail closed with a visible disabled state.",
    holdOwner: null,
    status: "PASS"
  },
  {
    capability: "providerActivation",
    evidence: "Provider-specific approval, credentials, legal/consent review, browser proof, and rollback rehearsal remain required before any live external side effect.",
    holdOwner: "product-owner",
    status: "HOLD"
  }
];

const PROVIDER_GATES: UnifiedCrmIntegrationProviderGate[] = [
  {
    activationState: "HELD",
    family: "EMAIL_CALENDAR",
    reason: "No approved provider A/B, OAuth scope, sync direction, backfill window, or revoke policy has been selected.",
    requiredMilestone: "UCRM-081"
  },
  {
    activationState: "HELD",
    family: "SMS",
    reason: "No SMS vendor, consent text, opt-out behavior, quiet hours, or cost guardrail has been approved.",
    requiredMilestone: "UCRM-083"
  },
  {
    activationState: "HELD",
    family: "TELEPHONY_TRANSCRIPTION",
    reason: "No calling provider, recording consent policy, retention period, or transcription access boundary has been approved.",
    requiredMilestone: "UCRM-084"
  },
  {
    activationState: "HELD",
    family: "E_SIGNATURE",
    reason: "No envelope authority, signer identity policy, provider, or immutable evidence mapping has been approved.",
    requiredMilestone: "UCRM-085"
  },
  {
    activationState: "HELD",
    family: "ACCOUNTING_DMS",
    reason: "No named accounting or DMS system, source ownership map, conflict rule, or reconciliation target has been approved.",
    requiredMilestone: "UCRM-086"
  }
];

export async function getUnifiedCrmIntegrationPlatform(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmIntegrationPlatformReadModel> {
  if (!actor) {
    throw new UnifiedCrmIntegrationPlatformError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM integration platform readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmIntegrationPlatformError(
      "INTEGRATION_PLATFORM_NOT_AUTHORIZED",
      "CRM integration platform readiness is available to the manager workspace."
    );
  }

  const checks = CHECKS.map((check) => ({ ...check }));
  return {
    checks,
    contractVersion: UNIFIED_CRM_INTEGRATION_PLATFORM_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    providerGates: PROVIDER_GATES.map((gate) => ({ ...gate })),
    rollback: {
      defaultState: "DISABLED",
      featureControl: "crm.integrations.enabled",
      posture: "fail-closed"
    },
    state: checks.some((check) => check.status === "HOLD") ? "HELD" : "PASS",
    visibility: "management"
  };
}
