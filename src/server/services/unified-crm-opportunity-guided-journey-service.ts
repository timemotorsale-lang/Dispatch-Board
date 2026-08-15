import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  UNIFIED_CRM_OPPORTUNITY_GUIDED_JOURNEY_CONTRACT_VERSION,
  type UnifiedCrmOpportunityGuidedJourneyModel,
  type UnifiedCrmOpportunityGuidedJourneyStep
} from "@/server/unified-crm/opportunity-guided-journey-contract";
import {
  buildUnifiedCrmOpportunityReviewHref,
  createUnifiedCrmOpportunityWorkspaceOrientation
} from "@/server/unified-crm/opportunity-workspace-orientation";

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

function createJourneySteps(): readonly UnifiedCrmOpportunityGuidedJourneyStep[] {
  return [
    {
      id: "entry",
      label: "Start from pipeline review",
      description: "Begin with the held board and list review so the journey starts from the same opportunity entry point the team will use later.",
      href: buildUnifiedCrmOpportunityReviewHref("pipeline"),
      state: "HELD_REVIEW"
    },
    {
      id: "queue",
      label: "Check queue priorities",
      description: "Move into the held queue review to see how owned, waiting, and governance-sensitive work stays understandable without live ranking.",
      href: buildUnifiedCrmOpportunityReviewHref("queue"),
      state: "HELD_REVIEW"
    },
    {
      id: "detail",
      label: "Open detail context",
      description: "Review the held detail surface to confirm customer context, source bridges, and next action clarity before any operational command exists.",
      href: buildUnifiedCrmOpportunityReviewHref("detail", "review01"),
      state: "HELD_REVIEW"
    },
    {
      id: "transition",
      label: "Inspect movement governance",
      description: "Open the transition review to understand evidence, rollback posture, and why stage movement remains intentionally held.",
      href: buildUnifiedCrmOpportunityReviewHref("transition", "review01"),
      state: "HELD_REVIEW"
    },
    {
      id: "return",
      label: "Return to create review",
      description: "Close the walkthrough by checking the first governed create path that will eventually anchor the journey to a durable opportunity record.",
      href: buildUnifiedCrmOpportunityReviewHref("create"),
      state: "HELD_REVIEW"
    }
  ];
}

export async function getUnifiedCrmOpportunityGuidedJourney(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityGuidedJourneyModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const orientation = createUnifiedCrmOpportunityWorkspaceOrientation(access, {
    generatedAt,
    sourceLabel: "Unified CRM guided opportunity journey"
  });
  const steps = createJourneySteps();

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_GUIDED_JOURNEY_CONTRACT_VERSION,
    generatedAt,
    headline: {
      title: "Review the first guided opportunity journey safely",
      detail: `This guided journey walks through entry, queue, detail, and transition review in ${orientation.visibilityLabel} without creating records, moving stages, or introducing live counts.`
    },
    nextUnlocks: [
      "Approve lifecycle stages, evidence rules, and close or loss handling before enabling any live opportunity journey step.",
      "Verify one end-to-end guided review with permissions, fallback, and rollback evidence before turning on operational commands."
    ],
    phases: [
      {
        id: "intake",
        label: "Start with entry and prioritization",
        detail: "The journey begins where a seller or manager would first orient themselves, but it stays fully review-only.",
        steps: steps.filter((step) => step.id === "entry" || step.id === "queue")
      },
      {
        id: "follow-through",
        label: "Carry context into the record view",
        detail: "The middle of the journey shows how queue context should carry into detail and transition understanding without claiming live stage semantics.",
        steps: steps.filter((step) => step.id === "detail" || step.id === "transition")
      },
      {
        id: "governance",
        label: "End at the governed activation point",
        detail: "The walkthrough closes on the held create review so the team sees where durable opportunity creation will eventually begin.",
        steps: steps.filter((step) => step.id === "return")
      }
    ],
    source: orientation.source,
    state: "HELD_REVIEW",
    visibility: orientation.visibility
  };
}
