import type { SalesConsoleFreshness, SalesConsoleStaffRole } from "./sales-console-operational-domain";

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
};

export const salesTaskPromiseIntegration = {
  sourceOwner: "Tasks",
  readRoutes: ["/tasks", "/api/tasks"],
  governedWrites: ["complete task", "assign task", "change task due date"],
  allowedSalesConsoleActions: ["view source task", "log internal activity", "create internal promise"]
} as const;

export function mapSalesTaskPromise(source: SalesTaskPromiseSourceRecord, now = new Date()): SalesTaskPromiseViewModel {
  const dueAt = new Date(source.dueAt);
  const today = now.toISOString().slice(0, 10);
  const dueDay = dueAt.toISOString().slice(0, 10);
  const dueLabel = source.completed ? "complete" : dueAt < now ? "overdue" : dueDay === today ? "due-today" : "future";
  const freshness: SalesConsoleFreshness = source.completed ? "current" : dueLabel === "overdue" ? "stale" : "current";

  return {
    id: source.taskId,
    title: source.title,
    dueLabel,
    ownerLabel: `${source.ownerId} · ${source.ownerRole}`,
    blockerLabel: source.blockerOwner ?? "No blocker owner",
    promiseType: source.promiseType,
    evidenceStatus: source.evidenceStatus,
    sourceTaskLink: source.sourceRoute,
    visibleToRoles:
      source.ownerRole === "Salesperson"
        ? ["Salesperson", "Sales Manager", "Admin / Owner"]
        : [source.ownerRole, "Sales Manager", "Admin / Owner"],
    freshness,
    taskCompletionWriteEnabled: false
  };
}

export function salesTaskPromiseWritesRemainGoverned(viewModel: SalesTaskPromiseViewModel) {
  return viewModel.taskCompletionWriteEnabled === false;
}
