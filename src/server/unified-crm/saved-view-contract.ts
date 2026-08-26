import { UNIFIED_CRM_OPPORTUNITY_STAGES, type UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

export const UNIFIED_CRM_SAVED_VIEW_CONTRACT_VERSION = "ucrm.saved-view/v1" as const;
export const UNIFIED_CRM_SAVED_VIEW_ERROR_CONTRACT_VERSION = "ucrm.saved-view-error/v1" as const;
export const UNIFIED_CRM_SAVED_VIEW_CONFIG_SCHEMA_VERSION = 1 as const;

export const UNIFIED_CRM_SAVED_VIEW_TABS = ["work", "customers", "pipeline", "conversations", "insights", "more"] as const;
export const UNIFIED_CRM_SAVED_VIEW_DATE_WINDOWS = ["ALL", "TODAY", "NEXT_7_DAYS", "OVERDUE", "NO_NEXT_ACTION"] as const;
export const UNIFIED_CRM_SAVED_VIEW_OWNER_FILTERS = ["ANY", "MINE", "UNASSIGNED"] as const;
export const UNIFIED_CRM_SAVED_VIEW_SORTS = ["UPDATED_DESC", "NEXT_ACTION_ASC", "VALUE_DESC", "CUSTOMER_ASC"] as const;

export type UnifiedCrmSavedViewTab = (typeof UNIFIED_CRM_SAVED_VIEW_TABS)[number];
export type UnifiedCrmSavedViewDateWindow = (typeof UNIFIED_CRM_SAVED_VIEW_DATE_WINDOWS)[number];
export type UnifiedCrmSavedViewOwnerFilter = (typeof UNIFIED_CRM_SAVED_VIEW_OWNER_FILTERS)[number];
export type UnifiedCrmSavedViewSort = (typeof UNIFIED_CRM_SAVED_VIEW_SORTS)[number];
export type UnifiedCrmSavedViewVisibility = "PERSONAL" | "TEAM";

export type UnifiedCrmSavedViewConfig = {
  dateWindow: UnifiedCrmSavedViewDateWindow;
  includeArchived: boolean;
  ownerFilter: UnifiedCrmSavedViewOwnerFilter;
  query: string;
  sort: UnifiedCrmSavedViewSort;
  stages: UnifiedCrmOpportunityStage[];
  tab: UnifiedCrmSavedViewTab;
};

export type UnifiedCrmSavedViewModel = UnifiedCrmSavedViewConfig & {
  canDelete: boolean;
  configSchemaVersion: number;
  contractVersion: typeof UNIFIED_CRM_SAVED_VIEW_CONTRACT_VERSION;
  createdAt: string;
  createdByUser: { id: string; name: string };
  id: string;
  name: string;
  recoveryNotice: string | null;
  updatedAt: string;
  version: number;
  visibility: UnifiedCrmSavedViewVisibility;
};

export type UnifiedCrmSavedViewListModel = {
  contractVersion: typeof UNIFIED_CRM_SAVED_VIEW_CONTRACT_VERSION;
  savedViews: UnifiedCrmSavedViewModel[];
};

export type UnifiedCrmSavedViewFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "SAVED_VIEW_FORBIDDEN"
  | "SAVED_VIEW_INVALID"
  | "SAVED_VIEW_NOT_FOUND"
  | "SAVED_VIEW_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmSavedViewFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  SAVED_VIEW_FORBIDDEN: 403,
  SAVED_VIEW_INVALID: 400,
  SAVED_VIEW_NOT_FOUND: 404,
  SAVED_VIEW_UNAVAILABLE: 500
};

export class UnifiedCrmSavedViewError extends Error {
  readonly code: UnifiedCrmSavedViewFailureCode;
  readonly contractVersion = UNIFIED_CRM_SAVED_VIEW_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmSavedViewFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmSavedViewError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "SAVED_VIEW_UNAVAILABLE";
  }
}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_INVALID", "Saved view payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new UnifiedCrmSavedViewError("SAVED_VIEW_INVALID", `${label} is required.`);
  if (result.length > max) throw new UnifiedCrmSavedViewError("SAVED_VIEW_INVALID", `${label} must be ${max} characters or fewer.`);
  return result;
}

function optionalSearch(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  return typeof value === "string" && allowed.includes(value) ? value as T[number] : fallback;
}

export function normalizeUnifiedCrmSavedViewName(value: unknown) {
  return text(value, "Saved view name", 80);
}

export function normalizeUnifiedCrmSavedViewVisibility(value: unknown): UnifiedCrmSavedViewVisibility {
  const visibility = typeof value === "string" ? value.trim().toUpperCase() : "PERSONAL";
  if (visibility !== "PERSONAL" && visibility !== "TEAM") {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_INVALID", "Saved view visibility is invalid.");
  }
  return visibility;
}

export function normalizeUnifiedCrmSavedViewConfig(value: unknown): UnifiedCrmSavedViewConfig {
  const raw = object(value);
  const stages = Array.isArray(raw.stages)
    ? [...new Set(raw.stages.filter((stage): stage is UnifiedCrmOpportunityStage =>
        typeof stage === "string" && UNIFIED_CRM_OPPORTUNITY_STAGES.includes(stage as UnifiedCrmOpportunityStage)
      ))]
    : [];

  return {
    dateWindow: oneOf(raw.dateWindow, UNIFIED_CRM_SAVED_VIEW_DATE_WINDOWS, "ALL"),
    includeArchived: raw.includeArchived === true,
    ownerFilter: oneOf(raw.ownerFilter, UNIFIED_CRM_SAVED_VIEW_OWNER_FILTERS, "ANY"),
    query: optionalSearch(raw.query),
    sort: oneOf(raw.sort, UNIFIED_CRM_SAVED_VIEW_SORTS, "UPDATED_DESC"),
    stages,
    tab: oneOf(raw.tab, UNIFIED_CRM_SAVED_VIEW_TABS, "work")
  };
}

export const DEFAULT_UNIFIED_CRM_SAVED_VIEW_CONFIG: UnifiedCrmSavedViewConfig = {
  dateWindow: "ALL",
  includeArchived: false,
  ownerFilter: "ANY",
  query: "",
  sort: "UPDATED_DESC",
  stages: [],
  tab: "work"
};
