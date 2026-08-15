import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmOpportunityDetailRepository,
  type UnifiedCrmOpportunityDetailRepository
} from "@/server/repositories/unified-crm-opportunity-detail-repository";
import { type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
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
    sourceBridge: {
      label: "Lead bridge",
      state: "HELD",
      detail: "Customer leads remain source-owned. CRM will correlate them without rewriting source stages or scores."
    },
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
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const visibility = access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";

  if (isHeldReviewOpportunityId(normalizedOpportunityId)) {
    return heldModel(normalizedOpportunityId, generatedAt, visibility);
  }

  const repository = dependencies.repository ?? createUnifiedCrmOpportunityDetailRepository();
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
        dueState: "No governed due state is active for this read-only record yet.",
        nextAction: record.summary?.trim() || "No governed next action has been recorded yet.",
        owner: record.ownerUser?.name ?? "Unassigned"
      },
      sourceBridge: {
        label: record.sourceLead ? "Lead bridge" : "Source bridge",
        state: record.sourceLead ? "CONNECTED" : "HELD",
        detail: record.sourceLead
          ? `Connected to lead ${record.sourceLead.leadNumber}. Lead stage remains source-owned at ${record.sourceLead.stage.replaceAll("_", " ").toLowerCase()}.`
          : "No source bridge has been attached to this opportunity record yet."
      },
      workBridges: [
        {
          domain: "TASKS",
          label: "Governed tasks",
          state: "HELD",
          detail: "Task linkage remains held until live opportunity lifecycle commands are approved."
        },
        {
          domain: "APPOINTMENTS",
          label: "Appointments",
          state: "HELD",
          detail: "Appointment linkage stays source-owned while this record remains read-only."
        },
        {
          domain: "DISPATCH",
          label: "Dispatch and jobs",
          state: "HELD",
          detail: "Dispatch remains authoritative until an approved opportunity lifecycle can hand work off safely."
        }
      ],
      nextUnlocks: [
        "Approve lifecycle stage names, evidence rules, and transition controls before enabling any live opportunity movement.",
        "Verify audit history, rollback, and source-bridge behavior against this persisted record before enabling operational commands."
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
