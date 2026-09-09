import type { UnifiedCrmWorkQueueItem, UnifiedCrmWorkQueueReadModel } from "@/server/unified-crm/work-queue-contract";
import {
  UNIFIED_ACTION_CONTRACT_VERSION,
  type UnifiedActionAudit,
  type UnifiedActionDueState,
  type UnifiedActionModel,
  type UnifiedActionPriority,
  type UnifiedActionRelationships,
  type UnifiedActionSource,
  type UnifiedActionStatus,
  type UnifiedActionType
} from "@/server/unified-actions/unified-action-contract";

export type BuildUnifiedActionInput = {
  id: string;
  title: string;
  description: string;
  actionType: UnifiedActionType;
  owner: { id?: string | null; name: string };
  status?: string | null;
  priority?: string | null;
  dueAt?: string | null;
  source: UnifiedActionSource;
  relationships?: UnifiedActionRelationships;
  reportWorthy?: boolean;
  businessImpact?: string | null;
  nextRecommendedAction?: string | null;
  audit?: Partial<UnifiedActionAudit>;
  now?: Date;
};

const HIGH_IMPACT_TYPES: UnifiedActionType[] = [
  "review_promise",
  "resolve_blocker",
  "request_support",
  "manager_review",
  "update_repair_order"
];

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function classifyUnifiedActionDueState(input: {
  completedAt?: string | null;
  dueAt?: string | null;
  now?: Date;
  status?: string | null;
}): UnifiedActionDueState {
  if (normalizeUnifiedActionStatus(input.status) === "done" || input.completedAt) return "completed";
  if (!input.dueAt) return "unscheduled";

  const due = new Date(input.dueAt);
  if (Number.isNaN(due.getTime())) return "unscheduled";

  const now = input.now ?? new Date();
  if (due.getTime() < now.getTime()) return "overdue";
  if (startOfLocalDay(due) === startOfLocalDay(now)) return "due_today";
  return "upcoming";
}

export function normalizeUnifiedActionPriority(value?: string | null): UnifiedActionPriority {
  const normalized = value?.trim().toLowerCase().replace(/[\s_]+/g, "-") ?? "";
  if (["critical", "urgent", "must-close", "must-close-today"].includes(normalized)) return "critical";
  if (["high", "important"].includes(normalized)) return "high";
  if (["low", "minor"].includes(normalized)) return "low";
  return "medium";
}

export function normalizeUnifiedActionStatus(value?: string | null): UnifiedActionStatus {
  const normalized = value?.trim().toLowerCase().replace(/[\s_]+/g, "-") ?? "";
  if (["complete", "completed", "done", "closed", "resolved"].includes(normalized)) return "done";
  if (["blocked", "escalated"].includes(normalized)) return "blocked";
  if (["waiting", "pending", "on-hold", "hold"].includes(normalized)) return "waiting";
  if (["started", "in-progress", "working"].includes(normalized)) return "in_progress";
  if (["cancelled", "canceled", "void"].includes(normalized)) return "cancelled";
  return "not_started";
}

export function inferUnifiedActionType(input: { kind?: string | null; label?: string | null; title?: string | null }): UnifiedActionType {
  const text = [input.kind, input.label, input.title].filter(Boolean).join(" ").toLowerCase();
  if (/\bpromise|promised|target time\b/.test(text)) return "review_promise";
  if (/\bblock|risk|escalat|stuck\b/.test(text)) return "resolve_blocker";
  if (/\bappointment|schedule|visit\b/.test(text)) return "schedule_appointment";
  if (/\brepair|ro-|repair order\b/.test(text)) return "update_repair_order";
  if (/\bmessage|text|sms|email\b/.test(text)) return "send_message";
  if (/\bnote|update|outcome\b/.test(text)) return "add_note";
  if (/\bcarry\b/.test(text)) return "carry_over";
  return "follow_up";
}

export function buildUnifiedAction(input: BuildUnifiedActionInput): UnifiedActionModel {
  const now = input.now ?? new Date();
  const status = normalizeUnifiedActionStatus(input.status);
  const completedAt = input.audit?.completedAt ?? (status === "done" ? now.toISOString() : null);
  const priority = normalizeUnifiedActionPriority(input.priority);
  const dueState = classifyUnifiedActionDueState({
    completedAt,
    dueAt: input.dueAt ?? null,
    now,
    status
  });
  const reportWorthy = input.reportWorthy ?? (priority === "critical" || dueState === "overdue" || HIGH_IMPACT_TYPES.includes(input.actionType));

  return {
    actionType: input.actionType,
    audit: {
      completedAt,
      createdAt: input.audit?.createdAt ?? now.toISOString(),
      generatedBy: input.audit?.generatedBy ?? "source_record",
      updatedAt: input.audit?.updatedAt ?? now.toISOString()
    },
    businessImpact: input.businessImpact?.trim() || input.description,
    contractVersion: UNIFIED_ACTION_CONTRACT_VERSION,
    description: input.description,
    dueAt: input.dueAt ?? null,
    dueState,
    id: input.id,
    nextRecommendedAction: input.nextRecommendedAction?.trim() || input.title,
    owner: {
      id: input.owner.id ?? null,
      name: input.owner.name.trim() || "Unassigned"
    },
    priority,
    relationships: input.relationships ?? {},
    reportWorthy,
    source: input.source,
    status,
    title: input.title
  };
}

export function unifiedActionFromCrmWorkQueueItem(item: UnifiedCrmWorkQueueItem, now = new Date()): UnifiedActionModel {
  return buildUnifiedAction({
    actionType: inferUnifiedActionType({ kind: item.kind, label: item.primaryActionLabel, title: item.title }),
    audit: {
      createdAt: item.updatedAt,
      generatedBy: "source_record",
      updatedAt: item.updatedAt
    },
    businessImpact: item.reason,
    description: item.history.length ? `${item.reason} Recent context: ${item.history.join(" ")}` : item.reason,
    dueAt: item.dueAt,
    id: `crm:${item.kind}:${item.id}`,
    nextRecommendedAction: item.primaryActionLabel,
    now,
    owner: { name: item.ownerName },
    priority: item.dueState === "overdue" ? "high" : item.dueState === "today" ? "medium" : "low",
    relationships: {
      customerId: item.customerHref?.match(/\/crm\/customers\/([^?]+)/)?.[1] ?? null
    },
    source: {
      href: item.sourceHref,
      label: item.sourceLabel,
      module: item.kind === "appointment" ? "APPOINTMENTS" : item.kind === "lead" ? "SALES" : item.kind === "case" ? "CRM" : "CRM",
      recordId: item.id
    },
    status: item.dueState === "waiting" ? "waiting" : "not_started",
    title: item.title
  });
}

export function unifiedActionsFromCrmWorkQueue(model: UnifiedCrmWorkQueueReadModel, now = new Date()) {
  return model.items.map((item) => unifiedActionFromCrmWorkQueueItem(item, now));
}
