import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmOpportunityDetailRepository,
  type UnifiedCrmOpportunityDetailRepository
} from "@/server/repositories/unified-crm-opportunity-detail-repository";
import {
  createUnifiedCrmOpportunityPreviewRepository,
  type UnifiedCrmOpportunityPreviewRecord,
  type UnifiedCrmOpportunityPreviewRepository
} from "@/server/repositories/unified-crm-opportunity-preview-repository";
import { type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import {
  isTerminalUnifiedCrmOpportunityStage,
  listAllowedUnifiedCrmOpportunityTransitions
} from "@/server/unified-crm/opportunity-lifecycle";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";
import {
  UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION,
  UnifiedCrmOpportunityDetailError,
  type UnifiedCrmOpportunityDetailReadModel
} from "@/server/unified-crm/opportunity-detail-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";

type Dependencies = {
  accessContext?: UnifiedCrmOpportunityAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  previewRepository?: UnifiedCrmOpportunityPreviewRepository;
  repository?: UnifiedCrmOpportunityDetailRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
  shellMode?: unknown;
};

function isHeldReviewOpportunityId(opportunityId: string) {
  return /^review\d+$/i.test(opportunityId);
}

function isRecordVisibleToAccess(
  record: { organizationId: string; ownerUser: { id: string; name: string } | null },
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

function relatedRecordsObservation(
  visibleRecordCount: number,
  newestVisibleRecordUpdatedAt: string | null,
  visibility: UnifiedCrmOpportunityDetailReadModel["visibility"]
) {
  const visibilityLabel = visibility === "organization" ? "organization review" : "owned review";
  return {
    detail: visibleRecordCount
      ? `Only same-customer persisted read-only opportunities are shown here for ${visibilityLabel}. Lifecycle movement remains off.`
      : `No additional same-customer persisted read-only opportunity is visible right now for ${visibilityLabel}. Continue with held review surfaces until one is available.`,
    freshnessLabel: newestVisibleRecordUpdatedAt
      ? `Newest additional visible persisted update observed at ${newestVisibleRecordUpdatedAt}.`
      : "No additional visible persisted opportunity update is available yet.",
    newestVisibleRecordUpdatedAt,
    state: visibleRecordCount ? "READY" as const : "EMPTY" as const,
    visibleRecordCount
  };
}

function dueState(nextActionDueAt: Date | null, now: Date) {
  if (!nextActionDueAt) return "No dated next action is active.";
  const delta = nextActionDueAt.getTime() - now.getTime();
  if (delta < -60_000) return `Overdue since ${nextActionDueAt.toISOString()}.`;
  if (delta <= 24 * 60 * 60 * 1000) return `Due within 24 hours at ${nextActionDueAt.toISOString()}.`;
  return `Due at ${nextActionDueAt.toISOString()}.`;
}

function toRelatedRecord(
  record: UnifiedCrmOpportunityPreviewRecord,
  access: UnifiedCrmOpportunityAccessContext,
  currentOpportunityId: string
) {
  const opportunityId = safePersistedOpportunityId(record.opportunityNumber);
  if (!opportunityId || opportunityId === currentOpportunityId || !isRecordVisibleToAccess(record, access)) {
    return null;
  }
  return {
    href: `/crm/opportunities/${encodeURIComponent(opportunityId)}`,
    id: opportunityId,
    ownerLabel: record.ownerUser?.name ?? "Unassigned",
    state: "LIVE_READ_ONLY" as const,
    summary: record.summary?.trim() || "Open this same-customer persisted opportunity in read-only mode.",
    title: record.title,
    updatedAt: record.updatedAt.toISOString()
  };
}

function heldModel(
  requestedOpportunityId: string,
  generatedAt: string,
  visibility: UnifiedCrmOpportunityDetailReadModel["visibility"]
): UnifiedCrmOpportunityDetailReadModel {
  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION,
    state: "HELD",
    generatedAt,
    requestedOpportunityId,
    visibility,
    source: {
      authority: "UNIFIED_CRM",
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity foundation",
      observedAt: generatedAt,
      readMode: "HELD_REVIEW"
    },
    freshness: {
      status: "CURRENT",
      observedAt: generatedAt,
      sourceRecordUpdatedAt: null
    },
    identity: {
      lifecycleStatus: "HELD",
      ownerScopeLabel: visibility === "organization" ? "Organization review scope" : "Owned review scope",
      title: "Opportunity detail review"
    },
    summary: {
      customer: "Will appear after the first governed opportunity create path is approved.",
      dueState: "No committed due state is active while lifecycle rules are held.",
      nextAction: "Next actions stay source-owned until operational opportunity commands are approved.",
      owner: visibility === "organization" ? "Assigned by CRM policy when operational create is enabled." : "Your owned opportunities will appear here after lifecycle approval."
    },
    customerContext: null,
    lifecycle: {
      allowedNextStages: [],
      nextActionDueAt: null,
      nextActionLabel: null,
      stage: "HELD",
      terminal: false,
      transitionHref: null,
      version: null
    },
    stageHistory: [],
    taskActivity: {
      createTaskHref: null,
      links: [],
      state: "HELD",
      summary: "Task activity is held until the first durable opportunity record exists and task linkage is approved."
    },
    appointmentActivity: {
      createAppointmentHref: null,
      links: [],
      state: "HELD",
      summary: "Appointment bridge activity is held until a durable opportunity record and appointment authority are available."
    },
    sourceBridge: {
      label: "Lead bridge",
      state: "HELD",
      detail: "Customer leads remain source-owned. CRM will correlate them without rewriting source stages or scores."
    },
    relatedRecordsObservation: relatedRecordsObservation(0, null, visibility),
    relatedRecords: [],
    workBridges: [
      {
        domain: "TASKS",
        label: "Governed tasks",
        state: "HELD",
        detail: "Task linkage is held until the first durable opportunity record exists and tenant-safe correlation is proven."
      },
      {
        domain: "APPOINTMENTS",
        label: "Appointments",
        state: "HELD",
        detail: "Appointment handoff contracts are ready, but no appointment draft or existing-link action is enabled from this detail yet."
      },
      {
        domain: "DISPATCH",
        label: "Dispatch and jobs",
        state: "HELD",
        detail: "Dispatch remains the owning system. CRM will link or hand off work only after an approved opportunity lifecycle exists."
      }
    ],
    nextUnlocks: [
      "Approve stage definitions, transition evidence, and close or loss rules before enabling create or movement.",
      "Verify the first governed opportunity detail against permissions, audit history, and rollback before turning on live writes."
    ]
  };
}

export async function getUnifiedCrmOpportunityDetail(
  actor: AuthenticatedUser | null,
  opportunityId: string,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityDetailReadModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const normalizedOpportunityId = normalizeUnifiedCrmOpportunityId(opportunityId);
  const now = dependencies.now?.() ?? new Date();
  const generatedAt = now.toISOString();
  const visibility = access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";

  if (isHeldReviewOpportunityId(normalizedOpportunityId)) {
    return heldModel(normalizedOpportunityId, generatedAt, visibility);
  }

  const repository = dependencies.repository ?? createUnifiedCrmOpportunityDetailRepository();
  const previewRepository = dependencies.previewRepository ?? createUnifiedCrmOpportunityPreviewRepository();
  try {
    const record = await repository.findOpportunityDetail({
      opportunityId: normalizedOpportunityId,
      organizationId: access.organizationId,
      recordScope: access.recordScope
    });
    if (!record) {
      throw new UnifiedCrmOpportunityDetailError(
        "OPPORTUNITY_DETAIL_NOT_FOUND",
        "Opportunity detail is not available."
      );
    }
    if (!isRecordVisibleToAccess(record, access)) {
      throw new UnifiedCrmOpportunityDetailError(
        "OPPORTUNITY_DETAIL_NOT_FOUND",
        "Opportunity detail is not available."
      );
    }

    const relatedPreviewRecords = record.customer?.id
      ? await previewRepository.listOpportunityPreviews({
          customerId: record.customer.id,
          limit: 4,
          organizationId: access.organizationId,
          recordScope: access.recordScope
        })
      : [];
    const relatedRecords = relatedPreviewRecords
      .map((preview) => toRelatedRecord(preview, access, normalizedOpportunityId))
      .filter((preview): preview is NonNullable<typeof preview> => Boolean(preview));
    const newestVisibleRelatedRecordUpdatedAt = relatedRecords.length
      ? new Date(Math.max(...relatedRecords.map((preview) => new Date(preview.updatedAt).getTime()))).toISOString()
      : null;
    const allowedNextStages = listAllowedUnifiedCrmOpportunityTransitions(record.stage);
    const terminal = isTerminalUnifiedCrmOpportunityStage(record.stage);

    return {
      contractVersion: UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION,
      state: "READY",
      generatedAt,
      requestedOpportunityId: normalizedOpportunityId,
      visibility,
      source: {
        authority: "UNIFIED_CRM",
        href: "/crm?view=pipeline",
        label: "Unified CRM opportunity record",
        observedAt: generatedAt,
        readMode: "LIVE_READ_ONLY"
      },
      freshness: {
        status: "CURRENT",
        observedAt: generatedAt,
        sourceRecordUpdatedAt: record.updatedAt.toISOString()
      },
      identity: {
        lifecycleStatus: "READ_ONLY",
        ownerScopeLabel: visibility === "organization" ? "Organization read-only scope" : "Owned read-only scope",
        title: record.title
      },
      summary: {
        customer: record.customer
          ? `${record.customer.displayName} · ${record.customer.customerNumber}`
          : "Customer link not yet attached.",
        dueState: dueState(record.nextActionDueAt, now),
        nextAction: record.nextActionLabel?.trim() || record.summary?.trim() || "No governed next action has been recorded yet.",
        owner: record.ownerUser?.name ?? "Unassigned"
      },
      customerContext: record.customer ? { customerId: record.customer.id } : null,
      lifecycle: {
        allowedNextStages,
        nextActionDueAt: record.nextActionDueAt?.toISOString() ?? null,
        nextActionLabel: record.nextActionLabel,
        stage: record.stage,
        terminal,
        transitionHref: allowedNextStages.length
          ? `/crm/opportunities/${encodeURIComponent(normalizedOpportunityId)}/transition`
          : null,
        version: record.version
      },
      stageHistory: record.stageHistory.map((event) => ({
        actorLabel: event.actorLabel,
        fromStage: event.fromStage,
        occurredAt: event.occurredAt.toISOString(),
        reason: event.reason,
        toStage: event.toStage
      })),
      taskActivity: {
        createTaskHref: terminal
          ? null
          : `/api/crm/v1/opportunities/${encodeURIComponent(normalizedOpportunityId)}/tasks`,
        links: record.taskLinks.map((link) => ({
          actorLabel: link.actorLabel,
          brief: link.brief,
          createdAt: link.createdAt.toISOString(),
          dueAt: link.dueAt.toISOString(),
          href: `/tasks/${encodeURIComponent(link.taskId)}`,
          relationship: link.relationship,
          state: link.archivedAt ? "ARCHIVED" : "ACTIVE",
          taskId: link.taskId,
          title: link.title
        })),
        state: "READY",
        summary: record.taskLinks.length
          ? `${record.taskLinks.length} governed task link(s) are attached to this opportunity.`
          : "No governed task link has been attached yet. Create one here when the next action needs tracked work."
      },
      appointmentActivity: {
        createAppointmentHref: terminal
          ? null
          : `/api/crm/v1/opportunities/${encodeURIComponent(normalizedOpportunityId)}/appointments`,
        links: record.appointmentLinks.map((link) => ({
          actorLabel: link.actorLabel,
          appointmentNumber: link.appointmentNumber,
          createdAt: link.createdAt.toISOString(),
          endsAt: link.endsAt?.toISOString() ?? null,
          href: `/appointments?appointment=${encodeURIComponent(link.appointmentNumber)}`,
          relationship: link.relationship,
          startsAt: link.startsAt?.toISOString() ?? null,
          state: link.archivedAt ? "ARCHIVED" : "ACTIVE",
          title: link.title,
          version: link.version
        })),
        state: "READY",
        summary: record.appointmentLinks.length
          ? `${record.appointmentLinks.length} governed appointment link(s) are attached to this opportunity.`
          : "No governed appointment link has been attached yet. Create a draft when the opportunity is ready for scheduling."
      },
      sourceBridge: {
        label: record.sourceLead ? "Lead bridge" : "Source bridge",
        state: record.sourceLead ? "CONNECTED" : "HELD",
        detail: record.sourceLead
          ? `Connected to lead ${record.sourceLead.leadNumber}. Lead stage remains source-owned at ${record.sourceLead.stage.replaceAll("_", " ").toLowerCase()}.`
          : "No source bridge has been attached to this opportunity record yet."
      },
      relatedRecordsObservation: relatedRecordsObservation(
        relatedRecords.length,
        newestVisibleRelatedRecordUpdatedAt,
        visibility
      ),
      relatedRecords,
      workBridges: [
        {
          domain: "TASKS",
          label: "Governed tasks",
          state: terminal ? "HELD" : "READY",
          actionHref: terminal ? null : `/api/crm/v1/opportunities/${encodeURIComponent(normalizedOpportunityId)}/tasks`,
          detail: terminal
            ? "Terminal opportunities do not accept new task links until a manager reopen control is approved."
            : "Create a governed Dispatch task from this opportunity while preserving CRM opportunity correlation and audit history."
        },
        {
          domain: "APPOINTMENTS",
          label: "Appointments",
          state: terminal ? "HELD" : "READY",
          actionHref: terminal ? null : `/api/crm/v1/opportunities/${encodeURIComponent(normalizedOpportunityId)}/appointments`,
          detail: terminal
            ? "Terminal opportunities do not accept new appointment links until a manager reopen control is approved."
            : "Create a governed draft appointment from this opportunity while appointment scheduling remains the authoritative system."
        },
        {
          domain: "DISPATCH",
          label: "Dispatch and jobs",
          state: "HELD",
          detail: "Dispatch remains authoritative until an approved opportunity lifecycle can hand work off safely."
        }
      ],
      nextUnlocks: [
        terminal
          ? "Terminal opportunities remain closed until a manager reopen control is approved."
          : "Use the governed transition flow when the next action evidence is ready.",
        "Verify source-bridge behavior and downstream task/appointment/dispatch links before enabling operational bridge commands."
      ]
    };
  } catch (error) {
    if (error instanceof UnifiedCrmOpportunityDetailError) {
      throw error;
    }
    throw new UnifiedCrmOpportunityDetailError(
      "OPPORTUNITY_DETAIL_SOURCE_UNAVAILABLE",
      "Opportunity detail is temporarily unavailable.",
      { cause: error }
    );
  }
}
