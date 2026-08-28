import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_CONTRACT_VERSION,
  UnifiedCrmAiReceptionistRequirementsError,
  type UnifiedCrmAiReceptionistRequirement,
  type UnifiedCrmAiReceptionistRequirementsReadModel
} from "@/server/unified-crm/ai-receptionist-requirements-contract";

type Dependencies = { now?: () => Date };

const requirements: UnifiedCrmAiReceptionistRequirement[] = [
  {
    id: "consent-before-ai-contact",
    category: "CONSENT",
    state: "HELD",
    title: "Consent before AI communication",
    requirement: "The assistant must check consent, opt-out, suppression, contact purpose, and quiet-hours eligibility before any communication.",
    blockedBehavior: "No live call answer, outbound text, outbound email, or automated callback.",
    requiredDecision: "Approve consent UX, customer disclosure wording, opt-out handling, and suppressed-customer behavior."
  },
  {
    id: "human-handoff-required",
    category: "HUMAN_HANDOFF",
    state: "CONTRACTED",
    title: "Human handoff is always available",
    requirement: "The assistant must route uncertain, upset, legal, payment, safety, or manager-request scenarios to a human queue.",
    blockedBehavior: "No autonomous resolution for escalated customer issues.",
    requiredDecision: null
  },
  {
    id: "bounded-customer-retrieval",
    category: "RETRIEVAL",
    state: "HELD",
    title: "Bounded customer and vehicle retrieval",
    requirement: "The assistant can only use permitted Customer 360, appointment, job/dispatch, and quote summaries approved for the active organization.",
    blockedBehavior: "No unrestricted database lookup, no cross-tenant context, and no restricted notes unless explicitly authorized.",
    requiredDecision: "Approve exactly which CRM/dispatch fields can be retrieved for receptionist conversations."
  },
  {
    id: "no-action-default",
    category: "NO_ACTION_DEFAULT",
    state: "CONTRACTED",
    title: "No-action default",
    requirement: "When evidence, consent, identity, confidence, or authority is missing, the assistant must abstain and create a human review handoff.",
    blockedBehavior: "No appointment scheduling, quote approval, promise, discount, or customer commitment without allowed authority.",
    requiredDecision: null
  },
  {
    id: "audit-every-turn",
    category: "AUDIT",
    state: "HELD",
    title: "Auditable receptionist transcript and decision trail",
    requirement: "Every assistant interaction must record source references, safety checks, handoff reason, and final disposition under approved retention.",
    blockedBehavior: "No unlogged AI customer communication.",
    requiredDecision: "Approve transcript retention, restricted access, deletion/export behavior, and review ownership."
  },
  {
    id: "cost-budget-control",
    category: "COST",
    state: "HELD",
    title: "Voice/text/AI spend guardrail",
    requirement: "The assistant must respect monthly spend caps, channel rate limits, and emergency shutoff.",
    blockedBehavior: "No unlimited AI minutes, transcription, outbound text, or provider traffic.",
    requiredDecision: "Approve monthly AI receptionist budget, warning thresholds, and automatic shutoff behavior."
  }
];

export async function getUnifiedCrmAiReceptionistRequirements(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmAiReceptionistRequirementsReadModel> {
  if (!actor) throw new UnifiedCrmAiReceptionistRequirementsError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM AI receptionist requirements.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmAiReceptionistRequirementsError("AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED", "CRM AI receptionist requirements are available to the manager workspace.");
  }

  const snapshot = requirements.map((requirement) => ({ ...requirement }));
  return {
    contractVersion: UNIFIED_CRM_AI_RECEPTIONIST_REQUIREMENTS_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: "HELD",
    visibility: "management",
    activation: {
      liveCallsEnabled: false,
      liveTextsEnabled: false,
      autonomousActionsEnabled: false,
      simulatorAllowed: true
    },
    requirements: snapshot,
    summary: {
      heldRequirementCount: snapshot.filter((requirement) => requirement.state === "HELD").length,
      contractedRequirementCount: snapshot.filter((requirement) => requirement.state === "CONTRACTED").length,
      liveBehaviorBlocked: true
    },
    rollback: {
      fallback: "human-reception-and-manual-crm-outcome",
      featureControl: "crm.ai.receptionist.enabled",
      posture: "fail-closed"
    }
  };
}
