import type { SalesConsoleFreshness, SalesConsoleStaffRole } from "./sales-console-operational-domain";
import { withSalesConsoleReturnTo } from "./sales-console-cross-console-integration";

export type SalesTaskPromiseSourceRecord = {
  taskId: string;
  title: string;
  dueAt: string;
  ownerId: string;
  ownerRole: SalesConsoleStaffRole;
  blockerOwner?: string;
  promiseType: "callback" | "document" | "appointment" | "manager-review" | "source-system";
  evidenceStatus: "not-required" | "missing" | "received" | "verified";
  sourceRoute: string;
  opportunityId?: string;
  completed: boolean;
  updatedAt: string;
};

export type SalesTaskPromiseViewModel = {
  id: string;
  title: string;
  dueLabel: "overdue" | "due-today" | "future" | "complete";
  ownerLabel: string;
  blockerLabel: string;
  promiseType: SalesTaskPromiseSourceRecord["promiseType"];
  evidenceStatus: SalesTaskPromiseSourceRecord["evidenceStatus"];
  sourceTaskLink: string;
  visibleToRoles: SalesConsoleStaffRole[];
  freshness: SalesConsoleFreshness;
  taskCompletionWriteEnabled: false;
  workflowScore: number;
  slaRisk: "none" | "watch" | "breach";
  ownershipSignal: "owned" | "manager-visible" | "unassigned-review";
  duplicateSuppressionKey: string;
  nextBestTaskAction: string;
  escalationTriggers: string[];
};

export const salesTaskPromiseIntegration = {
  sourceOwner: "Tasks",
  readRoutes: ["/tasks", "/api/tasks"],
  governedWrites: ["complete task", "assign task", "change task due date"],
  allowedSalesConsoleActions: ["view source task", "log internal activity", "create internal promise"]
} as const;

function clampTaskScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateSalesTaskPromiseWorkflow(source: SalesTaskPromiseSourceRecord, now = new Date()) {
  const dueAt = new Date(source.dueAt);
  const minutesPastDue = Math.round((now.getTime() - dueAt.getTime()) / 60000);
  const overdue = !source.completed && minutesPastDue > 0;
  const slaRisk: SalesTaskPromiseViewModel["slaRisk"] = source.completed ? "none" : minutesPastDue > 120 ? "breach" : overdue ? "watch" : "none";
  const evidenceMissing = source.evidenceStatus === "missing";
  const ownershipSignal: SalesTaskPromiseViewModel["ownershipSignal"] =
    source.ownerId.trim().length === 0
      ? "unassigned-review"
      : source.ownerRole === "Sales Manager" || source.promiseType === "manager-review"
        ? "manager-visible"
        : "owned";
  const escalationTriggers = [
    ...(slaRisk === "breach" ? ["SLA breach"] : slaRisk === "watch" ? ["SLA watch"] : []),
    ...(evidenceMissing ? ["missing evidence"] : []),
    ...(source.blockerOwner ? [`blocked by ${source.blockerOwner}`] : []),
    ...(ownershipSignal === "unassigned-review" ? ["ownership missing"] : [])
  ];
  const workflowScore = clampTaskScore(
    35 +
      (source.promiseType === "manager-review" ? 22 : 0) +
      (source.promiseType === "document" ? 14 : 0) +
      (slaRisk === "breach" ? 28 : slaRisk === "watch" ? 15 : 0) +
      (evidenceMissing ? 12 : 0) +
      (source.blockerOwner ? 8 : 0) -
      (source.completed ? 55 : 0)
  );
  const nextBestTaskAction = source.completed
    ? "No action required; task is complete"
    : evidenceMissing
      ? "Collect or verify required evidence in source task"
      : slaRisk === "breach"
        ? "Escalate overdue follow-up and verify owner"
        : source.promiseType === "appointment"
          ? "Correlate task with appointment readiness"
          : "Open source task and complete the next promised step";

  return {
    workflowScore,
    slaRisk,
    ownershipSignal,
    duplicateSuppressionKey: [source.opportunityId ?? "no-opportunity", source.promiseType, source.title.toLowerCase().trim()].join(":"),
    nextBestTaskAction,
    escalationTriggers
  };
}

export function mapSalesTaskPromise(source: SalesTaskPromiseSourceRecord, now = new Date()): SalesTaskPromiseViewModel {
  const dueAt = new Date(source.dueAt);
  const today = now.toISOString().slice(0, 10);
  const dueDay = dueAt.toISOString().slice(0, 10);
  const dueLabel = source.completed ? "complete" : dueAt < now ? "overdue" : dueDay === today ? "due-today" : "future";
  const freshness: SalesConsoleFreshness = source.completed ? "current" : dueLabel === "overdue" ? "stale" : "current";

  const workflow = evaluateSalesTaskPromiseWorkflow(source, now);

  return {
    id: source.taskId,
    title: source.title,
    dueLabel,
    ownerLabel: `${source.ownerId} · ${source.ownerRole}`,
    blockerLabel: source.blockerOwner ?? "No blocker owner",
    promiseType: source.promiseType,
    evidenceStatus: source.evidenceStatus,
    sourceTaskLink: withSalesConsoleReturnTo(source.sourceRoute),
    visibleToRoles:
      source.ownerRole === "Salesperson"
        ? ["Salesperson", "Sales Manager", "Admin / Owner"]
        : [source.ownerRole, "Sales Manager", "Admin / Owner"],
    freshness,
    taskCompletionWriteEnabled: false,
    ...workflow
  };
}

export function salesTaskPromiseWritesRemainGoverned(viewModel: SalesTaskPromiseViewModel) {
  return viewModel.taskCompletionWriteEnabled === false;
}

export function rankSalesTaskPromises(tasks: SalesTaskPromiseSourceRecord[], now = new Date()) {
  const seen = new Set<string>();

  return tasks
    .map((task) => mapSalesTaskPromise(task, now))
    .filter((task) => {
      if (seen.has(task.duplicateSuppressionKey)) return false;
      seen.add(task.duplicateSuppressionKey);
      return true;
    })
    .sort((first, second) => second.workflowScore - first.workflowScore || first.id.localeCompare(second.id));
}
