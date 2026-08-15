import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmOpportunityPreviewRepository,
  type UnifiedCrmOpportunityPreviewRecord,
  type UnifiedCrmOpportunityPreviewRepository
} from "@/server/repositories/unified-crm-opportunity-preview-repository";
import { UnifiedCrmOpportunityError, type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION,
  type UnifiedCrmOpportunityPreviewModel
} from "@/server/unified-crm/opportunity-read-contract";
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
  shellMode?: unknown;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
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

function customerLabel(record: UnifiedCrmOpportunityPreviewRecord) {
  return record.customer
    ? `${record.customer.displayName} · ${record.customer.customerNumber}`
    : "Customer link not yet attached";
}

function safePersistedOpportunityId(value: string) {
  try {
    return normalizeUnifiedCrmOpportunityId(value);
  } catch {
    return null;
  }
}

function toVisibleLiveReadItem(
  record: UnifiedCrmOpportunityPreviewRecord,
  access: UnifiedCrmOpportunityAccessContext
) {
  const opportunityId = safePersistedOpportunityId(record.opportunityNumber);
  if (!opportunityId || !isPreviewRecordVisible(record, access)) return null;
  return {
    id: `live-${opportunityId}`,
    title: record.title,
    ownerLabel: record.ownerUser?.name ?? "Unassigned",
    customerLabel: customerLabel(record),
    href: buildUnifiedCrmOpportunityReviewHref("detail", opportunityId),
    state: "LIVE_READ_ONLY" as const,
    reason: record.summary?.trim() || "Open this persisted opportunity in read-only mode."
  };
}

function liveCollectionDetail(visiblePersistedRecordCount: number, visibility: "organization" | "owned") {
  const visibilityLabel = visibility === "organization" ? "organization review" : "owned review";
  if (visiblePersistedRecordCount > 0) {
    return `Only same-scope persisted opportunities are listed here for ${visibilityLabel}. Lifecycle movement remains off.`;
  }
  return `No same-scope persisted read-only opportunity is visible right now for ${visibilityLabel}. Continue with held pipeline review until one is available.`;
}

function liveCollectionFreshnessLabel(newestVisibleRecordUpdatedAt: string | null) {
  return newestVisibleRecordUpdatedAt
    ? `Newest visible persisted update observed at ${newestVisibleRecordUpdatedAt}.`
    : "No visible persisted opportunity update is available yet.";
}

export async function getUnifiedCrmOpportunityPipelinePreview(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityPreviewModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const orientation = createUnifiedCrmOpportunityWorkspaceOrientation(access, {
    generatedAt,
    sourceLabel: "Unified CRM opportunity pipeline review"
  });
  const visibility = orientation.visibility;
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
      "Opportunity pipeline preview is temporarily unavailable.",
      { cause: error }
    );
  }
  const liveReadItems = persistedRecords
    .map((record) => toVisibleLiveReadItem(record, access))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const visiblePersistedRecords = persistedRecords.filter((record) => (
    Boolean(safePersistedOpportunityId(record.opportunityNumber)) &&
    isPreviewRecordVisible(record, access)
  ));
  const newestVisibleRecordUpdatedAt = visiblePersistedRecords.length
    ? new Date(Math.max(...visiblePersistedRecords.map((record) => record.updatedAt.getTime()))).toISOString()
    : null;

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION,
    generatedAt,
    state: "PREVIEW",
    visibility,
    cards: [
      {
        id: "foundation",
        label: "Foundation",
        value: "Ready",
        detail: "Opportunity access, validation, and bridge contracts are in place.",
        tone: "ready"
      },
      {
        id: "stage-policy",
        label: "Stage policy",
        value: "Held",
        detail: "Exact stage names, order, and evidence rules are still awaiting business approval.",
        tone: "held"
      },
      {
        id: "bridges",
        label: "Owning-system bridges",
        value: "Prepared",
        detail: "Task, Appointment, and Dispatch packets are contract-ready but not active.",
        tone: "neutral"
      }
    ],
    columns: [
      {
        id: "intake",
        label: "Intake review",
        itemCountLabel: "2 scenarios",
        valueLabel: "No governed stage yet",
        items: [
          {
            id: "review01",
            customerLabel: "Customer appears after approved create path",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review01"),
            nextActionLabel: "Review create contract",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "First secure create path will surface here after lifecycle approval.",
            state: "HELD_REVIEW"
          },
          {
            id: "review02",
            customerLabel: "Source lead remains authoritative",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review02"),
            nextActionLabel: "Review lead bridge",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "Lead correlation is prepared without rewriting source lead stages or scores.",
            state: "HELD_REVIEW"
          }
        ]
      },
      {
        id: "planning",
        label: "Planning review",
        itemCountLabel: "2 scenarios",
        valueLabel: "Movement held",
        items: [
          {
            id: "review03",
            customerLabel: "No forecast math is shown",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review03"),
            nextActionLabel: "Review detail state",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "Amounts, probability, and stage movement stay off until approved.",
            state: "HELD_REVIEW"
          },
          {
            id: "review04",
            customerLabel: "Appointments stay source-owned",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review04"),
            nextActionLabel: "Review appointment bridge",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "Appointment linkage is contract-ready but no live handoff is enabled here yet.",
            state: "HELD_REVIEW"
          }
        ]
      },
      {
        id: "handoff",
        label: "Handoff review",
        itemCountLabel: "1 scenario",
        valueLabel: "Dispatch held",
        items: [
          {
            id: "review05",
            customerLabel: "Dispatch remains authoritative",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review05"),
            nextActionLabel: "Review dispatch bridge",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "CRM will link or hand off work without taking over the dispatch lifecycle.",
            state: "HELD_REVIEW"
          }
        ]
      }
    ],
    constraints: [
      "No opportunity record is created from this preview.",
      "No stage transition is available before approval.",
      "Task, Appointment, and Dispatch remain authoritative in their own consoles."
    ],
    listPreview: {
      observation: {
        detail: liveCollectionDetail(visiblePersistedRecords.length, visibility),
        freshnessLabel: liveCollectionFreshnessLabel(newestVisibleRecordUpdatedAt),
        newestVisibleRecordUpdatedAt,
        state: visiblePersistedRecords.length ? "READY" : "EMPTY",
        visibleRecordCount: visiblePersistedRecords.length
      },
      heading: liveReadItems.length
        ? visibility === "organization"
          ? "Visible read-only opportunities"
          : "Your visible read-only opportunities"
        : visibility === "organization"
          ? "What the first live list will surface"
          : "What your owned opportunity list will surface",
      emptyMessage: liveReadItems.length
        ? "Additional persisted opportunities will appear here when they are safe to show in read-only mode."
        : "No same-scope persisted read-only opportunity is visible while lifecycle rules remain held.",
      items: [
        ...liveReadItems,
        {
          id: "list-review01",
          title: "Customer and owner at a glance",
          ownerLabel: visibility === "organization" ? "Organization visibility" : "Owned visibility",
          reason: "Every live record row will show the next action, owner, and due state before any deeper details.",
          state: "HELD_REVIEW"
        },
        {
          id: "list-review02",
          title: "Safe path into detail",
          ownerLabel: "Review only",
          reason: "Open detail stays one click away, but the detail remains read-only until activation is approved.",
          state: "HELD_REVIEW"
        }
      ]
    }
  };
}
