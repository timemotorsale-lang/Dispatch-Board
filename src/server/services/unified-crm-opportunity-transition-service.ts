import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
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

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_TRANSITION_CONTRACT_VERSION,
    state: "HELD_REVIEW",
    generatedAt,
    requestedOpportunityId,
    visibility,
    source: {
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity transition review",
      observedAt: generatedAt
    },
    headline: {
      title: "Review the first governed opportunity transition flow",
      detail: "This shows how stage movement will be checked, explained, and audited before any live transition is enabled."
    },
    currentState: {
      label: "Current lifecycle state",
      detail: "The current and next stage remain intentionally held until the approved lifecycle graph exists.",
      status: "HELD"
    },
    transitionChecks: [
      {
        id: "allowed-edge",
        label: "Allowed stage change",
        detail: "The next stage must be one approved path from the current stage. That graph is still held.",
        state: "HELD"
      },
      {
        id: "evidence",
        label: "Required evidence",
        detail: "Each move will require the exact fields, approvals, or commitments defined by the business-approved lifecycle.",
        state: "HELD"
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
      "No live stage transition is available from this review surface.",
      "The transition command remains off until the lifecycle graph and evidence rules are approved together.",
      "Task, Appointment, and Dispatch state never becomes an implicit stage transition."
    ],
    nextUnlocks: [
      "Approve the lifecycle graph, transition authority, and evidence requirements for each stage change.",
      "Rehearse one secure move with audit and rollback proof before enabling live transitions."
    ],
    transitionAction: {
      label: "Move to next stage",
      state: "HELD"
    }
  };
}
