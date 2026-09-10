import type { WorkdayPriority, WorkdayRiskLevel } from "@prisma/client";

export const CRM_WORKBOOK_ITEM_TYPES = [
  "FOLLOW_UP_DUE_TODAY",
  "OVERDUE_FOLLOW_UP",
  "OPEN_CUSTOMER_ISSUE",
  "APPOINTMENT_TODAY",
  "STALE_LEAD",
  "DEAL_NEEDS_ACTION",
  "PROMISED_CUSTOMER_COMMUNICATION",
  "DOCUMENT_COMPLIANCE_ISSUE",
  "MANAGER_ASSIGNED_CUSTOMER_TASK"
] as const;

export type CrmWorkbookItemType = (typeof CRM_WORKBOOK_ITEM_TYPES)[number];

export type CrmWorkbookDestination = "START_THE_DAY" | "WORK_THE_DAY" | "TODAYS_WORK" | "NEEDS_ATTENTION" | "END_THE_DAY" | "CARRYOVER" | "REPORT_SEEDS";

export type CrmWorkbookCandidate = {
  customerName?: string | null;
  detail: string;
  dueAt?: string | null;
  href: string;
  id: string;
  itemType: CrmWorkbookItemType;
  ownerUserId?: string | null;
  priority: WorkdayPriority;
  riskLevel: WorkdayRiskLevel;
  sourceId: string;
  sourceType: string;
  title: string;
};

export type CrmWorkbookAction = {
  destination: CrmWorkbookDestination;
  label: string;
  primary: boolean;
};

export type CrmWorkbookPlanItem = CrmWorkbookCandidate & {
  actions: CrmWorkbookAction[];
  alreadyInTodayFocus: boolean;
  duplicateKey: string;
  nextBestAction: CrmWorkbookAction;
};

type ExistingFocusIdentity = {
  outcome: string;
  sourceId?: string | null;
  sourceType?: string | null;
};

type PlanOptions = {
  existingFocusItems?: ExistingFocusIdentity[];
  limit?: number;
};

const urgentTypes = new Set<CrmWorkbookItemType>([
  "OVERDUE_FOLLOW_UP",
  "OPEN_CUSTOMER_ISSUE",
  "PROMISED_CUSTOMER_COMMUNICATION",
  "DOCUMENT_COMPLIANCE_ISSUE",
  "MANAGER_ASSIGNED_CUSTOMER_TASK"
]);

function normalizeKey(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function crmWorkbookDuplicateKey(item: Pick<CrmWorkbookCandidate, "sourceId" | "sourceType" | "title">) {
  const sourceType = item.sourceType.trim();
  const sourceId = item.sourceId.trim();
  if (sourceType && sourceId) return `${sourceType}:${sourceId}`;
  return normalizeKey(item.title);
}

function itemRank(item: CrmWorkbookCandidate) {
  const priorityRank: Record<WorkdayPriority, number> = { CRITICAL: 100, HIGH: 80, MEDIUM: 50, LOW: 20 };
  const riskRank: Record<WorkdayRiskLevel, number> = { BLOCKED: 30, WATCH: 15, NONE: 0 };
  return priorityRank[item.priority] + riskRank[item.riskLevel] + (urgentTypes.has(item.itemType) ? 20 : 0);
}

function actionsFor(item: CrmWorkbookCandidate): CrmWorkbookAction[] {
  const needsAttention = item.riskLevel === "BLOCKED" || urgentTypes.has(item.itemType);
  const primary: CrmWorkbookAction = needsAttention
    ? { destination: "NEEDS_ATTENTION", label: "Review now", primary: true }
    : { destination: "TODAYS_WORK", label: "Add to Today’s Work", primary: true };

  return [
    primary,
    { destination: "START_THE_DAY", label: "Consider during Start The Day", primary: false },
    { destination: "WORK_THE_DAY", label: "Work / update", primary: false },
    { destination: "CARRYOVER", label: "Carry over", primary: false },
    { destination: "REPORT_SEEDS", label: "Keep report note", primary: false },
    { destination: "END_THE_DAY", label: "Review before close", primary: false }
  ];
}

export function buildCrmWorkbookPlan(candidates: readonly CrmWorkbookCandidate[], options: PlanOptions = {}) {
  const existingFocusKeys = new Set((options.existingFocusItems ?? []).flatMap((item) => [
    item.sourceType && item.sourceId ? `${item.sourceType}:${item.sourceId}` : "",
    normalizeKey(item.outcome)
  ].filter(Boolean)));
  const seen = new Set<string>();
  const items: CrmWorkbookPlanItem[] = [];

  for (const candidate of candidates) {
    const duplicateKey = crmWorkbookDuplicateKey(candidate);
    if (!duplicateKey || seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    const actions = actionsFor(candidate);
    items.push({
      ...candidate,
      actions,
      alreadyInTodayFocus: existingFocusKeys.has(duplicateKey) || existingFocusKeys.has(normalizeKey(candidate.title)),
      duplicateKey,
      nextBestAction: actions.find((action) => action.primary) ?? actions[0]
    });
  }

  return items
    .sort((left, right) => itemRank(right) - itemRank(left) || left.title.localeCompare(right.title))
    .slice(0, Math.max(0, options.limit ?? items.length));
}
