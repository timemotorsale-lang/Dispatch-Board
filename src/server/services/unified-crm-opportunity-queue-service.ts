import type { AuthenticatedUser } from "@/server/auth/store";
import { UnifiedCrmOpportunityError, type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  createUnifiedCrmOpportunityPreviewRepository,
  type UnifiedCrmOpportunityPreviewRecord,
  type UnifiedCrmOpportunityPreviewRepository
} from "@/server/repositories/unified-crm-opportunity-preview-repository";
import {
  UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION,
  type UnifiedCrmOpportunityQueueReviewSegment,
  type UnifiedCrmOpportunityQueueReviewModel
} from "@/server/unified-crm/opportunity-queue-contract";
import { isTerminalUnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";
import { buildUnifiedCrmOpportunityReviewHref } from "@/server/unified-crm/opportunity-workspace-orientation";
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

function dueLabel(value: Date | null, now: Date) {
  if (!value) return "No due time";
  const delta = value.getTime() - now.getTime();
  if (delta < -60_000) return "Overdue";
  if (delta <= 24 * 60 * 60 * 1000) return "Due soon";
  return "Scheduled";
}

function opportunitySegments(
  record: UnifiedCrmOpportunityPreviewRecord,
  now: Date
): UnifiedCrmOpportunityQueueReviewSegment["id"][] {
  const segments: UnifiedCrmOpportunityQueueReviewSegment["id"][] = [];
  if (record.ownerUser) segments.push("owned");
  if (!record.ownerUser) segments.push("unassigned");
  if (record.nextActionDueAt && record.nextActionDueAt.getTime() < now.getTime() - 60_000) segments.push("overdue");
  if (!record.nextActionDueAt && !isTerminalUnifiedCrmOpportunityStage(record.stage)) segments.push("stalled");
  if (record.stage === "CUSTOMER_DECIDING" || record.stage === "QUOTE_PRESENTED") segments.push("waiting");
  if (segments.includes("overdue") || segments.includes("stalled") || !record.ownerUser) segments.push("at-risk");
  return segments.length ? segments : ["waiting"];
}

function riskLabel(segmentIds: readonly UnifiedCrmOpportunityQueueReviewSegment["id"][]) {
  if (segmentIds.includes("overdue")) return "Overdue";
  if (segmentIds.includes("stalled")) return "Stalled";
  if (segmentIds.includes("unassigned")) return "Unassigned";
  if (segmentIds.includes("at-risk")) return "At risk";
  return "On track";
}

function toVisibleLiveQueueItem(
  record: UnifiedCrmOpportunityPreviewRecord,
  access: UnifiedCrmOpportunityAccessContext,
  visibility: "organization" | "owned",
  now: Date
) {
  const opportunityId = safePersistedOpportunityId(record.opportunityNumber);
  if (!opportunityId || !isPreviewRecordVisible(record, access)) return null;
  const segmentIds = opportunitySegments(record, now);
  return {
    detailHref: buildUnifiedCrmOpportunityReviewHref("detail", opportunityId),
    dueLabel: dueLabel(record.nextActionDueAt, now),
    id: opportunityId,
    ownerLabel: record.ownerUser?.name
      ?? (visibility === "organization" ? "Organization visible" : "Owned by you"),
    reason: record.summary?.trim()
      || "This persisted opportunity is available for review with explainable queue membership.",
    riskLabel: riskLabel(segmentIds),
    segmentIds,
    state: "LIVE_READ_ONLY" as const,
    title: record.title,
    transitionHref: isTerminalUnifiedCrmOpportunityStage(record.stage) ? undefined : buildUnifiedCrmOpportunityReviewHref("transition", opportunityId)
  };
}

function liveCollectionDetail(visiblePersistedRecordCount: number, visibility: "organization" | "owned") {
  const visibilityLabel = visibility === "organization" ? "team and manager review" : "owned review";
  if (visiblePersistedRecordCount > 0) {
    return `Only same-scope persisted opportunities are shown in this queue for ${visibilityLabel}. Lifecycle movement opens through the governed transition command.`;
  }
  return `No same-scope persisted read-only opportunity is visible in this queue right now for ${visibilityLabel}. Continue with held queue review until one is available.`;
}

function liveCollectionFreshnessLabel(newestVisibleRecordUpdatedAt: string | null) {
  return newestVisibleRecordUpdatedAt
    ? `Newest visible persisted update observed at ${newestVisibleRecordUpdatedAt}.`
    : "No visible persisted opportunity update is available yet.";
}

export async function getUnifiedCrmOpportunityQueueReview(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityQueueReviewModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const now = dependencies.now?.() ?? new Date();
  const generatedAt = now.toISOString();
  const visibility = access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";
  const visibilityLabel = visibility === "organization" ? "team and manager review" : "owned review";
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
      "Opportunity queue review is temporarily unavailable.",
      { cause: error }
    );
  }
  const liveItems = persistedRecords
    .map((record) => toVisibleLiveQueueItem(record, access, visibility, now))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const visiblePersistedRecords = persistedRecords.filter((record) => (
    Boolean(safePersistedOpportunityId(record.opportunityNumber)) &&
    isPreviewRecordVisible(record, access)
  ));
  const newestVisibleRecordUpdatedAt = visiblePersistedRecords.length
    ? new Date(Math.max(...visiblePersistedRecords.map((record) => record.updatedAt.getTime()))).toISOString()
    : null;
  const items: UnifiedCrmOpportunityQueueReviewModel["items"] = [
    ...liveItems,
    {
      detailHref: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      dueLabel: "Due next",
      id: "review01",
      ownerLabel: visibility === "organization" ? "Seller-owned review" : "Owned by you",
      reason: "The next action stays visible so no opportunity advances without a clear owner and due commitment.",
      riskLabel: "Stage held",
      segmentIds: ["owned"] as const,
      state: "HELD_REVIEW" as const,
      title: "Keep intake follow-up obvious"
    },
    {
      detailHref: "/crm/opportunities/review01/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      dueLabel: "Needs approval",
      id: "review02",
      ownerLabel: visibility === "organization" ? "Manager review" : "Approval review",
      reason: "Transition evidence and rollback expectations stay visible before any stage movement can go live.",
      riskLabel: "Governance review",
      segmentIds: ["waiting", "at-risk"] as const,
      state: "HELD_REVIEW" as const,
      title: "Make risk and movement easy to understand"
    },
    {
      detailHref: "/crm/opportunities/new?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      dueLabel: "Create review",
      id: "review03",
      ownerLabel: visibilityLabel,
      reason: "The first create path stays one click away so the team can review clarity before live writes exist.",
      riskLabel: "Create held",
      segmentIds: ["unassigned"] as const,
      state: "HELD_REVIEW" as const,
      title: "Review the governed create path"
    }
  ];

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_QUEUE_CONTRACT_VERSION,
    generatedAt,
    governance: [
      "This queue does not reorder, assign, or transition any opportunity directly.",
      "Membership stays explainable before automated priority or risk scoring is enabled.",
      "Source tasks, appointments, and dispatch records keep authority until the governed opportunity lifecycle is approved."
    ],
    headline: {
      title: "Review the first opportunity queue before it goes live",
      detail: "This shows how owned, overdue, waiting, and at-risk opportunity work can stay clear and easy to act on without hiding the source of truth."
    },
    liveReadObservation: {
      detail: liveCollectionDetail(visiblePersistedRecords.length, visibility),
      freshnessLabel: liveCollectionFreshnessLabel(newestVisibleRecordUpdatedAt),
      newestVisibleRecordUpdatedAt,
      state: visiblePersistedRecords.length ? "READY" : "EMPTY",
      visibleRecordCount: visiblePersistedRecords.length
    },
    items,
    nextUnlocks: [
      "Use the governed transition flow for any live stage movement from queue entries.",
      "Prove browser behavior for owned, unassigned, overdue, stalled, waiting, and at-risk filters before enabling automated prioritization."
    ],
    segments: [
      {
        countLabel: `${items.filter((item) => item.segmentIds.includes("owned")).length} item(s)`,
        detail: "Owned opportunities keep the next action, owner, and due commitment visible.",
        id: "owned",
        label: "Owned next actions",
        state: "REVIEW"
      },
      {
        countLabel: `${items.filter((item) => item.segmentIds.includes("unassigned")).length} item(s)`,
        detail: "Unassigned opportunities are visible for management review before ownership is corrected.",
        id: "unassigned",
        label: "Unassigned work",
        state: "REVIEW"
      },
      {
        countLabel: `${items.filter((item) => item.segmentIds.includes("overdue")).length} item(s)`,
        detail: "Overdue opportunities are derived from the current next-action due time.",
        id: "overdue",
        label: "Overdue work",
        state: "REVIEW"
      },
      {
        countLabel: `${items.filter((item) => item.segmentIds.includes("stalled")).length} item(s)`,
        detail: "Stalled opportunities are active records without a dated next action.",
        id: "stalled",
        label: "Stalled work",
        state: "REVIEW"
      },
      {
        countLabel: `${items.filter((item) => item.segmentIds.includes("waiting")).length} item(s)`,
        detail: "Waiting opportunities are customer-decision or quote-follow-up records that need human follow-through.",
        id: "waiting",
        label: "Waiting and source-controlled",
        state: "REVIEW"
      },
      {
        countLabel: `${items.filter((item) => item.segmentIds.includes("at-risk")).length} item(s)`,
        detail: "At-risk membership is explainable from overdue, stalled, or unassigned conditions.",
        id: "at-risk",
        label: "At-risk review",
        state: "REVIEW"
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
