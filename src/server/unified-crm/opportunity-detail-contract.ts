import type { UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

export const UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION = "ucrm.opportunity-detail/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_DETAIL_ERROR_CONTRACT_VERSION = "ucrm.opportunity-detail-error/v1" as const;

export type UnifiedCrmOpportunityDetailVisibility = "organization" | "owned";
export type UnifiedCrmOpportunityDetailState = "HELD" | "READY";
export type UnifiedCrmOpportunityDetailLifecycleStatus = "HELD" | "READ_ONLY";
export type UnifiedCrmOpportunityDetailBridgeState = "HELD" | "CONNECTED";

export type UnifiedCrmOpportunityDetailReadModel = {
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_DETAIL_CONTRACT_VERSION;
  state: UnifiedCrmOpportunityDetailState;
  generatedAt: string;
  requestedOpportunityId: string;
  visibility: UnifiedCrmOpportunityDetailVisibility;
  source: {
    authority: "UNIFIED_CRM";
    href: "/crm?view=pipeline";
    label: "Unified CRM opportunity foundation" | "Unified CRM opportunity record";
    observedAt: string;
    readMode: "HELD_REVIEW" | "LIVE_READ_ONLY";
  };
  freshness: {
    status: "CURRENT";
    observedAt: string;
    sourceRecordUpdatedAt: string | null;
  };
  identity: {
    lifecycleStatus: UnifiedCrmOpportunityDetailLifecycleStatus;
    ownerScopeLabel: string;
    title: string;
  };
  summary: {
    customer: string;
    dueState: string;
    nextAction: string;
    owner: string;
  };
  customerContext: {
    customerId: string;
  } | null;
  lifecycle: {
    allowedNextStages: readonly UnifiedCrmOpportunityStage[];
    nextActionDueAt: string | null;
    nextActionLabel: string | null;
    stage: UnifiedCrmOpportunityStage | "HELD";
    terminal: boolean;
    transitionHref: string | null;
    version: number | null;
  };
  stageHistory: readonly {
    actorLabel: string;
    fromStage: UnifiedCrmOpportunityStage | null;
    occurredAt: string;
    reason: string;
    toStage: UnifiedCrmOpportunityStage;
  }[];
  taskActivity: {
    createTaskHref: string | null;
    links: readonly {
      actorLabel: string;
      brief: string;
      createdAt: string;
      dueAt: string;
      href: string;
      relationship: string;
      state: "ACTIVE" | "ARCHIVED";
      taskId: string;
      title: string;
    }[];
    state: "HELD" | "READY";
    summary: string;
  };
  appointmentActivity: {
    createAppointmentHref: string | null;
    links: readonly {
      actorLabel: string;
      appointmentNumber: string;
      createdAt: string;
      endsAt: string | null;
      href: string;
      relationship: string;
      startsAt: string | null;
      state: "ACTIVE" | "ARCHIVED";
      title: string;
      version: number;
    }[];
    state: "HELD" | "READY";
    summary: string;
  };
  sourceBridge: {
    detail: string;
    label: "Lead bridge" | "Source bridge";
    state: UnifiedCrmOpportunityDetailBridgeState;
  };
  relatedRecordsObservation: {
    detail: string;
    freshnessLabel: string;
    newestVisibleRecordUpdatedAt: string | null;
    state: "EMPTY" | "READY";
    visibleRecordCount: number;
  };
  relatedRecords: readonly {
    href: string;
    id: string;
    ownerLabel: string;
    state: "LIVE_READ_ONLY";
    summary: string;
    title: string;
    updatedAt: string;
  }[];
  workBridges: readonly {
    actionHref?: string | null;
    detail: string;
    domain: "TASKS" | "APPOINTMENTS" | "DISPATCH";
    label: string;
    state: "HELD" | "READY";
  }[];
  nextUnlocks: readonly string[];
};

export type UnifiedCrmOpportunityDetailFailureCode =
  | "OPPORTUNITY_DETAIL_NOT_FOUND"
  | "OPPORTUNITY_DETAIL_SOURCE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmOpportunityDetailFailureCode, number> = {
  OPPORTUNITY_DETAIL_NOT_FOUND: 404,
  OPPORTUNITY_DETAIL_SOURCE_UNAVAILABLE: 503
};

export class UnifiedCrmOpportunityDetailError extends Error {
  readonly code: UnifiedCrmOpportunityDetailFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPPORTUNITY_DETAIL_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmOpportunityDetailFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmOpportunityDetailError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "OPPORTUNITY_DETAIL_SOURCE_UNAVAILABLE";
  }
}
