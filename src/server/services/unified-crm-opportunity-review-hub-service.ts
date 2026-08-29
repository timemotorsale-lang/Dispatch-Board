import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmOpportunityPreviewRepository,
  type UnifiedCrmOpportunityPreviewRecord,
  type UnifiedCrmOpportunityPreviewRepository
} from "@/server/repositories/unified-crm-opportunity-preview-repository";
import { UnifiedCrmOpportunityError, type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
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
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";

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

function safePersistedOpportunityId(value: string) {
  try {
    return normalizeUnifiedCrmOpportunityId(value);
  } catch {
    return null;
  }
}

function toVisibleLiveLink(
  record: UnifiedCrmOpportunityPreviewRecord,
  access: UnifiedCrmOpportunityAccessContext
): UnifiedCrmOpportunityReviewHubLink | null {
  const opportunityId = safePersistedOpportunityId(record.opportunityNumber);
  if (!opportunityId || !isPreviewRecordVisible(record, access)) return null;
  return {
    id: `live-${opportunityId}`,
    label: record.title,
    description: record.summary?.trim()
      || `Open ${record.customer?.displayName ?? "this customer"} in read-only opportunity detail.`,
    href: buildUnifiedCrmOpportunityReviewHref("detail", opportunityId),
    state: "LIVE_READ_ONLY"
  };
}

function createLinks(
  primaryRecord?: UnifiedCrmOpportunityPreviewRecord | null,
  primaryOpportunityId?: string | null
): readonly UnifiedCrmOpportunityReviewHubLink[] {
  return [
    {
      id: "pipeline",
      label: "Open pipeline",
      description: "Open the board and list workspace that shows permitted opportunity flow and safe next actions.",
      href: buildUnifiedCrmOpportunityReviewHref("pipeline"),
      state: "HELD_REVIEW"
    },
    {
      id: "queue",
      label: "Open queue",
      description: "Inspect owned, overdue, waiting, and at-risk opportunity work without changing any opportunity record.",
      href: buildUnifiedCrmOpportunityReviewHref("queue"),
      state: "HELD_REVIEW"
    },
    {
      id: "create",
      label: "Start create flow",
      description: "Open the governed create experience and required inputs; writes remain controlled by the approved command path.",
      href: buildUnifiedCrmOpportunityReviewHref("create"),
      state: "HELD_REVIEW"
    },
    {
      id: "detail",
      label: primaryRecord && primaryOpportunityId ? "Open persisted detail" : "Open detail flow",
      description: primaryRecord && primaryOpportunityId
        ? "Open the first same-scope persisted opportunity in read-only mode while lifecycle commands remain governed."
        : "Open the opportunity detail page to verify customer context, source bridges, and next unlocks.",
      href: buildUnifiedCrmOpportunityReviewHref("detail", primaryOpportunityId ?? "review01"),
      state: primaryRecord && primaryOpportunityId ? "LIVE_READ_ONLY" : "HELD_REVIEW"
    },
    {
      id: "transition",
      label: "Review stage movement",
      description: "Inspect stage-movement governance, evidence expectations, and rollback posture before a transition is submitted.",
      href: buildUnifiedCrmOpportunityReviewHref("transition", "review01"),
      state: "HELD_REVIEW"
    }
  ];
}

function liveObservationDetail(
  visiblePersistedRecordCount: number,
  visibilityLabel: string
) {
  if (visiblePersistedRecordCount > 0) {
    return `Only same-scope persisted opportunities are listed here for ${visibilityLabel.toLowerCase()}. Lifecycle movement uses governed commands.`;
  }
  return `No same-scope persisted opportunity is visible right now for ${visibilityLabel.toLowerCase()}. Use the guided pipeline, queue, or create flow to continue.`;
}

function liveObservationFreshnessLabel(newestVisibleRecordUpdatedAt: string | null) {
  return newestVisibleRecordUpdatedAt
    ? `Newest visible persisted update observed at ${newestVisibleRecordUpdatedAt}.`
    : "No visible persisted opportunity update is available yet.";
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
      "Opportunity review hub is temporarily unavailable.",
      { cause: error }
    );
  }
  const liveRecordLinks = persistedRecords
    .map((record) => toVisibleLiveLink(record, access))
    .filter((link): link is UnifiedCrmOpportunityReviewHubLink => Boolean(link));
  const visiblePersistedRecords = persistedRecords.filter((record) => isPreviewRecordVisible(record, access) && Boolean(safePersistedOpportunityId(record.opportunityNumber)));
  const primaryLiveLink = liveRecordLinks[0] ?? null;
  const visiblePersistedRecord = primaryLiveLink
    ? persistedRecords.find((record) => `live-${safePersistedOpportunityId(record.opportunityNumber)}` === primaryLiveLink.id) ?? null
    : null;
  const visiblePersistedOpportunityId = primaryLiveLink
    ? safePersistedOpportunityId(primaryLiveLink.id.replace(/^live-/, ""))
    : null;
  const links = createLinks(visiblePersistedRecord, visiblePersistedOpportunityId);

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_REVIEW_HUB_CONTRACT_VERSION,
    generatedAt,
    headline: {
      title: "Review the full opportunity experience from one safe hub",
      detail: visiblePersistedRecord
        ? `This hub keeps pipeline, queue, create, a real read-only detail record, and transition review one click away for ${orientation.visibilityLabel}.`
        : `This hub keeps pipeline, queue, create, detail, and transition review one click away for ${orientation.visibilityLabel}.`
    },
      liveReadObservation: {
      detail: liveObservationDetail(visiblePersistedRecords.length, orientation.visibilityLabel),
      freshnessLabel: liveObservationFreshnessLabel(
        visiblePersistedRecords.length
          ? new Date(Math.max(...visiblePersistedRecords.map((record) => record.updatedAt.getTime()))).toISOString()
          : null
      ),
      newestVisibleRecordUpdatedAt: visiblePersistedRecords.length
        ? new Date(Math.max(...visiblePersistedRecords.map((record) => record.updatedAt.getTime()))).toISOString()
        : null,
      state: visiblePersistedRecords.length ? "READY" : "EMPTY",
      visibleRecordCount: visiblePersistedRecords.length
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
        id: "live-records" as const,
        label: "Visible read-only opportunities",
        detail: liveRecordLinks.length
          ? "These persisted opportunity records are safe to open in read-only mode and still keep live lifecycle movement turned off."
          : "No permitted persisted opportunity record is visible right now. Use guided opportunity surfaces until a same-scope read-only record is available.",
        links: liveRecordLinks
      },
      {
        id: "governance",
        label: "Governed activation path",
        detail: "Every linked surface stays permission-checked, auditable, and safe; direct writes remain controlled by the approved lifecycle command.",
        links: links.filter((link) => link.id === "create" || link.id === "transition" || link.id === "queue")
      }
    ],
    source: {
      ...orientation.source,
      label: "Unified CRM opportunity review hub" as const
    },
    state: "HELD_REVIEW",
    visibility: orientation.visibility
  };
}
