import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_CONTRACT_VERSION,
  UnifiedCrmAiReceptionistSimulatorError,
  type UnifiedCrmAiReceptionistScenario,
  type UnifiedCrmAiReceptionistSimulatorReadModel
} from "@/server/unified-crm/ai-receptionist-simulator-contract";

type Dependencies = { now?: () => Date };

const scenarios: UnifiedCrmAiReceptionistScenario[] = [
  {
    id: "repair-status-safe-answer",
    title: "Customer asks for repair status",
    channel: "PHONE",
    customerIntent: "STATUS_REQUEST",
    simulationOnly: true,
    expectedDisposition: "ANSWER_WITH_SAFE_CONTEXT",
    allowedContext: ["Customer 360 summary", "Open repair order stage", "next promised follow-up if visible"],
    blockedActions: ["No new promise", "No price approval", "No dispatch movement"],
    sampleSafeResponse: "I can share the visible status and have a service advisor follow up if anything needs confirmation."
  },
  {
    id: "appointment-request-handoff",
    title: "Customer asks to schedule or change appointment",
    channel: "SMS",
    customerIntent: "APPOINTMENT_REQUEST",
    simulationOnly: true,
    expectedDisposition: "HANDOFF_TO_HUMAN",
    allowedContext: ["Customer identity confirmation", "available appointment summary if permitted"],
    blockedActions: ["No autonomous appointment booking", "No cancellation", "No advisor assignment"],
    sampleSafeResponse: "I’ll send this to the team so they can confirm the appointment time for you."
  },
  {
    id: "price-question-abstain",
    title: "Customer asks for final price or discount",
    channel: "PHONE",
    customerIntent: "PRICE_QUESTION",
    simulationOnly: true,
    expectedDisposition: "ABSTAIN_AND_LOG",
    allowedContext: ["Presented quote summary if visible", "approved public estimate status"],
    blockedActions: ["No discount", "No price commitment", "No quote approval"],
    sampleSafeResponse: "A team member needs to confirm pricing before we make a commitment. I’ll have them follow up."
  },
  {
    id: "complaint-manager-handoff",
    title: "Upset customer asks for manager",
    channel: "PHONE",
    customerIntent: "COMPLAINT",
    simulationOnly: true,
    expectedDisposition: "HANDOFF_TO_HUMAN",
    allowedContext: ["Customer name", "open case summary if permitted", "manual callback path"],
    blockedActions: ["No blame assignment", "No settlement", "No policy exception"],
    sampleSafeResponse: "I’m going to route this to a manager so the right person can help you directly."
  },
  {
    id: "opt-out-log-only",
    title: "Customer says stop texting",
    channel: "SMS",
    customerIntent: "OPT_OUT",
    simulationOnly: true,
    expectedDisposition: "ABSTAIN_AND_LOG",
    allowedContext: ["Customer identity confirmation", "manual suppression handoff"],
    blockedActions: ["No automated suppression update until consent workflow is approved", "No follow-up text"],
    sampleSafeResponse: "I understand. I’ll make sure the team reviews this request right away."
  }
];

export async function getUnifiedCrmAiReceptionistSimulator(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmAiReceptionistSimulatorReadModel> {
  if (!actor) throw new UnifiedCrmAiReceptionistSimulatorError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM AI receptionist simulator.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmAiReceptionistSimulatorError("AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED", "CRM AI receptionist simulator is available to the manager workspace.");
  }

  return {
    contractVersion: UNIFIED_CRM_AI_RECEPTIONIST_SIMULATOR_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: "READY_REVIEW",
    visibility: "management",
    activation: {
      simulationEnabled: true,
      liveProviderTrafficEnabled: false,
      autonomousActionsEnabled: false
    },
    scenarios: scenarios.map((scenario) => ({ ...scenario, allowedContext: [...scenario.allowedContext], blockedActions: [...scenario.blockedActions] })),
    rollback: {
      fallback: "human-reception-and-manual-crm-outcome",
      featureControl: "crm.ai.receptionistSimulator.enabled",
      posture: "simulation-only"
    }
  };
}
