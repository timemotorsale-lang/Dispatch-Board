import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_CONVERSATION_ENVELOPE_CONTRACT_VERSION,
  UnifiedCrmConversationEnvelopeError,
  type UnifiedCrmConversationEnvelopeCheck,
  type UnifiedCrmConversationEnvelopeReadModel
} from "@/server/unified-crm/conversation-envelope-contract";

type Dependencies = { now?: () => Date };

const checks: UnifiedCrmConversationEnvelopeCheck[] = [
  {
    category: "storageAuthority",
    evidence: "Manual CRM outcomes use existing CustomerInteraction storage; future provider events require their own provider-event storage proof before import.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "manualOutcomeBridge",
    evidence: "Existing manual phone/text/email/meeting/visit outcomes can be treated as CRM conversation envelope items without external side effects.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "providerEventBoundary",
    evidence: "External provider event ingestion remains held until provider selection, webhook validation, idempotency, reconciliation, and retention are approved.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "customerLink",
    evidence: "Conversation visibility must resolve permitted customer access before exposing an envelope item.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "consentSnapshot",
    evidence: "Live provider messages require consent snapshot capture immediately before send/import; manual non-sending outcomes remain allowed.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "retention",
    evidence: "Provider message, recording, and transcript retention remains held under UCRM-DEC-014.",
    holdOwner: "data-owner",
    status: "HOLD"
  },
  {
    category: "audit",
    evidence: "Envelope items must preserve actor/system identity, purpose, channel, source authority, and correlation identifiers without provider secrets.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "reconciliation",
    evidence: "Provider-event reconciliation remains held; manual outcomes continue to use existing command/audit evidence.",
    holdOwner: "quality",
    status: "HOLD"
  }
];

export async function getUnifiedCrmConversationEnvelope(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmConversationEnvelopeReadModel> {
  if (!actor) throw new UnifiedCrmConversationEnvelopeError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM conversation envelope readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmConversationEnvelopeError("CONVERSATION_ENVELOPE_NOT_AUTHORIZED", "CRM conversation envelope readiness is available to the manager workspace.");
  }

  return {
    activation: {
      externalProviderEventImportEnabled: false,
      manualOutcomeEnvelopeEnabled: true,
      providerSendEnabled: false,
      state: "IMPLEMENTED_UNVERIFIED"
    },
    channels: ["EMAIL", "SMS", "PHONE", "MANUAL"],
    checks: checks.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_CONVERSATION_ENVELOPE_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: {
      fallback: "existing-customer-interaction-timeline",
      featureControl: "crm.communications.conversationEnvelope.enabled",
      posture: "read-only"
    },
    sourceAuthority: {
      manualOutcomes: "CustomerInteraction",
      providerEvents: "HELD"
    },
    state: "IMPLEMENTED_UNVERIFIED",
    visibility: "management"
  };
}
