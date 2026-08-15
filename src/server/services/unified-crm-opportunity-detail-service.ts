import type { AuthenticatedUser } from "@/server/auth/store";
import { type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";
import {
  UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION,
  type UnifiedCrmOpportunityDetailReadModel
} from "@/server/unified-crm/opportunity-detail-contract";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";

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

export async function getUnifiedCrmOpportunityDetail(
  actor: AuthenticatedUser | null,
  opportunityId: string,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityDetailReadModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmOpportunityDetailAccess(actor, dependencies);
  const normalizedOpportunityId = normalizeUnifiedCrmOpportunityId(opportunityId);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const visibility = access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION,
    state: "HELD",
    generatedAt,
    requestedOpportunityId: normalizedOpportunityId,
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
