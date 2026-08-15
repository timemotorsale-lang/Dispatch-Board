import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  UNIFIED_CRM_OPPORTUNITY_REVIEW_HUB_CONTRACT_VERSION,
  type UnifiedCrmOpportunityReviewHubLink,
  type UnifiedCrmOpportunityReviewHubModel
} from "@/server/unified-crm/opportunity-review-hub-contract";
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

function createLinks(): readonly UnifiedCrmOpportunityReviewHubLink[] {
  return [
    {
      id: "pipeline",
      label: "Review pipeline",
      description: "Open the held board and list review that shows how opportunities should feel before lifecycle rules go live.",
      href: buildUnifiedCrmOpportunityReviewHref("pipeline"),
      state: "HELD_REVIEW"
    },
    {
      id: "queue",
      label: "Review queue",
      description: "Inspect the held owned, overdue, waiting, and at-risk queue experience without changing any opportunity record.",
      href: buildUnifiedCrmOpportunityReviewHref("queue"),
      state: "HELD_REVIEW"
    },
    {
      id: "create",
      label: "Review create flow",
      description: "Check the first governed create experience and required inputs before any live opportunity write is enabled.",
      href: buildUnifiedCrmOpportunityReviewHref("create"),
      state: "HELD_REVIEW"
    },
    {
      id: "detail",
      label: "Review detail flow",
      description: "Open the held opportunity detail page to verify customer context, source bridges, and next unlocks.",
      href: buildUnifiedCrmOpportunityReviewHref("detail", "review01"),
      state: "HELD_REVIEW"
    },
    {
      id: "transition",
      label: "Review transition flow",
      description: "Inspect stage-movement governance, evidence expectations, and rollback posture before live transitions exist.",
      href: buildUnifiedCrmOpportunityReviewHref("transition", "review01"),
      state: "HELD_REVIEW"
    }
  ];
}

export async function getUnifiedCrmOpportunityReviewHub(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityReviewHubModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const orientation = createUnifiedCrmOpportunityWorkspaceOrientation(access, {
    generatedAt,
    sourceLabel: "Unified CRM opportunity review hub"
  });
  const links = createLinks();

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_REVIEW_HUB_CONTRACT_VERSION,
    generatedAt,
    headline: {
      title: "Review the full opportunity experience from one safe hub",
      detail: `This hub keeps pipeline, queue, create, detail, and transition review one click away while opportunity lifecycle rules remain intentionally held for ${orientation.visibilityLabel}.`
    },
    nextUnlocks: [
      "Approve stage names, order, and evidence rules before turning any opportunity write path on.",
      "Verify one end-to-end review journey with permissions, fallback, and rollback evidence before enabling live opportunity commands."
    ],
    sections: [
      {
        id: "overview",
        label: "Core review surfaces",
        detail: "These links summarize the opportunity experience without showing live counts, forecasts, or operational stage movement.",
        links
      },
      {
        id: "governance",
        label: "Governed activation path",
        detail: "Every linked surface stays read only, feature off, and safe to review until the business-approved lifecycle is complete.",
        links: links.filter((link) => link.id === "create" || link.id === "transition" || link.id === "queue")
      }
    ],
    source: orientation.source,
    state: "HELD_REVIEW",
    visibility: orientation.visibility
  };
}
