import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  UNIFIED_CRM_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
  type UnifiedCrmOpportunityDiscoveryModel,
  type UnifiedCrmOpportunityDiscoveryPanel
} from "@/server/unified-crm/opportunity-discovery-contract";
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

function createPanels(): readonly UnifiedCrmOpportunityDiscoveryPanel[] {
  return [
    {
      id: "workspace-entry",
      label: "Start in the opportunity workspace",
      detail: "Use the held pipeline review when you want the fastest look at what the day-to-day opportunity workspace will feel like.",
      emphasis: "ENTRY",
      link: {
        id: "pipeline",
        label: "Open pipeline review",
        description: "See the entry board and list shape without live stages, forecasts, or writes.",
        href: buildUnifiedCrmOpportunityReviewHref("pipeline"),
        state: "HELD_REVIEW"
      }
    },
    {
      id: "workspace-map",
      label: "Choose the exact review surface",
      detail: "Use the review hub when you want to compare pipeline, queue, detail, transition, and create surfaces from one safe map.",
      emphasis: "MAP",
      link: {
        id: "hub",
        label: "Open review hub",
        description: "Jump to any opportunity review surface without leaving the held workspace.",
        href: "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        state: "HELD_REVIEW"
      }
    },
    {
      id: "guided-path",
      label: "Follow the intended end-to-end review path",
      detail: "Use the guided journey when you want the simplest walkthrough in the same order a user would naturally review it.",
      emphasis: "GUIDED",
      link: {
        id: "guided",
        label: "Open guided journey",
        description: "Walk entry, queue, detail, transition, and create in one held, read-only sequence.",
        href: "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        state: "HELD_REVIEW"
      }
    }
  ];
}

export async function getUnifiedCrmOpportunityDiscovery(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityDiscoveryModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const orientation = createUnifiedCrmOpportunityWorkspaceOrientation(access, {
    generatedAt,
    sourceLabel: "Unified CRM opportunity workspace discovery"
  });

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
    generatedAt,
    headline: {
      title: "Opportunity workspace is ready to review, not yet to operate",
      detail: `Home and Work can safely point here so users can enter the opportunity workspace in ${orientation.visibilityLabel} without seeing fake counts, live stage movement, or operational commands.`
    },
    nextUnlocks: [
      "Approve lifecycle stages and evidence rules before turning the workspace entry into a live operational destination.",
      "Verify the shell entry, fallback, and role-safe review path before surfacing live opportunity actions from Home or Work."
    ],
    panels: createPanels(),
    source: {
      href: orientation.source.href,
      label: "Unified CRM opportunity workspace discovery",
      observedAt: orientation.source.observedAt
    },
    state: "HELD_REVIEW",
    visibility: orientation.visibility
  };
}
