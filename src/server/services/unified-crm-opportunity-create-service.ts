import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import {
  UNIFIED_CRM_OPPORTUNITY_CREATE_CONTRACT_VERSION,
  type UnifiedCrmOpportunityCreateReviewModel
} from "@/server/unified-crm/opportunity-create-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";

type Dependencies = {
  accessContext?: UnifiedCrmOpportunityAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  shellMode?: unknown;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

export async function getUnifiedCrmOpportunityCreateReview(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityCreateReviewModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const visibility = access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_CREATE_CONTRACT_VERSION,
    state: "LIVE_CREATE",
    generatedAt,
    visibility,
    source: {
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity create review",
      observedAt: generatedAt
    },
    headline: {
      title: "Review the first governed opportunity create flow",
      detail: "This shows exactly how create will feel before live opportunity records, stage entry, and forecast behavior are turned on."
    },
    requiredInputs: [
      {
        id: "customer",
        label: "Customer or lead context",
        detail: "CRM will require source-owned customer or lead context before it can create a durable opportunity.",
        state: "REQUIRED"
      },
      {
        id: "owner",
        label: "Owner assignment",
        detail: "Ownership will be set at creation time and recorded for audit before any follow-up work is linked.",
        state: "REQUIRED"
      },
      {
        id: "stage",
        label: "Initial lifecycle state",
        detail: "New opportunities start at NEW_INQUIRY. Later movement uses the governed stage-transition command.",
        state: "REQUIRED"
      },
      {
        id: "next-action",
        label: "Next action and due commitment",
        detail: "Create will require a clear next step so the first live opportunity starts actionable, not empty.",
        state: "REQUIRED"
      }
    ],
    governance: [
      "Create starts at NEW_INQUIRY and requires owner, customer or source-lead context, next action, and due time.",
      "Stage movement, quote presentation, appointment handoff, and dispatch handoff remain off until their own milestones pass.",
      "Source systems keep ownership of customer, lead, appointment, task, and dispatch records."
    ],
    nextUnlocks: [
      "Verify one end-to-end create rehearsal with a permitted customer or source lead.",
      "Implement UCRM-031 so stage changes use the same command from buttons, forms, and pipeline movement."
    ],
    createAction: {
      label: "Create opportunity",
      state: "READY"
    }
  };
}
