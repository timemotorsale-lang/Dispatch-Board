import type { AuthenticatedUser } from "@/server/auth/store";
import { UnifiedCrmOpportunityError } from "@/server/unified-crm/opportunity-contract";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  createUnifiedCrmOpportunityPreviewRepository,
  type UnifiedCrmOpportunityPreviewRecord,
  type UnifiedCrmOpportunityPreviewRepository
} from "@/server/repositories/unified-crm-opportunity-preview-repository";
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
  repository?: UnifiedCrmOpportunityPreviewRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
  shellMode?: unknown;
};

function isPreviewRecordVisible(
  record: UnifiedCrmOpportunityPreviewRecord,
  access: UnifiedCrmOpportunityAccessContext
) {
  if (record.organizationId !== access.organizationId) return false;
  if (access.recordScope.kind === "OWNER") {
    return record.ownerUser?.id === access.recordScope.ownerUserId;
  }
  return true;
}

function createPanels(primaryRecord?: UnifiedCrmOpportunityPreviewRecord | null): readonly UnifiedCrmOpportunityDiscoveryPanel[] {
  return [
    {
      id: "workspace-entry",
      label: "Start in the opportunity workspace",
      detail: "Use the pipeline workspace when you want the fastest look at current opportunity flow and safe next actions.",
      emphasis: "ENTRY",
      link: {
        id: "pipeline",
        label: "Open pipeline workspace",
        description: "See the entry board, list shape, queue, create, and detail paths without silent writes.",
        href: buildUnifiedCrmOpportunityReviewHref("pipeline"),
        state: "HELD_REVIEW"
      }
    },
    {
      id: "workspace-map",
      label: "Choose the exact review surface",
      detail: primaryRecord
        ? "Use the review hub when you want one safe map that includes a same-scope persisted read-only opportunity detail alongside the guided workflow surfaces."
        : "Use the review hub when you want to compare pipeline, queue, detail, transition, and create surfaces from one safe map.",
      emphasis: "MAP",
      link: {
        id: "hub",
        label: primaryRecord ? "Open hub with live detail" : "Open opportunity hub",
        description: primaryRecord
          ? "Jump to the opportunity review hub and open the first same-scope persisted detail record in read-only mode."
          : "Jump to any opportunity surface without leaving the guided workspace.",
        href: "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        state: primaryRecord ? "LIVE_READ_ONLY" : "HELD_REVIEW"
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
        description: "Walk entry, queue, detail, transition, and create in one guided, read-only sequence.",
        href: "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
        state: "HELD_REVIEW"
      }
    }
  ];
}

function liveCollectionDetail(visiblePersistedRecordCount: number, visibility: "organization" | "owned") {
  const visibilityLabel = visibility === "organization" ? "organization review" : "owned review";
  if (visiblePersistedRecordCount > 0) {
    return `Only same-scope persisted opportunities are available from this workspace entry for ${visibilityLabel}. Lifecycle movement uses governed commands.`;
  }
  return `No same-scope persisted opportunity is visible from this workspace entry right now for ${visibilityLabel}. Use the guided hub, queue, or create flow to continue.`;
}

function liveCollectionFreshnessLabel(newestVisibleRecordUpdatedAt: string | null) {
  return newestVisibleRecordUpdatedAt
    ? `Newest visible persisted update observed at ${newestVisibleRecordUpdatedAt}.`
    : "No visible persisted opportunity update is available yet.";
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
  const repository = dependencies.repository ?? createUnifiedCrmOpportunityPreviewRepository();
  let persistedRecords: UnifiedCrmOpportunityPreviewRecord[];
  try {
    persistedRecords = await repository.listOpportunityPreviews({
      limit: 5,
      organizationId: access.organizationId,
      recordScope: access.recordScope
    });
  } catch (error) {
    throw new UnifiedCrmOpportunityError(
      "OPPORTUNITY_OFF",
      "Opportunity workspace discovery is temporarily unavailable.",
      { cause: error }
    );
  }
  const visiblePersistedRecords = persistedRecords.filter((record) => isPreviewRecordVisible(record, access));
  const visiblePersistedRecord = visiblePersistedRecords[0] ?? null;
  const newestVisibleRecordUpdatedAt = visiblePersistedRecords.length
    ? new Date(Math.max(...visiblePersistedRecords.map((record) => record.updatedAt.getTime()))).toISOString()
    : null;

  return {
    collectionObservation: {
      detail: liveCollectionDetail(visiblePersistedRecords.length, orientation.visibility),
      freshnessLabel: liveCollectionFreshnessLabel(newestVisibleRecordUpdatedAt),
      newestVisibleRecordUpdatedAt,
      state: visiblePersistedRecords.length ? "READY" : "EMPTY",
      visibleRecordCount: visiblePersistedRecords.length
    },
    contractVersion: UNIFIED_CRM_OPPORTUNITY_DISCOVERY_CONTRACT_VERSION,
    generatedAt,
    headline: {
      title: "Opportunity workspace is ready to use",
      detail: visiblePersistedRecord
        ? `Home and Work can safely point here so users can enter the opportunity workspace in ${orientation.visibilityLabel}, open one persisted read-only opportunity, and continue without fake counts or silent stage changes.`
        : `Home and Work can safely point here so users can enter the opportunity workspace in ${orientation.visibilityLabel} and continue through queue, hub, create, and detail paths.`
    },
    nextUnlocks: [
      "Turn on audited write actions only after provider, permission, rollback, and evidence gates are verified.",
      "Keep stage movement routed through the governed transition command so the pipeline never mutates records silently."
    ],
    panels: createPanels(visiblePersistedRecord),
    source: {
      href: orientation.source.href,
      label: "Unified CRM opportunity workspace discovery",
      observedAt: orientation.source.observedAt
    },
    state: "HELD_REVIEW",
    visibility: orientation.visibility
  };
}
