import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmOpportunityDetailRepository,
  type UnifiedCrmOpportunityDetailRepository
} from "@/server/repositories/unified-crm-opportunity-detail-repository";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { listAllowedUnifiedCrmOpportunityTransitions } from "@/server/unified-crm/opportunity-lifecycle";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";
import {
  UNIFIED_CRM_OPPORTUNITY_TRANSITION_CONTRACT_VERSION,
  type UnifiedCrmOpportunityTransitionReviewModel
} from "@/server/unified-crm/opportunity-transition-contract";

type Dependencies = {
  accessContext?: UnifiedCrmOpportunityAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmOpportunityDetailRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
  shellMode?: unknown;
};

export async function getUnifiedCrmOpportunityTransitionReview(
  actor: AuthenticatedUser | null,
  opportunityId: string,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityTransitionReviewModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const visibility = access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";
  const requestedOpportunityId = normalizeUnifiedCrmOpportunityId(opportunityId);
  const repository = dependencies.repository ?? createUnifiedCrmOpportunityDetailRepository();
  const record = await repository.findOpportunityDetail({
    opportunityId: requestedOpportunityId,
    organizationId: access.organizationId,
    recordScope: access.recordScope
  });
  if (!record) {
    throw Object.assign(new Error("Opportunity transition record is not available."), { code: "OPPORTUNITY_NOT_AVAILABLE" });
  }
  const allowedNextStages = listAllowedUnifiedCrmOpportunityTransitions(record.stage);

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_TRANSITION_CONTRACT_VERSION,
    state: "LIVE_TRANSITION",
    generatedAt,
    requestedOpportunityId,
    visibility,
    source: {
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity transition review",
      observedAt: generatedAt
    },
    headline: {
      title: "Move opportunity to the next governed stage",
      detail: "Choose an approved next stage, record the evidence, and keep the opportunity versioned before any downstream handoff."
    },
    currentState: {
      allowedNextStages,
      label: "Current lifecycle state",
      detail: allowedNextStages.length
        ? `Current stage is ${record.stage.replaceAll("_", " ").toLowerCase()}; ${allowedNextStages.length} approved next move(s) are available.`
        : `Current stage is ${record.stage.replaceAll("_", " ").toLowerCase()}; terminal opportunities require manager reopen controls before movement.`,
      nextActionDueAt: record.nextActionDueAt?.toISOString() ?? null,
      nextActionLabel: record.nextActionLabel,
      stage: record.stage,
      status: "READY",
      version: record.version
    },
    transitionChecks: [
      {
        id: "allowed-edge",
        label: "Allowed stage change",
        detail: "The target stage must be one approved path from the current stage.",
        state: "REQUIRED"
      },
      {
        id: "evidence",
        label: "Required evidence",
        detail: "Active stages require next action and due time. Won requires acceptance evidence and handoff target. Lost requires a reason.",
        state: "REQUIRED"
      },
      {
        id: "next-action",
        label: "Next action stays clear",
        detail: "Every move will keep the next action and due commitment visible so the opportunity never advances into ambiguity.",
        state: "REQUIRED"
      },
      {
        id: "audit",
        label: "Audit and rollback",
        detail: "Every live transition will be reviewable and reversible through governed audit and rollback controls.",
        state: "REQUIRED"
      }
    ],
    governance: [
      "Every live stage move uses the CRM opportunity transition command.",
      "Optimistic version checks stop stale screens from overwriting newer opportunity updates.",
      "Task, Appointment, and Dispatch state never becomes an implicit stage transition."
    ],
    nextUnlocks: [
      "Use this same command from the visual pipeline board in UCRM-033.",
      "Connect transition activity to tasks, appointments, and dispatch only after their bridge milestones are verified."
    ],
    transitionAction: {
      label: "Move to next stage",
      state: "READY"
    }
  };
}
