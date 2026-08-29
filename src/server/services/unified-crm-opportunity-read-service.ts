import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmOpportunityPreviewRepository,
  type UnifiedCrmOpportunityPreviewRecord,
  type UnifiedCrmOpportunityPreviewRepository
} from "@/server/repositories/unified-crm-opportunity-preview-repository";
import { UnifiedCrmOpportunityError, type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";
import {
  isTerminalUnifiedCrmOpportunityStage,
  UNIFIED_CRM_OPPORTUNITY_STAGES,
  type UnifiedCrmOpportunityStage
} from "@/server/unified-crm/opportunity-lifecycle";
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

function stageLabel(stage: UnifiedCrmOpportunityStage) {
  return stage.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dueLabel(value: Date | null, now: Date) {
  if (!value) return "No due time";
  const delta = value.getTime() - now.getTime();
  if (delta < -60_000) return "Overdue";
  if (delta <= 24 * 60 * 60 * 1000) return "Due soon";
  return "Scheduled";
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
  access: UnifiedCrmOpportunityAccessContext,
  now: Date
) {
  const opportunityId = safePersistedOpportunityId(record.opportunityNumber);
  if (!opportunityId || !isPreviewRecordVisible(record, access)) return null;
  return {
    customerLabel: customerLabel(record),
    detailHref: buildUnifiedCrmOpportunityReviewHref("detail", opportunityId),
    dueLabel: dueLabel(record.nextActionDueAt, now),
    href: buildUnifiedCrmOpportunityReviewHref("detail", opportunityId),
    id: `live-${opportunityId}`,
    moveHref: isTerminalUnifiedCrmOpportunityStage(record.stage) ? undefined : buildUnifiedCrmOpportunityReviewHref("transition", opportunityId),
    nextActionLabel: record.nextActionLabel?.trim() || "Open opportunity detail",
    ownerLabel: record.ownerUser?.name ?? "Unassigned",
    reason: record.summary?.trim() || `${stageLabel(record.stage)} opportunity at version ${record.version}.`,
    stage: record.stage,
    state: "LIVE_READ_ONLY" as const,
    title: record.title,
    version: record.version
  };
}

function liveCollectionDetail(visiblePersistedRecordCount: number, visibility: "organization" | "owned") {
  const visibilityLabel = visibility === "organization" ? "organization review" : "owned review";
  if (visiblePersistedRecordCount > 0) {
    return `Only same-scope persisted opportunities are listed here for ${visibilityLabel}. Lifecycle movement opens through the governed transition command.`;
  }
  return `No same-scope persisted opportunity is visible right now for ${visibilityLabel}. Use the guided opportunity hub, create flow, or queue while the first record is prepared.`;
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
  const now = dependencies.now?.() ?? new Date();
  const generatedAt = now.toISOString();
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
    .map((record) => toVisibleLiveReadItem(record, access, now))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const visiblePersistedRecords = persistedRecords.filter((record) => (
    Boolean(safePersistedOpportunityId(record.opportunityNumber)) &&
    isPreviewRecordVisible(record, access)
  ));
  const newestVisibleRecordUpdatedAt = visiblePersistedRecords.length
    ? new Date(Math.max(...visiblePersistedRecords.map((record) => record.updatedAt.getTime()))).toISOString()
    : null;
  const liveColumns = UNIFIED_CRM_OPPORTUNITY_STAGES
    .map((stage) => {
      const items = liveReadItems.filter((item) => item.stage === stage);
      return {
        id: `stage-${stage.toLowerCase()}`,
        label: stageLabel(stage),
        itemCountLabel: `${items.length} live record${items.length === 1 ? "" : "s"}`,
        valueLabel: isTerminalUnifiedCrmOpportunityStage(stage) ? "Terminal" : "Governed movement",
        items
      };
    })
    .filter((column) => column.items.length > 0);

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
        value: "Approved",
        detail: "Approved lifecycle columns are available; movement uses the governed transition command.",
        tone: "ready"
      },
      {
        id: "bridges",
        label: "Owning-system bridges",
        value: "Prepared",
        detail: "Task, Appointment, and Dispatch packets are contract-ready but not active.",
        tone: "neutral"
      }
    ],
    columns: liveColumns.length ? liveColumns : [
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
            reason: "Use the governed create path to prepare the first opportunity without changing Dispatch Board ownership.",
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
            reason: "Amounts and probability stay review-safe until the record has required evidence and audit context.",
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
      "This pipeline page does not silently create or mutate opportunity records.",
      "Stage movement must use the governed transition command; board cards link into that command instead of mutating directly.",
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
          ? "Opportunity list entry points"
          : "Your opportunity list entry points",
      emptyMessage: liveReadItems.length
        ? "Additional persisted opportunities will appear here when they are safe to show in read-only mode."
        : "No same-scope persisted opportunity is visible yet. Use the guided hub, create flow, or queue to continue.",
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
          reason: "Open detail stays one click away; write actions remain controlled by the approved command and audit gates.",
          state: "HELD_REVIEW"
        }
      ]
    }
  };
}
