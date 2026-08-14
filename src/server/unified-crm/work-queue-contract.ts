export const UNIFIED_CRM_WORK_QUEUE_CONTRACT_VERSION = "ucrm.work-queue/v1" as const;
export const UNIFIED_CRM_WORK_QUEUE_ERROR_CONTRACT_VERSION = "ucrm.work-queue-error/v1" as const;

export type UnifiedCrmWorkQueueVisibility = "organization" | "owned";
export type UnifiedCrmWorkQueueDueState = "overdue" | "today" | "upcoming" | "waiting";
export type UnifiedCrmWorkQueueItemKind = "task" | "appointment" | "lead" | "case" | "customer";
export type UnifiedCrmWorkReadMode = "OFF" | "REVIEW";

export type UnifiedCrmWorkQueueItem = {
  id: string;
  kind: UnifiedCrmWorkQueueItemKind;
  title: string;
  customerLabel: string;
  ownerName: string;
  sourceLabel: string;
  sourceHref: string;
  primaryActionLabel: string;
  dueAt: string | null;
  dueLabel: string;
  dueState: UnifiedCrmWorkQueueDueState;
  stageLabel: string;
  reason: string;
  history: string[];
  updatedAt: string;
};

export type UnifiedCrmWorkTodayItem = {
  id: string;
  title: string;
  customerLabel: string;
  detail: string;
  startsAt: string | null;
  sourceHref: string;
};

export type UnifiedCrmWorkQueueReadModel = {
  contractVersion: typeof UNIFIED_CRM_WORK_QUEUE_CONTRACT_VERSION;
  state: "READY" | "EMPTY";
  visibility: UnifiedCrmWorkQueueVisibility;
  generatedAt: string;
  source: {
    authority: "UNIFIED_CRM";
    label: "CRM Work";
    href: "/crm?view=work";
    readMode: "LIVE_AGGREGATED";
    observedAt: string;
  };
  freshness: {
    status: "CURRENT";
    observedAt: string;
    newestRecordUpdatedAt: string | null;
  };
  summary: {
    totalCount: number;
    overdueCount: number;
    todayCount: number;
    waitingCount: number;
    appointmentCount: number;
  };
  items: UnifiedCrmWorkQueueItem[];
  today: UnifiedCrmWorkTodayItem[];
};

export type UnifiedCrmWorkReadFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CRM_WORK_NOT_AUTHORIZED"
  | "CRM_WORK_OFF"
  | "CRM_WORK_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmWorkReadFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CRM_WORK_NOT_AUTHORIZED: 403,
  CRM_WORK_OFF: 503,
  CRM_WORK_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmWorkReadError extends Error {
  readonly code: UnifiedCrmWorkReadFailureCode;
  readonly contractVersion = UNIFIED_CRM_WORK_QUEUE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmWorkReadFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmWorkReadError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CRM_WORK_SOURCE_UNAVAILABLE";
  }
}
