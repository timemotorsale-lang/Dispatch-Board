import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION,
  type UnifiedCrmOpportunityQueueReviewModel
} from "@/server/unified-crm/opportunity-queue-contract";

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

export async function getUnifiedCrmOpportunityQueueReview(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityQueueReviewModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const visibility = access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";
  const visibilityLabel = visibility === "organization" ? "team and manager review" : "owned review";

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION,
    generatedAt,
    governance: [
      "This queue is review only and does not reorder, assign, or transition any opportunity.",
      "Membership stays explainable before live prioritization or risk scoring is enabled.",
      "Source tasks, appointments, and dispatch records keep authority until the governed opportunity lifecycle is approved."
    ],
    headline: {
      title: "Review the first opportunity queue before it goes live",
      detail: "This shows how owned, overdue, waiting, and at-risk opportunity work can stay clear and easy to act on without hiding the source of truth."
    },
    items: [
      {
        detailHref: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        dueLabel: "Due next",
        id: "review01",
        ownerLabel: visibility === "organization" ? "Seller-owned review" : "Owned by you",
        reason: "The next action stays visible so no opportunity advances without a clear owner and due commitment.",
        riskLabel: "Stage held",
        state: "HELD_REVIEW",
        title: "Keep intake follow-up obvious"
      },
      {
        detailHref: "/crm/opportunities/review01/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        dueLabel: "Needs approval",
        id: "review02",
        ownerLabel: visibility === "organization" ? "Manager review" : "Approval review",
        reason: "Transition evidence and rollback expectations stay visible before any stage movement can go live.",
        riskLabel: "Governance review",
        state: "HELD_REVIEW",
        title: "Make risk and movement easy to understand"
      },
      {
        detailHref: "/crm/opportunities/new?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        dueLabel: "Create review",
        id: "review03",
        ownerLabel: visibilityLabel,
        reason: "The first create path stays one click away so the team can review clarity before live writes exist.",
        riskLabel: "Create held",
        state: "HELD_REVIEW",
        title: "Review the governed create path"
      }
    ],
    nextUnlocks: [
      "Approve stage names, order, and evidence rules so queue membership can be tied to real lifecycle states.",
      "Prove one live owned queue flow with audit history, rollback, and permissions before enabling write actions."
    ],
    segments: [
      {
        countLabel: visibility === "organization" ? "Seller-owned review" : "Owned by you",
        detail: "Everything shown here should feel easy to scan and easy to act on before live records are enabled.",
        id: "owned",
        label: "Owned next actions",
        state: "REVIEW"
      },
      {
        countLabel: "No live overdue math",
        detail: "Overdue membership is intentionally held until the lifecycle graph and due-state rules are approved together.",
        id: "overdue",
        label: "Overdue work",
        state: "HELD"
      },
      {
        countLabel: "Waiting on source",
        detail: "Queue entries can point back to source systems without pretending CRM owns the underlying task or dispatch step.",
        id: "waiting",
        label: "Waiting and source-controlled",
        state: "REVIEW"
      },
      {
        countLabel: "No live scoring yet",
        detail: "At-risk membership remains explainable and reviewable before any automated risk score is introduced.",
        id: "at-risk",
        label: "At-risk review",
        state: "HELD"
      }
    ],
    source: {
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity queue review",
      observedAt: generatedAt
    },
    state: "HELD_REVIEW",
    visibility
  };
}
