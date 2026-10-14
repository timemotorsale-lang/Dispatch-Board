export type AutomationSeverity = "critical" | "high" | "medium" | "low";
export type AutomationQueue =
  | "COACHING_SIGNAL"
  | "COMMUNICATION_RISK"
  | "COMPLIANCE_TASK"
  | "FOLLOW_UP_REQUIRED"
  | "MANAGER_REVIEW"
  | "NEEDS_ATTENTION"
  | "RECON_BLOCKER"
  | "REVIVE_OR_CLOSE";

export type AutomationAction = {
  actionLabel: string;
  createsTask: boolean;
  dedupeKey: string;
  evidence: string[];
  explanation: string;
  href: string;
  id: string;
  ruleCode: string;
  severity: AutomationSeverity;
  sourceId: string;
  targetQueue: AutomationQueue;
  title: string;
};

type TimedRecord = { dueAt?: string | null; href: string; id: string; status?: string | null; title: string };
type VehicleRecord = { blocked?: boolean; href: string; id: string; stageEnteredAt?: string | null; status?: string | null; title: string };
type RepairDelayRecord = { href: string; id: string; lastCustomerUpdateAt?: string | null; targetAt?: string | null; title: string; waitingOnParts?: boolean };
type CarryoverRecord = { count: number; href: string; id: string; title: string };
type LeadRecord = { href: string; id: string; lastActivityAt?: string | null; status?: string | null; title: string };
type RequiredDocumentRecord = { href: string; id: string; received?: boolean; required?: boolean; title: string };
type AppointmentRecord = { href: string; id: string; startAt?: string | null; status?: string | null; title: string };

export type WorkflowAutomationInput = {
  appointments?: AppointmentRecord[];
  carryovers?: CarryoverRecord[];
  customerFollowUps?: TimedRecord[];
  documents?: RequiredDocumentRecord[];
  leads?: LeadRecord[];
  now: Date;
  promises?: TimedRecord[];
  repairDelays?: RepairDelayRecord[];
  staleLeadDays?: number;
  staleStageHours?: number;
  vehicles?: VehicleRecord[];
};

const openStatuses = new Set(["", "OPEN", "ACTIVE", "PENDING", "SCHEDULED", "WAITING", "IN_PROGRESS", "NOT_STARTED"]);
const closedStatuses = new Set(["CANCELLED", "CLOSED", "COMPLETED", "DONE", "FULFILLED", "LOST"]);
const missedAppointmentStatuses = new Set(["MISSED", "NO_SHOW", "SCHEDULED", "CONFIRMED"]);

function status(value: string | null | undefined) { return String(value ?? "").trim().toUpperCase(); }
function isOpen(value: string | null | undefined) { const current = status(value); return openStatuses.has(current) && !closedStatuses.has(current); }
function beforeNow(value: string | null | undefined, now: Date) { return Boolean(value) && new Date(value!).getTime() < now.getTime(); }
function hoursOld(value: string | null | undefined, now: Date) { return value ? (now.getTime() - new Date(value).getTime()) / 3600000 : Number.POSITIVE_INFINITY; }
function daysOld(value: string | null | undefined, now: Date) { return hoursOld(value, now) / 24; }
function action(input: Omit<AutomationAction, "dedupeKey" | "id">): AutomationAction {
  const dedupeKey = `${input.ruleCode}:${input.sourceId}`;
  return { ...input, dedupeKey, id: dedupeKey.toLowerCase().replaceAll(/[^a-z0-9:.-]+/g, "-") };
}

export function dedupeAutomationActions(actions: AutomationAction[]) {
  const seen = new Set<string>();
  return actions.filter((item) => {
    if (seen.has(item.dedupeKey)) return false;
    seen.add(item.dedupeKey);
    return true;
  });
}

export function evaluateWorkflowAutomationRules(input: WorkflowAutomationInput): AutomationAction[] {
  const actions: AutomationAction[] = [];
  const staleStageHours = input.staleStageHours ?? 72;
  const staleLeadDays = input.staleLeadDays ?? 7;

  for (const item of input.customerFollowUps ?? []) {
    if (isOpen(item.status) && beforeNow(item.dueAt, input.now)) actions.push(action({
      actionLabel: "Open follow-up",
      createsTask: false,
      evidence: [`Due at ${item.dueAt}`, `Status ${status(item.status) || "OPEN"}`],
      explanation: "Customer follow-up is overdue, so it should surface in Needs Attention until renewed or completed.",
      href: item.href,
      ruleCode: "OVERDUE_CUSTOMER_FOLLOW_UP",
      severity: "high",
      sourceId: item.id,
      targetQueue: "NEEDS_ATTENTION",
      title: item.title,
    }));
  }

  for (const item of input.promises ?? []) {
    if (isOpen(item.status) && beforeNow(item.dueAt, input.now)) actions.push(action({
      actionLabel: "Protect promise",
      createsTask: false,
      evidence: [`Promised at ${item.dueAt}`, `Status ${status(item.status) || "OPEN"}`],
      explanation: "An overdue promise can create customer trust risk and should be reviewed by a manager or renewed with a clear customer-safe update.",
      href: item.href,
      ruleCode: "OVERDUE_PROMISE",
      severity: "critical",
      sourceId: item.id,
      targetQueue: "MANAGER_REVIEW",
      title: item.title,
    }));
  }

  for (const item of input.vehicles ?? []) {
    if (item.blocked || (isOpen(item.status) && hoursOld(item.stageEnteredAt, input.now) >= staleStageHours)) actions.push(action({
      actionLabel: "Open recon flow",
      createsTask: false,
      evidence: [`Stage age ${Math.floor(hoursOld(item.stageEnteredAt, input.now))} hour(s)`, `Blocked ${item.blocked ? "yes" : "no"}`],
      explanation: "Vehicle progress appears stuck long enough to require a recon blocker review before it silently ages.",
      href: item.href,
      ruleCode: "VEHICLE_STUCK_TOO_LONG",
      severity: item.blocked ? "critical" : "high",
      sourceId: item.id,
      targetQueue: "RECON_BLOCKER",
      title: item.title,
    }));
  }

  for (const item of input.repairDelays ?? []) {
    if ((item.waitingOnParts || beforeNow(item.targetAt, input.now)) && hoursOld(item.lastCustomerUpdateAt, input.now) >= 24) actions.push(action({
      actionLabel: "Record customer update",
      createsTask: true,
      evidence: [`Target ${item.targetAt ?? "not recorded"}`, `Last customer update ${item.lastCustomerUpdateAt ?? "not recorded"}`],
      explanation: "Repair progress may be delayed without a recent customer update, so the customer communication risk should become visible.",
      href: item.href,
      ruleCode: "REPAIR_DELAY_WITHOUT_CUSTOMER_UPDATE",
      severity: "high",
      sourceId: item.id,
      targetQueue: "COMMUNICATION_RISK",
      title: item.title,
    }));
  }

  for (const item of input.carryovers ?? []) {
    if (item.count >= 3) actions.push(action({
      actionLabel: "Review coaching moment",
      createsTask: false,
      evidence: [`Carried ${item.count} time(s)`],
      explanation: "Repeated carryover may mean the work is undersized, blocked, unclear, or needs manager support.",
      href: item.href,
      ruleCode: "REPEATED_CARRYOVER",
      severity: "medium",
      sourceId: item.id,
      targetQueue: "COACHING_SIGNAL",
      title: item.title,
    }));
  }

  for (const item of input.leads ?? []) {
    if (isOpen(item.status) && daysOld(item.lastActivityAt, input.now) >= staleLeadDays) actions.push(action({
      actionLabel: "Revive or close",
      createsTask: true,
      evidence: [`Last activity ${item.lastActivityAt ?? "not recorded"}`],
      explanation: "A stale live lead should either be revived with a next action or closed so the queue stays honest.",
      href: item.href,
      ruleCode: "STALE_LEAD",
      severity: "medium",
      sourceId: item.id,
      targetQueue: "REVIVE_OR_CLOSE",
      title: item.title,
    }));
  }

  for (const item of input.documents ?? []) {
    if (item.required && !item.received) actions.push(action({
      actionLabel: "Collect document",
      createsTask: true,
      evidence: ["Required document missing"],
      explanation: "Missing required documentation should become a compliance task instead of living in someone's memory.",
      href: item.href,
      ruleCode: "MISSING_DOCUMENT",
      severity: "high",
      sourceId: item.id,
      targetQueue: "COMPLIANCE_TASK",
      title: item.title,
    }));
  }

  for (const item of input.appointments ?? []) {
    if (missedAppointmentStatuses.has(status(item.status)) && beforeNow(item.startAt, input.now)) actions.push(action({
      actionLabel: "Create follow-up",
      createsTask: true,
      evidence: [`Appointment time ${item.startAt}`, `Status ${status(item.status) || "SCHEDULED"}`],
      explanation: "A missed or elapsed appointment needs a follow-up decision so customer contact does not disappear.",
      href: item.href,
      ruleCode: "APPOINTMENT_MISSED",
      severity: "medium",
      sourceId: item.id,
      targetQueue: "FOLLOW_UP_REQUIRED",
      title: item.title,
    }));
  }

  return dedupeAutomationActions(actions).sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || left.ruleCode.localeCompare(right.ruleCode));
}

function severityRank(value: AutomationSeverity) {
  return value === "critical" ? 4 : value === "high" ? 3 : value === "medium" ? 2 : 1;
}
