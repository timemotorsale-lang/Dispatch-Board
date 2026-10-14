import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_PROVIDER_DECISION_INTAKE_CONTRACT_VERSION,
  UnifiedCrmProviderDecisionIntakeError,
  type UnifiedCrmProviderDecisionIntakeReadModel,
  type UnifiedCrmProviderDecisionRequirement
} from "@/server/unified-crm/provider-decision-intake-contract";

type Dependencies = { now?: () => Date };

const requirements: UnifiedCrmProviderDecisionRequirement[] = [
  { channel: "EMAIL_CALENDAR", owner: "product-owner", requiredDecision: "Choose provider A/B and business purpose for mailbox and calendar access." },
  { channel: "EMAIL_CALENDAR", owner: "security-privacy", requiredDecision: "Approve least-privilege OAuth scopes, revoke behavior, payload redaction, and consent disclosure." },
  { channel: "EMAIL_CALENDAR", owner: "architecture", requiredDecision: "Approve sync direction, conflict rules, backfill window, idempotency, and reconciliation." },
  { channel: "SMS", owner: "product-owner", requiredDecision: "Choose SMS vendor, sender type, approved templates, monthly cost cap, and production rollout scope." },
  { channel: "SMS", owner: "security-privacy", requiredDecision: "Approve consent, suppression, STOP/START handling, quiet-hours policy, and opt-out audit." },
  { channel: "SMS", owner: "operations", requiredDecision: "Approve delivery failure handling, retry limits, dead-letter review, and emergency disablement." },
  { channel: "TELEPHONY", owner: "product-owner", requiredDecision: "Choose calling provider, number strategy, inbound routing, and AI receptionist scope." },
  { channel: "TELEPHONY", owner: "security-privacy", requiredDecision: "Approve recording consent, transcript access, restricted data masking, and customer opt-out behavior." },
  { channel: "TELEPHONY", owner: "data-owner", requiredDecision: "Approve retention/disposition handling for recordings and transcripts." }
];

export async function getUnifiedCrmProviderDecisionIntake(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmProviderDecisionIntakeReadModel> {
  if (!actor) throw new UnifiedCrmProviderDecisionIntakeError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM provider decision intake.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmProviderDecisionIntakeError("PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED", "CRM provider decision intake is available to the manager workspace.");
  }

  return {
    activation: {
      credentialEntryEnabled: false,
      productionActivationEnabled: false,
      providerSelectionEnabled: false,
      state: "HELD"
    },
    contractVersion: UNIFIED_CRM_PROVIDER_DECISION_INTAKE_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    requirements: requirements.map((requirement) => ({ ...requirement })),
    rollback: {
      fallback: "readiness-hub-and-manual-business-decision-register",
      featureControl: "crm.communications.providerDecisionIntake.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
