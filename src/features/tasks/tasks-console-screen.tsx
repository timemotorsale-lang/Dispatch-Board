"use client";

import { TaskStatus, WorkflowArea } from "@prisma/client";
import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useDeferredValue, useEffect, useRef, useState, useTransition } from "react";

import { EmptyStateCard, ErrorStateCard } from "@/components/ui/state-card";
import { useWorkspaceMode, type WorkspaceMode } from "@/components/layout/workspace-mode";
import { RichTextComposer, RichTextContent } from "@/components/ui/rich-text-composer";
import { ConcernIntakePanel } from "@/features/tasks/concern-intake-panel";
import {
  buildSubtasks,
  formatTaskDisplayNumber,
  formatTaskEnumLabel
} from "@/features/tasks/detail/task-detail-mappers";
import { isTaskDueSoon, isTaskOverdue } from "@/features/tasks/my-tasks-helpers";
import type { BoardReadModel, BoardReadTask } from "@/server/services/board-read";
import type { TaskReadModel } from "@/server/services/task-read";
import type { TaskSavedViewModel } from "@/server/services/task-saved-views";
import type { ActiveUserSummary } from "@/server/services/user-summary";

export type TasksConsoleScreenProps = {
  assignableUsers: ActiveUserSummary[];
  board: BoardReadModel | null;
  boardDate: string;
  currentUserId: string;
  errorMessage: string | null;
  initialTask: TaskReadModel | null;
  initialSavedViews: TaskSavedViewModel[];
  initialQuickCreateOpen?: boolean;
  initialConcernIntakeOpen?: boolean;
  initialDepartmentFilter?: string;
  initialGroupBy?: string;
  initialPage?: number;
  initialQueueFilter?: string;
  initialView?: string;
  isManager: boolean;
  consoleBaseHref?: string;
  todayBoardDate: string;
};

type TasksConsoleView = "list" | "board";
type TasksConsoleTab = "details" | "comments" | "activity";
type TasksConsoleMenu = "saved" | "filters" | "more" | "group" | "columns" | "stageMore" | "savedView" | "workspace" | null;
type TasksConsoleGroupBy = "none" | "status" | "owner" | "department";
type TasksConsoleRailMode = "open" | "collapsed" | "closed";
type TasksConsoleColumnKey =
  | "priority"
  | "taskNumber"
  | "title"
  | "status"
  | "owner"
  | "department"
  | "dueTime"
  | "vehicleCustomer"
  | "age";
type QueueFilter =
  | "ALL"
  | "MY_TASKS"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "WAITING"
  | "WAITING_ON_PARTS"
  | "WAITING_ON_APPROVAL"
  | "READY_FOR_REVIEW"
  | "DUE_TODAY"
  | "MY_URGENT"
  | "OVERDUE"
  | "COMPLETED"
  | "UNASSIGNED";

type DepartmentFilter =
  | "INVENTORY"
  | "SERVICE_ADVISOR"
  | "SHOP"
  | "SALES"
  | "ADVERTISING"
  | "ADMIN"
  | "COLLECTIONS";
type SidebarTone = "brand" | "danger" | "neutral" | "review" | "slate" | "success" | "warning";
type StatusGuidanceTone = "brand" | "danger" | "neutral" | "review" | "success" | "warning";
type SidebarItem = {
  active: boolean;
  badge?: number;
  href?: string;
  key: string;
  label: string;
  onClick?: () => void;
  tone: SidebarTone;
};

type TaskDetailApiResponse =
  | {
      task?: TaskReadModel;
      error?: string;
    }
  | null;

type PaginationItem = number | "ellipsis";
type TasksConsoleSavedView = TaskSavedViewModel;
type AcquisitionView = "all" | "available" | "my-requests" | "needs-help" | "manager-requests";
type AcquisitionDecision = {
  eligible: boolean;
  explanation: string;
  policy: "DIRECT_CLAIM" | "APPROVAL_REQUIRED" | "MANAGER_ASSIGN_ONLY" | "UNAVAILABLE";
  score: number;
};
type AssignmentRequestModel = {
  id: string;
  status: string;
  requestReason: string | null;
  decisionReason: string | null;
  createdAt: string;
  requester: { id: string; name: string; email?: string };
  task: { id: string; title: string; priority: string; dueAt: string; workflowArea: string };
};
type AcquisitionOverview = {
  available: Array<{ decision: AcquisitionDecision; task: { id: string; title: string } }>;
  requests: AssignmentRequestModel[];
  counts: { available: number; pendingRequests: number };
};

const BOARD_VIEW_STATUSES: TaskStatus[] = [
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.WAITING_ON_PARTS,
  TaskStatus.WAITING_ON_APPROVAL,
  TaskStatus.READY_FOR_REVIEW,
  TaskStatus.COMPLETED
];
const DEFAULT_TASKS_PER_PAGE = 8;
type TasksPageSize = 8 | 25 | "all";
const TASKS_CONSOLE_STATUS_OPTIONS: TaskStatus[] = [
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.WAITING_ON_PARTS,
  TaskStatus.WAITING_ON_APPROVAL,
  TaskStatus.READY_FOR_REVIEW,
  TaskStatus.COMPLETED
];
const TASKS_CONSOLE_QUEUE_FILTERS: QueueFilter[] = [
  "ALL",
  "MY_TASKS",
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING",
  "WAITING_ON_PARTS",
  "WAITING_ON_APPROVAL",
  "READY_FOR_REVIEW",
  "DUE_TODAY",
  "MY_URGENT",
  "OVERDUE",
  "COMPLETED",
  "UNASSIGNED"
];
const TASKS_CONSOLE_CREATE_STATUS_OPTIONS: TaskStatus[] = [
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.WAITING_ON_PARTS,
  TaskStatus.WAITING_ON_APPROVAL,
  TaskStatus.READY_FOR_REVIEW
];
const TASKS_CONSOLE_WORKFLOW_AREAS: WorkflowArea[] = [
  WorkflowArea.GENERAL_MANAGER,
  WorkflowArea.SERVICE_ADVISOR,
  WorkflowArea.INVENTORY,
  WorkflowArea.SHOP,
  WorkflowArea.SALES,
  WorkflowArea.ADVERTISING,
  WorkflowArea.MARKETING,
  WorkflowArea.ADMIN,
  WorkflowArea.COLLECTIONS
];
const TASKS_CONSOLE_STORAGE_KEYS = {
  columns: "tasks-console-visible-columns"
} as const;
const TASKS_CONSOLE_COLUMNS: Array<{ key: TasksConsoleColumnKey; label: string }> = [
  { key: "title", label: "Task description" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
  { key: "department", label: "Department" },
  { key: "dueTime", label: "Due Time" },
  { key: "vehicleCustomer", label: "Vehicle / Customer" },
  { key: "age", label: "Age" },
  { key: "taskNumber", label: "Task #" }
];
const DEFAULT_VISIBLE_COLUMNS = TASKS_CONSOLE_COLUMNS.map((column) => column.key);

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTimeInputValue(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatAgeFromTimestamp(value: string, now: Date) {
  const elapsedMinutes = Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 60000));

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  return `${Math.round(elapsedHours / 24)}d`;
}

function getDepartmentLabel(workflowArea: string) {
  if (workflowArea === "SHOP") {
    return "Service / Recon";
  }

  if (workflowArea === "SERVICE_ADVISOR") {
    return "Service Advisor";
  }

  if (workflowArea === "GENERAL_MANAGER") {
    return "Management";
  }

  if (workflowArea === "ADVERTISING") {
    return "Marketing / Advertising";
  }

  return formatTaskEnumLabel(workflowArea);
}

function getTaskReference(task: Pick<BoardReadTask, "vehicleReference" | "customerReference">) {
  if (task.vehicleReference && task.customerReference) {
    return `${task.vehicleReference} / ${task.customerReference}`;
  }

  return task.vehicleReference ?? task.customerReference ?? "No linked vehicle or customer";
}

function getGroupByLabel(groupBy: TasksConsoleGroupBy) {
  if (groupBy === "status") {
    return "Status";
  }

  if (groupBy === "owner") {
    return "Owner";
  }

  if (groupBy === "department") {
    return "Department";
  }

  return "None";
}

function getQuickCreateDefaultDueTime() {
  const dueTime = new Date();

  dueTime.setMinutes(Math.ceil(dueTime.getMinutes() / 30) * 30, 0, 0);

  return formatTimeInputValue(dueTime);
}

function buildDueAtFromBoardTime(boardDate: string, dueTime: FormDataEntryValue | null) {
  if (typeof dueTime !== "string" || !dueTime.trim()) {
    return `${boardDate}T12:00:00`;
  }

  return `${boardDate}T${dueTime.trim()}:00`;
}

function compareGroupedTasks(left: BoardReadTask, right: BoardReadTask, groupBy: TasksConsoleGroupBy) {
  if (groupBy === "status") {
    return formatTaskEnumLabel(left.status).localeCompare(formatTaskEnumLabel(right.status));
  }

  if (groupBy === "owner") {
    return left.assignedUser.name.localeCompare(right.assignedUser.name);
  }

  if (groupBy === "department") {
    return getDepartmentLabel(left.workflowArea).localeCompare(getDepartmentLabel(right.workflowArea));
  }

  return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
}

function escapeCsvValue(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

async function getApiErrorMessage(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  return payload?.error ?? fallbackMessage;
}

export function createTasksConsoleAssigneeOptions(
  tasks: BoardReadTask[],
  activeTask: TaskReadModel | null,
  assignableUsers: ActiveUserSummary[]
) {
  const users = new Map<string, { id: string; name: string; email?: string }>();

  for (const user of assignableUsers) {
    users.set(user.id, {
      id: user.id,
      name: user.name,
      email: user.email
    });
  }

  for (const task of tasks) {
    if (task.assignedUser?.id) {
      users.set(task.assignedUser.id, task.assignedUser);
    }

    if (task.recommendedUser) {
      users.set(task.recommendedUser.id, task.recommendedUser);
    }
  }

  if (activeTask) {
    users.set(activeTask.assignedUser.id, activeTask.assignedUser);

    if (activeTask.recommendedUser) {
      users.set(activeTask.recommendedUser.id, activeTask.recommendedUser);
    }
  }

  return [...users.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function createUpdateFieldsPayload(formData: FormData, task: TaskReadModel | null) {
  if (!task?.requiredUpdateFields.length) {
    return undefined;
  }

  const updateFields: Record<string, string | boolean> = {};

  for (const field of task.requiredUpdateFields) {
    const value = formData.get(`updateField:${field.key}`);

    if (field.type === "boolean") {
      updateFields[field.key] = value === "on";
      continue;
    }

    if (typeof value === "string" && value.trim()) {
      updateFields[field.key] = value.trim();
    }
  }

  return Object.keys(updateFields).length ? updateFields : undefined;
}

function getStatusGuidance(status: string, task: TaskReadModel | null): { body: string; title: string; tone: StatusGuidanceTone } {
  if (status === TaskStatus.BLOCKED) {
    return {
      body: "Capture the blocker reason so the next person knows exactly what is stopping movement.",
      title: "Blocker reason required",
      tone: "danger"
    };
  }

  if (status === TaskStatus.WAITING_ON_PARTS) {
    return {
      body: "Use this when the next move depends on a part, vendor, or supply arrival.",
      title: "Waiting on parts",
      tone: "warning"
    };
  }

  if (status === TaskStatus.WAITING_ON_APPROVAL) {
    return {
      body: "Use this when the team has done its part and the next move depends on a manager or customer approval.",
      title: "Approval is the next handoff",
      tone: "warning"
    };
  }

  if (status === TaskStatus.READY_FOR_REVIEW) {
    return {
      body: task?.requiredUpdateFields.length
        ? "Complete the required update fields before handing this to review."
        : "Use this when the work is ready for a quick manager pass before completion.",
      title: "Review handoff",
      tone: "review"
    };
  }

  if (status === TaskStatus.COMPLETED) {
    return {
      body: "Confirm the task is truly closed out before marking it complete.",
      title: "Close the loop",
      tone: "success"
    };
  }

  if (status === TaskStatus.IN_PROGRESS) {
    return {
      body: "Use this when someone is actively moving the task forward now.",
      title: "Active work",
      tone: "brand"
    };
  }

  return {
    body: "Use this for tasks that are queued but not yet started.",
    title: "Queued work",
    tone: "neutral"
  };
}

function isTasksConsoleColumnKey(value: unknown): value is TasksConsoleColumnKey {
  return typeof value === "string" && TASKS_CONSOLE_COLUMNS.some((column) => column.key === value);
}

function parseStoredColumns(value: string | null) {
  if (!value) {
    return DEFAULT_VISIBLE_COLUMNS;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return DEFAULT_VISIBLE_COLUMNS;
    }

    const columns = parsed.filter(isTasksConsoleColumnKey);

    return columns.includes("title") ? columns : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

function getStatusToneClass(status: string) {
  if (status === TaskStatus.BLOCKED) {
    return "tasks-console-status tasks-console-status-danger";
  }

  if (status === TaskStatus.WAITING_ON_PARTS || status === TaskStatus.WAITING_ON_APPROVAL) {
    return "tasks-console-status tasks-console-status-warning";
  }

  if (status === TaskStatus.READY_FOR_REVIEW) {
    return "tasks-console-status tasks-console-status-review";
  }

  if (status === TaskStatus.COMPLETED) {
    return "tasks-console-status tasks-console-status-success";
  }

  if (status === TaskStatus.NOT_STARTED) {
    return "tasks-console-status tasks-console-status-neutral";
  }

  return "tasks-console-status tasks-console-status-brand";
}

function getPriorityLabel(task: Pick<BoardReadTask, "status" | "dueAt" | "priority" | "requiresManagerApproval">, now: Date) {
  if (task.status === TaskStatus.COMPLETED) {
    return "Low";
  }

  if (task.priority === "HIGH" || task.priority === "CRITICAL") {
    return "High";
  }

  if (
    task.status === TaskStatus.BLOCKED ||
    task.status === TaskStatus.WAITING_ON_APPROVAL ||
    task.status === TaskStatus.WAITING_ON_PARTS ||
    isTaskOverdue(task, now)
  ) {
    return "High";
  }

  if (task.requiresManagerApproval || isTaskDueSoon(task, now)) {
    return "Medium";
  }

  return "Low";
}

function getPriorityToneClass(priority: string) {
  if (priority === "High") {
    return "tasks-console-priority tasks-console-priority-high";
  }

  if (priority === "Medium") {
    return "tasks-console-priority tasks-console-priority-medium";
  }

  return "tasks-console-priority tasks-console-priority-low";
}

function getTaskRiskClass(task: BoardReadTask, now: Date) {
  if (task.status === TaskStatus.BLOCKED || isTaskOverdue(task, now)) {
    return "tasks-console-row-risk-danger";
  }

  if (task.status === TaskStatus.WAITING_ON_APPROVAL || task.status === TaskStatus.WAITING_ON_PARTS || task.priority === "HIGH" || task.priority === "CRITICAL") {
    return "tasks-console-row-risk-warning";
  }

  if (task.status === TaskStatus.READY_FOR_REVIEW || task.requiresManagerApproval) {
    return "tasks-console-row-risk-review";
  }

  return "tasks-console-row-risk-neutral";
}

function getTaskExecutionSignal(task: BoardReadTask, now: Date) {
  if (task.status === TaskStatus.BLOCKED) return task.blockerReason ? `Blocked: ${task.blockerReason}` : "Blocked: needs recovery owner";
  if (isTaskOverdue(task, now)) return "Overdue: needs same-day decision";
  if (task.status === TaskStatus.READY_FOR_REVIEW) return "Ready for manager review";
  if (task.status === TaskStatus.WAITING_ON_APPROVAL) return "Waiting on approval";
  if (task.status === TaskStatus.WAITING_ON_PARTS) return "Waiting on parts";
  if (isTaskDueSoon(task, now)) return "Due soon";
  return getTaskReference(task);
}

function getQueueFilterLabel(filter: QueueFilter) {
  if (filter === "MY_TASKS") {
    return "My Tasks";
  }

  if (filter === "MY_URGENT") {
    return "My Urgent";
  }

  if (filter === "NOT_STARTED") {
    return "Not Started";
  }

  if (filter === "IN_PROGRESS") {
    return "In Progress";
  }

  if (filter === "BLOCKED") {
    return "Blocked";
  }

  if (filter === "WAITING") {
    return "Waiting";
  }

  if (filter === "WAITING_ON_PARTS") {
    return "Waiting on Parts";
  }

  if (filter === "WAITING_ON_APPROVAL") {
    return "Waiting on Approval";
  }

  if (filter === "READY_FOR_REVIEW") {
    return "Ready for Review";
  }

  if (filter === "DUE_TODAY") {
    return "Due Today";
  }

  if (filter === "OVERDUE") {
    return "Overdue";
  }

  if (filter === "COMPLETED") {
    return "Completed Today";
  }

  if (filter === "UNASSIGNED") {
    return "Unassigned Queue";
  }

  return "All Tasks";
}

function getTaskOwnerId(task: Pick<BoardReadTask, "assignedUser">) {
  return task.assignedUser?.id ?? "";
}

function getTaskOwnerName(task: Pick<BoardReadTask, "assignedUser">) {
  return task.assignedUser?.name ?? "Unassigned";
}

function getTaskOwnerInitials(task: Pick<BoardReadTask, "assignedUser">) {
  return getTaskOwnerName(task)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isTaskOwnedByOrCollaborating(task: BoardReadTask, currentUserId: string) {
  return getTaskOwnerId(task) === currentUserId || task.collaborators?.some((collaborator) => collaborator.id === currentUserId) === true;
}

function isTaskCompletedOnBoardDate(task: BoardReadTask, boardDate: string) {
  if (!task.completedAt) {
    return task.status === TaskStatus.COMPLETED;
  }

  return task.completedAt.startsWith(boardDate);
}

function matchesQueueFilter(task: BoardReadTask, filter: QueueFilter, now: Date, boardDate: string, currentUserId: string) {
  if (filter === "ALL") {
    return true;
  }

  if (filter === "MY_TASKS") {
    return isTaskOwnedByOrCollaborating(task, currentUserId) && task.status !== TaskStatus.COMPLETED;
  }

  if (filter === "MY_URGENT") {
    return isTaskOwnedByOrCollaborating(task, currentUserId) && task.status !== TaskStatus.COMPLETED && (
      task.priority === "CRITICAL" || task.priority === "HIGH" || isTaskOverdue(task, now)
    );
  }

  if (filter === "WAITING") {
    return (
      task.status === TaskStatus.WAITING_ON_PARTS || task.status === TaskStatus.WAITING_ON_APPROVAL
    );
  }

  if (filter === "WAITING_ON_PARTS") {
    return task.status === TaskStatus.WAITING_ON_PARTS;
  }

  if (filter === "WAITING_ON_APPROVAL") {
    return task.status === TaskStatus.WAITING_ON_APPROVAL;
  }

  if (filter === "OVERDUE") {
    return isTaskOverdue(task, now);
  }

  if (filter === "DUE_TODAY") {
    return task.status !== TaskStatus.COMPLETED && task.dueAt.startsWith(boardDate);
  }

  if (filter === "COMPLETED") {
    return isTaskCompletedOnBoardDate(task, boardDate);
  }

  if (filter === "UNASSIGNED") {
    return !task.assignedUser?.id;
  }

  return task.status === filter;
}

function matchesDepartmentFilter(task: BoardReadTask, filter: DepartmentFilter | null) {
  if (!filter) {
    return true;
  }

  return task.workflowArea === filter;
}

function getQueueCount(tasks: BoardReadTask[], filter: QueueFilter, now: Date, boardDate: string, currentUserId: string) {
  return tasks.filter((task) => matchesQueueFilter(task, filter, now, boardDate, currentUserId)).length;
}

function getDepartmentCount(tasks: BoardReadTask[], filter: DepartmentFilter) {
  return tasks.filter((task) => matchesDepartmentFilter(task, filter)).length;
}

function getMetricCardTone(filter: QueueFilter) {
  if (filter === "BLOCKED" || filter === "OVERDUE") {
    return "tasks-console-metric-danger";
  }

  if (filter === "WAITING" || filter === "DUE_TODAY") {
    return "tasks-console-metric-warning";
  }

  if (filter === "READY_FOR_REVIEW") {
    return "tasks-console-metric-review";
  }

  if (filter === "IN_PROGRESS") {
    return "tasks-console-metric-brand";
  }

  return "tasks-console-metric-neutral";
}

function createSearchIndex(task: BoardReadTask) {
  return [
    task.title,
    task.description ?? "",
    getTaskOwnerName(task),
    ...(task.collaborators ?? []).flatMap((collaborator) => [
      collaborator.name,
      collaborator.collaborationScope,
      collaborator.capacityRequested ?? ""
    ]),
    getDepartmentLabel(task.workflowArea),
    task.vehicleReference ?? "",
    task.customerReference ?? ""
  ]
    .join(" ")
    .toLowerCase();
}

function getDueTimeToneClass(task: BoardReadTask, now: Date) {
  if (isTaskOverdue(task, now) || task.status === TaskStatus.BLOCKED) {
    return "tasks-console-due-time tasks-console-due-time-danger";
  }

  if (
    task.status === TaskStatus.WAITING_ON_PARTS ||
    task.status === TaskStatus.WAITING_ON_APPROVAL ||
    isTaskDueSoon(task, now)
  ) {
    return "tasks-console-due-time tasks-console-due-time-warning";
  }

  return "tasks-console-due-time";
}

function buildNextStepCopy(task: TaskReadModel | null) {
  if (!task) {
    return "Select a task to inspect the current next step.";
  }

  if (task.status === TaskStatus.READY_FOR_REVIEW) {
    return "Manager review is the next step before this task can close cleanly.";
  }

  if (task.status === TaskStatus.WAITING_ON_PARTS) {
    return task.blockerReason ?? "Waiting on parts. Capture the ETA in the full workspace if it changes.";
  }

  if (task.status === TaskStatus.WAITING_ON_APPROVAL) {
    return task.blockerReason ?? "Waiting on approval. Keep the decision owner and follow-up visible.";
  }

  if (task.blockerReason) {
    return task.blockerReason;
  }

  const latestComment = task.comments[0]?.body?.trim();

  if (latestComment) {
    return latestComment;
  }

  return task.description ?? "Open the workspace to capture the next step with more detail.";
}

function buildActivityTimeline(task: TaskReadModel | null) {
  if (!task) {
    return [];
  }

  return [
    ...task.activityHistory.map((event) => ({
      id: `activity-${event.id}`,
      actorName: event.actor?.name ?? "System",
      createdAt: event.createdAt,
      body: event.message,
      kind: "activity" as const
    })),
    ...task.comments.map((comment) => ({
      id: `comment-${comment.id}`,
      actorName: comment.author.name,
      createdAt: comment.createdAt,
      body: comment.body,
      kind: "comment" as const
    }))
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function createRightRailFieldRows(task: TaskReadModel | null) {
  if (!task) {
    return [];
  }

  return [
    {
      label: "Owner",
      value: task.assignedUser.name
    },
    {
      label: "Department",
      value: getDepartmentLabel(task.workflowArea)
    },
    {
      label: "Due Time",
      value: formatDateTime(task.dueAt)
    },
    {
      label: "Created By",
      value: task.createdByUser?.name ?? "System"
    },
    {
      label: "Created On",
      value: formatDateTime(task.createdAt)
    },
    {
      label: "Last Updated",
      value: formatDateTime(task.updatedAt)
    }
  ];
}

function getSelectionFallbackTask(tasks: BoardReadTask[], selectedTaskId: string | null) {
  if (!selectedTaskId) {
    return tasks[0] ?? null;
  }

  return tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null;
}

function createTaskDetailHref(taskId: string, returnTo = "/tasks") {
  return `/tasks/${encodeURIComponent(taskId)}?returnTo=${encodeURIComponent(returnTo)}`;
}

function buildPaginationItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  if (windowStart > 2) {
    items.push("ellipsis");
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    items.push(page);
  }

  if (windowEnd < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
}

export function TasksConsoleScreen({
  assignableUsers,
  board,
  boardDate,
  currentUserId,
  errorMessage,
  initialTask,
  initialSavedViews,
  initialQuickCreateOpen = false,
  initialConcernIntakeOpen = false,
  initialDepartmentFilter,
  initialGroupBy,
  initialPage = 1,
  initialQueueFilter,
  initialView,
  isManager,
  consoleBaseHref = "/tasks",
  todayBoardDate
}: TasksConsoleScreenProps) {
  const router = useRouter();
  const { mode: workspaceMode, setMode: setWorkspaceMode } = useWorkspaceMode();
  const consoleRef = useRef<HTMLElement | null>(null);
  const now = new Date();
  const [activeView, setActiveView] = useState<TasksConsoleView>(initialView === "board" ? "board" : "list");
  const [activeTab, setActiveTab] = useState<TasksConsoleTab>("details");
  const [activeQueueFilter, setActiveQueueFilter] = useState<QueueFilter>(
    initialQueueFilter && TASKS_CONSOLE_QUEUE_FILTERS.includes(initialQueueFilter as QueueFilter)
      ? initialQueueFilter as QueueFilter
      : "ALL"
  );
  const [activeDepartmentFilter, setActiveDepartmentFilter] = useState<DepartmentFilter | null>(
    initialDepartmentFilter && ["INVENTORY", "SERVICE_ADVISOR", "SHOP", "SALES", "ADVERTISING", "ADMIN", "COLLECTIONS"].includes(initialDepartmentFilter)
      ? initialDepartmentFilter as DepartmentFilter
      : null
  );
  const [activeMenu, setActiveMenu] = useState<TasksConsoleMenu>(null);
  const [groupBy, setGroupBy] = useState<TasksConsoleGroupBy>(
    initialGroupBy && ["none", "status", "owner", "department"].includes(initialGroupBy)
      ? initialGroupBy as TasksConsoleGroupBy
      : "none"
  );
  const [rightRailMode, setRightRailMode] = useState<TasksConsoleRailMode>("open");
  const [statusLinksOpen, setStatusLinksOpen] = useState(false);
  const [departmentLinksOpen, setDepartmentLinksOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<TasksConsoleSavedView[]>(initialSavedViews);
  const [visibleColumns, setVisibleColumns] = useState<TasksConsoleColumnKey[]>(() =>
    typeof window === "undefined"
      ? DEFAULT_VISIBLE_COLUMNS
      : parseStoredColumns(window.localStorage.getItem(TASKS_CONSOLE_STORAGE_KEYS.columns))
  );
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialPage));
  const [pageSize, setPageSize] = useState<TasksPageSize>(DEFAULT_TASKS_PER_PAGE);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialTask?.id ?? board?.tasks[0]?.id ?? null
  );
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskReadModel | null>(initialTask);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(initialQuickCreateOpen);
  const [concernIntakeOpen, setConcernIntakeOpen] = useState(initialConcernIntakeOpen);
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null);
  const [quickCreateMessage, setQuickCreateMessage] = useState<string | null>(null);
  const [acquisitionOverview, setAcquisitionOverview] = useState<AcquisitionOverview | null>(null);
  const [managerRequests, setManagerRequests] = useState<AssignmentRequestModel[]>([]);
  const [acquisitionView, setAcquisitionView] = useState<AcquisitionView>(
    initialView && ["available", "my-requests", "needs-help", "manager-requests"].includes(initialView)
      ? initialView as AcquisitionView : "all"
  );
  const [acquisitionMessage, setAcquisitionMessage] = useState<string | null>(null);
  const [acquisitionError, setAcquisitionError] = useState<string | null>(null);
  const [isGeneratePending, startGenerateTransition] = useTransition();
  const [isWorkflowPending, startWorkflowTransition] = useTransition();
  const [isQuickCreatePending, startQuickCreateTransition] = useTransition();
  const [isSavedViewPending, startSavedViewTransition] = useTransition();
  const [isAcquisitionPending, startAcquisitionTransition] = useTransition();
  const deferredSearchText = useDeferredValue(searchText.trim().toLowerCase());
  const allTasks = [...(board?.tasks ?? [])].sort(
    (left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
  );
  const availableTaskIds = new Set(acquisitionOverview?.available.map((item) => item.task.id) ?? []);
  const requestedTaskIds = new Set(acquisitionOverview?.requests.map((item) => item.task.id) ?? []);
  const visibleTasks = allTasks
    .filter((task) => {
      if (acquisitionView === "available" && !availableTaskIds.has(task.id)) return false;
      if (acquisitionView === "my-requests" && !requestedTaskIds.has(task.id)) return false;
      if (
        acquisitionView === "needs-help" &&
        !(getTaskOwnerId(task) === currentUserId && (
          task.status === TaskStatus.BLOCKED ||
          task.status === TaskStatus.WAITING_ON_PARTS ||
          task.status === TaskStatus.WAITING_ON_APPROVAL
        ))
      ) return false;
      if (!matchesQueueFilter(task, activeQueueFilter, now, boardDate, currentUserId)) {
        return false;
      }

      if (!matchesDepartmentFilter(task, activeDepartmentFilter)) {
        return false;
      }

      if (!deferredSearchText) {
        return true;
      }

      return createSearchIndex(task).includes(deferredSearchText);
    })
    .sort((left, right) => compareGroupedTasks(left, right, groupBy));
  const pageSizeCount = pageSize === "all" ? Math.max(visibleTasks.length, 1) : pageSize;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(visibleTasks.length / pageSizeCount));
  const activePage = pageSize === "all" ? 1 : Math.min(currentPage, totalPages);
  const pageStartIndex = pageSize === "all" ? 0 : (activePage - 1) * pageSizeCount;
  const pagedTasks = pageSize === "all"
    ? visibleTasks
    : visibleTasks.slice(pageStartIndex, pageStartIndex + pageSizeCount);
  const pageCountStart = visibleTasks.length === 0 ? 0 : pageStartIndex + 1;
  const pageCountEnd = pageSize === "all"
    ? visibleTasks.length
    : Math.min(pageStartIndex + pageSizeCount, visibleTasks.length);
  const paginationItems = buildPaginationItems(totalPages, activePage);
  const visibleColumnSet = new Set(visibleColumns);
  const visibleDataColumnCount = TASKS_CONSOLE_COLUMNS.filter((column) => visibleColumnSet.has(column.key)).length;
  const effectiveSelectedTaskId = pagedTasks.some((task) => task.id === selectedTaskId)
    ? selectedTaskId
    : pagedTasks[0]?.id ?? null;
  const selectedBoardTask = getSelectionFallbackTask(pagedTasks, effectiveSelectedTaskId);
  const selectedAcquisitionDecision = selectedBoardTask
    ? acquisitionOverview?.available.find((item) => item.task.id === selectedBoardTask.id)?.decision ?? null
    : null;
  const canStartSelectedTask = Boolean(
    selectedBoardTask && getTaskOwnerId(selectedBoardTask) === currentUserId && selectedBoardTask.status === TaskStatus.NOT_STARTED
  );
  const activeTaskDetail = selectedTaskDetail?.id === effectiveSelectedTaskId ? selectedTaskDetail : null;
  const activeStatusDraft = selectedBoardTask
    ? statusDrafts[selectedBoardTask.id] ?? activeTaskDetail?.status ?? selectedBoardTask.status
    : TaskStatus.NOT_STARTED;
  const activeStatusGuidance = getStatusGuidance(activeStatusDraft, activeTaskDetail);
  const activeTaskPriority = activeTaskDetail ? getPriorityLabel(activeTaskDetail, now) : null;
  const detailTimeline = buildActivityTimeline(activeTaskDetail);
  const rightRailFields = createRightRailFieldRows(activeTaskDetail);
  const subtasks = activeTaskDetail ? buildSubtasks(activeTaskDetail) : [];
  const completedSubtaskCount = subtasks.filter((item) => item.completed).length;
  const assigneeOptions = createTasksConsoleAssigneeOptions(allTasks, activeTaskDetail, assignableUsers);
  const boardHref = `/board?date=${encodeURIComponent(boardDate)}`;
  const isTodayBoard = boardDate === todayBoardDate;
  const dueSoonTasks = allTasks.filter((task) => isTaskDueSoon(task, now));
  const overdueTasks = allTasks.filter((task) => isTaskOverdue(task, now));
  const dueTodayTasks = allTasks.filter((task) => task.dueAt.startsWith(boardDate) && task.status !== TaskStatus.COMPLETED);
  const blockedTasks = allTasks.filter((task) => task.status === TaskStatus.BLOCKED);
  const waitingOnPartsTasks = allTasks.filter((task) => task.status === TaskStatus.WAITING_ON_PARTS);
  const waitingOnApprovalTasks = allTasks.filter((task) => task.status === TaskStatus.WAITING_ON_APPROVAL);
  const readyForReviewTasks = allTasks.filter((task) => task.status === TaskStatus.READY_FOR_REVIEW);
  const unassignedTasks = allTasks.filter((task) => !task.assignedUser?.id);
  const completedTodayTasks = allTasks.filter((task) => isTaskCompletedOnBoardDate(task, boardDate));
  const myTasksCount = allTasks.filter(
    (task) => isTaskOwnedByOrCollaborating(task, currentUserId) && task.status !== TaskStatus.COMPLETED
  ).length;
  const myUrgentCount = getQueueCount(allTasks, "MY_URGENT", now, boardDate, currentUserId);
  const activeFilterChips = [
    activeQueueFilter !== "ALL" ? `Queue: ${getQueueFilterLabel(activeQueueFilter)}` : null,
    activeDepartmentFilter ? `Department: ${getDepartmentLabel(activeDepartmentFilter)}` : null,
    groupBy !== "none" ? `Grouped by ${getGroupByLabel(groupBy)}` : null,
    searchText.trim() ? `Search: ${searchText.trim()}` : null,
    activeView === "board" ? "Board lanes" : null
  ].filter((chip): chip is string => Boolean(chip));
  const selectedVisibleTaskIds = pagedTasks.map((task) => task.id);
  const selectedTasks = allTasks.filter((task) => selectedTaskIds.includes(task.id));
  const allVisibleSelected = pagedTasks.length > 0 && selectedVisibleTaskIds.every((taskId) => selectedTaskIds.includes(taskId));
  const commandMetrics = [
    { filter: "OVERDUE" as const, label: "Urgent overdue", value: overdueTasks.length, detail: "Past due or SLA risk" },
    { filter: "BLOCKED" as const, label: "Blocked", value: blockedTasks.length, detail: "Needs intervention" },
    { filter: "READY_FOR_REVIEW" as const, label: "Needs review", value: readyForReviewTasks.length, detail: "Manager pass pending" },
    { filter: "DUE_TODAY" as const, label: "Due today", value: dueTodayTasks.length, detail: formatBoardDateLabel(boardDate) },
    { filter: "UNASSIGNED" as const, label: "Unassigned", value: unassignedTasks.length, detail: "Needs owner" }
  ];
  const executionViews = [
    { filter: "MY_URGENT" as const, label: "My urgent", count: myUrgentCount },
    { filter: "BLOCKED" as const, label: "Blocked", count: blockedTasks.length },
    { filter: "DUE_TODAY" as const, label: "Due today", count: dueTodayTasks.length },
    { filter: "READY_FOR_REVIEW" as const, label: "Needs review", count: readyForReviewTasks.length },
    { filter: "UNASSIGNED" as const, label: "Unassigned", count: unassignedTasks.length }
  ];
  const generatedLabel = board?.generatedAt ? formatDateTime(board.generatedAt) : "Not generated";
  const activeFilterCount = activeFilterChips.length;
  const defaultQuickCreateAssigneeId = selectedBoardTask
    ? (getTaskOwnerId(selectedBoardTask) || assigneeOptions[0]?.id || "")
    : (assigneeOptions[0]?.id ?? "");
  const inventoryCount = getDepartmentCount(allTasks, "INVENTORY");
  const serviceAdvisorCount = getDepartmentCount(allTasks, "SERVICE_ADVISOR");
  const serviceReconCount = getDepartmentCount(allTasks, "SHOP");
  const salesCount = getDepartmentCount(allTasks, "SALES");
  const marketingCount = getDepartmentCount(allTasks, "ADVERTISING");
  const adminCount = getDepartmentCount(allTasks, "ADMIN");
  const collectionsCount = getDepartmentCount(allTasks, "COLLECTIONS");
  const consoleReturnHref = `${consoleBaseHref}?date=${encodeURIComponent(boardDate)}&queue=${encodeURIComponent(activeQueueFilter)}&department=${encodeURIComponent(activeDepartmentFilter ?? "")}&view=${activeView}&group=${groupBy}&page=${activePage}&task=${encodeURIComponent(effectiveSelectedTaskId ?? "")}`;
  const effectiveRightRailMode: TasksConsoleRailMode = workspaceMode === "focus" ? "collapsed" : rightRailMode;
  const taskMetrics = [
    { label: "Total Tasks", value: allTasks.length, filter: "ALL" as const },
    {
      label: "Not Started",
      value: getQueueCount(allTasks, "NOT_STARTED", now, boardDate, currentUserId),
      filter: "NOT_STARTED" as const
    },
    {
      label: "In Progress",
      value: getQueueCount(allTasks, "IN_PROGRESS", now, boardDate, currentUserId),
      filter: "IN_PROGRESS" as const
    },
    { label: "Blocked", value: getQueueCount(allTasks, "BLOCKED", now, boardDate, currentUserId), filter: "BLOCKED" as const },
    { label: "Waiting", value: getQueueCount(allTasks, "WAITING", now, boardDate, currentUserId), filter: "WAITING" as const },
    {
      label: "Ready for Review",
      value: getQueueCount(allTasks, "READY_FOR_REVIEW", now, boardDate, currentUserId),
      filter: "READY_FOR_REVIEW" as const
    },
    { label: "Overdue", value: getQueueCount(allTasks, "OVERDUE", now, boardDate, currentUserId), filter: "OVERDUE" as const }
  ];

  useEffect(() => {
    window.localStorage.setItem(TASKS_CONSOLE_STORAGE_KEYS.columns, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAcquisition() {
      try {
        const [overviewResponse, managerResponse] = await Promise.all([
          fetch(`/api/tasks/acquisition?date=${encodeURIComponent(boardDate)}`, { signal: controller.signal }),
          isManager
            ? fetch("/api/tasks/assignment-requests", { signal: controller.signal })
            : Promise.resolve(null)
        ]);
        const overviewPayload = await overviewResponse.json().catch(() => null) as AcquisitionOverview & { error?: string } | null;
        if (!overviewResponse.ok || !overviewPayload) throw new Error(overviewPayload?.error ?? "Unable to load available work.");
        setAcquisitionOverview(overviewPayload);
        if (managerResponse) {
          const managerPayload = await managerResponse.json().catch(() => null) as { requests?: AssignmentRequestModel[] } | null;
          if (managerResponse.ok) setManagerRequests(managerPayload?.requests ?? []);
        }
      } catch (error) {
        if (!controller.signal.aborted) setAcquisitionError(error instanceof Error ? error.message : "Unable to load available work.");
      }
    }

    void loadAcquisition();
    return () => controller.abort();
  }, [boardDate, isManager]);

  useEffect(() => {
    if (!activeMenu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && consoleRef.current?.contains(event.target)) {
        const targetElement = event.target instanceof Element ? event.target : null;

        if (targetElement?.closest(".tasks-console-menu-host")) {
          return;
        }
      }

      setActiveMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (!effectiveSelectedTaskId || activeTaskDetail?.id === effectiveSelectedTaskId) {
      return;
    }

    const controller = new AbortController();

    async function loadTaskDetail(taskId: string) {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
          signal: controller.signal
        });
        const payload = (await response.json().catch(() => null)) as TaskDetailApiResponse;

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok || !payload?.task) {
          setDetailError(payload?.error ?? "Unable to load task details right now.");
          return;
        }

        setSelectedTaskDetail(payload.task);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetailError(error instanceof Error ? error.message : "Unable to load task details right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      }
    }

    void loadTaskDetail(effectiveSelectedTaskId);

    return () => controller.abort();
  }, [activeTaskDetail?.id, effectiveSelectedTaskId]);

  function handleGenerateBoard() {
    setGenerationMessage(null);

    startGenerateTransition(async () => {
      try {
        const response = await fetch("/api/board/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            boardDate
          })
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              status?: "success" | "failed";
              summary?: string | null;
              error?: string;
              errorMessage?: string | null;
            }
          | null;

        if (!response.ok || payload?.status === "failed") {
          setGenerationMessage(payload?.errorMessage ?? payload?.error ?? "Unable to generate the board right now.");
          return;
        }

        setGenerationMessage(payload?.summary ?? "Board generation completed.");
        router.refresh();
      } catch (error) {
        setGenerationMessage(error instanceof Error ? error.message : "Unable to generate the board right now.");
      }
    });
  }

  function handleQueueFilterChange(filter: QueueFilter) {
    setActiveQueueFilter(filter);
    setActiveDepartmentFilter(null);
    setCurrentPage(1);
    setActiveMenu(null);
  }

  function handleDepartmentFilterChange(filter: DepartmentFilter) {
    setActiveDepartmentFilter(filter);
    setActiveQueueFilter("ALL");
    setCurrentPage(1);
    setActiveMenu(null);
  }

  function handleSearchValueChange(value: string) {
    setSearchText(value);
    setCurrentPage(1);
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    setCommentDraft("");
    setActiveTab("details");
    setRightRailMode("open");
  }

  function handleToggleTaskSelection(taskId: string) {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    );
  }

  function handleToggleVisibleTaskSelection() {
    setSelectedTaskIds((current) => {
      if (allVisibleSelected) {
        return current.filter((taskId) => !selectedVisibleTaskIds.includes(taskId));
      }

      return [...new Set([...current, ...selectedVisibleTaskIds])];
    });
  }

  function handleOpenSelectedTaskForExecution(tab: TasksConsoleTab = "details") {
    const firstSelectedTask = selectedTasks[0];
    if (!firstSelectedTask) return;
    setSelectedTaskId(firstSelectedTask.id);
    setActiveTab(tab);
    setRightRailMode("open");
    setWorkflowError(null);
    setWorkflowMessage(selectedTasks.length === 1
      ? "Selected task is ready in the detail rail."
      : `Opened the first of ${selectedTasks.length} selected tasks. Export keeps the full selected set intact.`);
  }

  function getTaskAcquisitionDecision(taskId: string) {
    return acquisitionOverview?.available.find((item) => item.task.id === taskId)?.decision ?? null;
  }

  function handleTaskAcquisition(taskId: string, action: "CLAIM" | "REQUEST" | "START") {
    setAcquisitionError(null);
    setAcquisitionMessage(null);
    startAcquisitionTransition(async () => {
      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/acquisition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        });
        const payload = await response.json().catch(() => null) as {
          claim?: { task: { title: string } };
          request?: AssignmentRequestModel;
          start?: { workbenchHref: string };
          error?: string;
        } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to update this task.");
        if (action === "START" && payload?.start?.workbenchHref) {
          router.push(createTaskDetailHref(taskId, consoleReturnHref));
          return;
        }
        if (payload?.request) {
          setAcquisitionOverview((current) => current ? {
            ...current,
            requests: [payload.request!, ...current.requests],
            counts: { ...current.counts, pendingRequests: current.counts.pendingRequests + 1 }
          } : current);
          setAcquisitionMessage("Assignment request sent to Manager Review.");
        } else {
          setAcquisitionOverview((current) => current ? {
            ...current,
            available: current.available.filter((item) => item.task.id !== taskId),
            counts: { ...current.counts, available: Math.max(0, current.counts.available - 1) }
          } : current);
          setAcquisitionMessage("Task assigned to you. You can start work now.");
        }
        router.refresh();
      } catch (error) {
        setAcquisitionError(error instanceof Error ? error.message : "Unable to update this task.");
      }
    });
  }

  function handleCancelAssignmentRequest(requestId: string) {
    setAcquisitionError(null);
    startAcquisitionTransition(async () => {
      try {
        const response = await fetch(`/api/tasks/assignment-requests/${encodeURIComponent(requestId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CANCEL" })
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to cancel this request.");
        setAcquisitionOverview((current) => current ? {
          ...current,
          requests: current.requests.map((request) => request.id === requestId ? { ...request, status: "CANCELLED" } : request),
          counts: { ...current.counts, pendingRequests: Math.max(0, current.counts.pendingRequests - 1) }
        } : current);
        setAcquisitionMessage("Assignment request cancelled.");
      } catch (error) {
        setAcquisitionError(error instanceof Error ? error.message : "Unable to cancel this request.");
      }
    });
  }

  function handleManagerRequestDecision(requestId: string, decision: "APPROVED" | "DECLINED" | "ASSIGNED_OTHER", targetUserId?: string) {
    const reason = decision === "DECLINED" ? window.prompt("Why is this request being declined?") : null;
    if (decision === "DECLINED" && !reason?.trim()) return;
    setAcquisitionError(null);
    startAcquisitionTransition(async () => {
      try {
        const response = await fetch(`/api/tasks/assignment-requests/${encodeURIComponent(requestId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "DECIDE", decision, reason, targetUserId })
        });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Unable to decide this request.");
        setManagerRequests((current) => current.filter((request) => request.id !== requestId));
        setAcquisitionMessage(decision === "APPROVED" ? "Assignment request approved." : decision === "ASSIGNED_OTHER" ? "Task assigned to another owner." : "Assignment request declined.");
        router.refresh();
      } catch (error) {
        setAcquisitionError(error instanceof Error ? error.message : "Unable to decide this request.");
      }
    });
  }

  function handleAssignAnotherOwner(event: FormEvent<HTMLFormElement>, requestId: string) {
    event.preventDefault();
    const targetUserId = new FormData(event.currentTarget).get("targetUserId");
    if (typeof targetUserId !== "string" || !targetUserId) return;
    handleManagerRequestDecision(requestId, "ASSIGNED_OTHER", targetUserId);
  }

  function handleMenuToggle(menu: Exclude<TasksConsoleMenu, null>) {
    setActiveMenu((currentMenu) => (currentMenu === menu ? null : menu));
  }

  function handleGroupByChange(nextGroupBy: TasksConsoleGroupBy) {
    setGroupBy(nextGroupBy);
    setCurrentPage(1);
    setActiveMenu(null);
  }

  function handleResetBoardView() {
    setActiveQueueFilter("ALL");
    setActiveDepartmentFilter(null);
    setSearchText("");
    setGroupBy("none");
    setActiveView("list");
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    setCurrentPage(1);
    setActiveMenu(null);
  }

  function handleCloseQuickCreate() {
    if (isQuickCreatePending) {
      return;
    }

    setQuickCreateOpen(false);
    setQuickCreateError(null);
  }

  function handleQuickCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isManager) {
      setQuickCreateError("Manager access is required to create tasks from the console.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = formData.get("title");
    const assignedUserId = formData.get("assignedUserId");
    const status = formData.get("status");
    const workflowArea = formData.get("workflowArea");

    startQuickCreateTransition(async () => {
      setQuickCreateError(null);
      setQuickCreateMessage(null);

      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            assignedUserId,
            blockerReason: formData.get("blockerReason"),
            boardDate,
            customerReference: formData.get("customerReference"),
            description: formData.get("description"),
            dueAt: buildDueAtFromBoardTime(boardDate, formData.get("dueTime")),
            requiresManagerApproval: formData.get("requiresManagerApproval") === "on",
            status,
            title,
            vehicleReference: formData.get("vehicleReference"),
            workflowArea
          })
        });
        const payload = (await response.json().catch(() => null)) as
          | { task?: { id: string; title?: string }; error?: string }
          | null;

        if (!response.ok || !payload?.task) {
          throw new Error(payload?.error ?? "Unable to create this task.");
        }

        form.reset();
        setSelectedTaskId(payload.task.id);
        setCommentDraft("");
        setActiveQueueFilter("ALL");
        setActiveDepartmentFilter(null);
        setActiveView("list");
        setQuickCreateOpen(false);
        setQuickCreateMessage(`${payload.task.title ?? "Task"} created and added to the board.`);
        setGenerationMessage(`${payload.task.title ?? "Task"} created and added to the board.`);
        router.refresh();
      } catch (error) {
        setQuickCreateError(error instanceof Error ? error.message : "Unable to create this task.");
      }
    });
  }

  function handleCreateSavedView() {
    if (!isManager) {
      setGenerationMessage("Only managers can create shared saved views.");
      setActiveMenu(null);
      return;
    }

    startSavedViewTransition(async () => {
      const nextViewNumber = savedViews.length + 1;

      try {
        const response = await fetch("/api/tasks/saved-views", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            config: {
              activeDepartmentFilter,
              activeQueueFilter,
              activeView,
              groupBy,
              searchText,
              visibleColumns
            },
            name: `Saved View ${nextViewNumber}`
          })
        });
        const payload = (await response.json().catch(() => null)) as
          | { savedView?: TasksConsoleSavedView; error?: string }
          | null;

        if (!response.ok || !payload?.savedView) {
          throw new Error(payload?.error ?? "Unable to save this view.");
        }

        setSavedViews((currentViews) => [
          payload.savedView!,
          ...currentViews.filter((savedView) => savedView.id !== payload.savedView!.id)
        ]);
        setGenerationMessage(`${payload.savedView.name} saved as a shared team view.`);
        setActiveMenu(null);
        router.refresh();
      } catch (error) {
        setGenerationMessage(error instanceof Error ? error.message : "Unable to save this view.");
      }
    });
  }

  function handleApplySavedView(savedView: TasksConsoleSavedView) {
    setActiveQueueFilter(savedView.activeQueueFilter);
    setActiveDepartmentFilter(savedView.activeDepartmentFilter);
    setActiveView(savedView.activeView);
    setGroupBy(savedView.groupBy);
    setSearchText(savedView.searchText);
    setVisibleColumns(savedView.visibleColumns.length ? savedView.visibleColumns : DEFAULT_VISIBLE_COLUMNS);
    setCurrentPage(1);
    setActiveMenu(null);
  }

  function handleDeleteSavedView(savedViewId: string) {
    if (!isManager) {
      setGenerationMessage("Only managers can delete shared saved views.");
      return;
    }

    startSavedViewTransition(async () => {
      const previousSavedViews = savedViews;

      setSavedViews((currentViews) => currentViews.filter((savedView) => savedView.id !== savedViewId));

      try {
        const response = await fetch(`/api/tasks/saved-views/${encodeURIComponent(savedViewId)}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, "Unable to delete this saved view."));
        }

        setGenerationMessage("Shared saved view deleted.");
        router.refresh();
      } catch (error) {
        setSavedViews(previousSavedViews);
        setGenerationMessage(
          error instanceof Error ? error.message : "Unable to delete this saved view."
        );
      }
    });
  }

  function handleColumnToggle(columnKey: TasksConsoleColumnKey) {
    setVisibleColumns((currentColumns) => {
      if (columnKey === "title") {
        return currentColumns;
      }

      if (currentColumns.includes(columnKey)) {
        return currentColumns.filter((currentColumn) => currentColumn !== columnKey);
      }

      return TASKS_CONSOLE_COLUMNS
        .map((column) => column.key)
        .filter((currentColumn) => currentColumn === columnKey || currentColumns.includes(currentColumn));
    });
  }

  async function refreshSelectedTaskDetail(taskId: string, successMessage: string) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);

    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, "The action saved, but task details could not refresh."));
    }

    const payload = (await response.json().catch(() => null)) as { task?: TaskReadModel } | null;

    if (!payload?.task) {
      throw new Error("The action saved, but task details could not refresh.");
    }

    const refreshedTask = payload.task;

    setSelectedTaskDetail(refreshedTask);
    setStatusDrafts((currentDrafts) => ({
      ...currentDrafts,
      [taskId]: refreshedTask.status
    }));
    setWorkflowMessage(successMessage);
    setWorkflowError(null);
    router.refresh();
  }

  function handleStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBoardTask) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const status = formData.get("status");

    startWorkflowTransition(async () => {
      setWorkflowMessage(null);
      setWorkflowError(null);

      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(selectedBoardTask.id)}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status,
            blockerReason: formData.get("blockerReason"),
            updateFields: createUpdateFieldsPayload(formData, activeTaskDetail)
          })
        });

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, "Unable to update task status."));
        }

        await refreshSelectedTaskDetail(
          selectedBoardTask.id,
          `Task moved to ${formatTaskEnumLabel(String(status))}.`
        );
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : "Unable to update task status.");
      }
    });
  }

  function handleReassignTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBoardTask) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    startWorkflowTransition(async () => {
      setWorkflowMessage(null);
      setWorkflowError(null);

      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(selectedBoardTask.id)}/assignment`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            assignedUserId: formData.get("assignedUserId")
          })
        });

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, "Unable to reassign the task."));
        }

        await refreshSelectedTaskDetail(selectedBoardTask.id, "Task reassigned and the board is refreshed.");
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : "Unable to reassign the task.");
      }
    });
  }

  function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBoardTask) {
      return;
    }

    if (!commentDraft.trim()) {
      setWorkflowError("Enter a comment before posting.");
      return;
    }

    startWorkflowTransition(async () => {
      setWorkflowMessage(null);
      setWorkflowError(null);

      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(selectedBoardTask.id)}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            body: commentDraft
          })
        });

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, "Unable to post the comment."));
        }

        setCommentDraft("");
        await refreshSelectedTaskDetail(selectedBoardTask.id, "Comment posted to the task history.");
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : "Unable to post the comment.");
      }
    });
  }

  function handleChecklistToggle(item: { completed: boolean; id: string; label: string }) {
    if (!selectedBoardTask || !activeTaskDetail) {
      return;
    }

    const persistedItem = activeTaskDetail.checklistItems.find((checklistItem) => checklistItem.id === item.id);
    const nextCompleted = !item.completed;

    startWorkflowTransition(async () => {
      setWorkflowMessage(null);
      setWorkflowError(null);

      try {
        let checklistItemId = persistedItem?.id;

        if (!checklistItemId) {
          const createResponse = await fetch(`/api/tasks/${encodeURIComponent(selectedBoardTask.id)}/checklist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
              label: item.label
            })
          });

          if (!createResponse.ok) {
            throw new Error(await getApiErrorMessage(createResponse, "Unable to create the checklist item."));
          }

          const createPayload = (await createResponse.json().catch(() => null)) as { item?: { id: string } } | null;
          checklistItemId = createPayload?.item?.id;

          if (!checklistItemId) {
            throw new Error("Checklist item was created, but the response did not include an id.");
          }
        }

        const updateResponse = await fetch(
          `/api/tasks/${encodeURIComponent(selectedBoardTask.id)}/checklist/${encodeURIComponent(checklistItemId)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              completed: nextCompleted
            })
          }
        );

        if (!updateResponse.ok) {
          throw new Error(await getApiErrorMessage(updateResponse, "Unable to update the checklist item."));
        }

        await refreshSelectedTaskDetail(
          selectedBoardTask.id,
          nextCompleted ? "Checklist item completed." : "Checklist item reopened."
        );
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : "Unable to update the checklist item.");
      }
    });
  }

  function exportTasksCsv(tasksToExport: BoardReadTask[], fileSuffix: string) {
    const header = ["Task #", "Title", "Status", "Priority", "Owner", "Department", "Due Time", "Vehicle / Customer"];
    const rows = tasksToExport.map((task) => {
      const priority = getPriorityLabel(task, now);

      return [
        formatTaskDisplayNumber(task.id),
        task.title,
        formatTaskEnumLabel(task.status),
        priority,
        getTaskOwnerName(task),
        getDepartmentLabel(task.workflowArea),
        formatTime(task.dueAt),
        getTaskReference(task)
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `tasks-${fileSuffix}-${boardDate}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
  }

  function handleExportVisibleTasks() {
    exportTasksCsv(visibleTasks, "visible");
  }

  function handleExportSelectedTasks() {
    exportTasksCsv(selectedTasks, "selected");
  }

  const statusSidebarItems: SidebarItem[] = [
    {
      active: activeQueueFilter === "BLOCKED",
      badge: blockedTasks.length,
      key: "blocked",
      label: "Blocked",
      onClick: () => handleQueueFilterChange("BLOCKED"),
      tone: "danger"
    },
    {
      active: activeQueueFilter === "WAITING_ON_PARTS",
      badge: waitingOnPartsTasks.length,
      key: "waiting-parts",
      label: "Waiting on Parts",
      onClick: () => handleQueueFilterChange("WAITING_ON_PARTS"),
      tone: "warning"
    },
    {
      active: activeQueueFilter === "WAITING_ON_APPROVAL",
      badge: waitingOnApprovalTasks.length,
      key: "waiting-approval",
      label: "Waiting on Approval",
      onClick: () => handleQueueFilterChange("WAITING_ON_APPROVAL"),
      tone: "warning"
    },
    {
      active: activeQueueFilter === "READY_FOR_REVIEW",
      badge: readyForReviewTasks.length,
      key: "ready-review",
      label: "Ready for Review",
      onClick: () => handleQueueFilterChange("READY_FOR_REVIEW"),
      tone: "review"
    },
    {
      active: activeQueueFilter === "OVERDUE",
      badge: getQueueCount(allTasks, "OVERDUE", now, boardDate, currentUserId),
      key: "overdue",
      label: "Overdue",
      onClick: () => handleQueueFilterChange("OVERDUE"),
      tone: "danger"
    },
    {
      active: activeQueueFilter === "COMPLETED",
      badge: completedTodayTasks.length,
      key: "completed",
      label: "Completed Today",
      onClick: () => handleQueueFilterChange("COMPLETED"),
      tone: "success"
    }
  ];

  const departmentSidebarItems: SidebarItem[] = [
    {
      active: activeDepartmentFilter === "INVENTORY",
      badge: inventoryCount,
      key: "inventory",
      label: "Inventory",
      onClick: () => handleDepartmentFilterChange("INVENTORY"),
      tone: "slate"
    },
    {
      active: activeDepartmentFilter === "SERVICE_ADVISOR",
      badge: serviceAdvisorCount,
      key: "service-advisor",
      label: "Service Advisor",
      onClick: () => handleDepartmentFilterChange("SERVICE_ADVISOR"),
      tone: "slate"
    },
    {
      active: activeDepartmentFilter === "SHOP",
      badge: serviceReconCount,
      key: "service-recon",
      label: "Service / Recon",
      onClick: () => handleDepartmentFilterChange("SHOP"),
      tone: "slate"
    },
    {
      active: activeDepartmentFilter === "SALES",
      badge: salesCount,
      key: "sales",
      label: "Sales",
      onClick: () => handleDepartmentFilterChange("SALES"),
      tone: "slate"
    },
    {
      active: activeDepartmentFilter === "ADVERTISING",
      badge: marketingCount,
      key: "marketing",
      label: "Marketing / Advertising",
      onClick: () => handleDepartmentFilterChange("ADVERTISING"),
      tone: "slate"
    },
    {
      active: activeDepartmentFilter === "ADMIN",
      badge: adminCount,
      key: "admin",
      label: "Admin / Documentation",
      onClick: () => handleDepartmentFilterChange("ADMIN"),
      tone: "slate"
    },
    {
      active: activeDepartmentFilter === "COLLECTIONS",
      badge: collectionsCount,
      key: "collections",
      label: "Collections",
      onClick: () => handleDepartmentFilterChange("COLLECTIONS"),
      tone: "slate"
    }
  ];

  function renderSidebarItem(item: SidebarItem) {
    const className = item.active
      ? "tasks-console-nav-item tasks-console-nav-item-active"
      : "tasks-console-nav-item";
    const markClassName = `tasks-console-nav-mark tasks-console-nav-mark-${item.tone}`;
    const badgeClassName = `tasks-console-nav-badge tasks-console-nav-badge-${item.tone}`;
    const content = (
      <>
        <span className={markClassName} aria-hidden="true" />
        <span>{item.label}</span>
        {typeof item.badge === "number" && item.badge > 0 ? (
          <small className={badgeClassName}>{item.badge}</small>
        ) : null}
      </>
    );

    if (item.href) {
      return (
        <Link className={className} href={item.href} key={item.key}>
          {content}
        </Link>
      );
    }

    return (
      <button
        aria-pressed={item.active}
        className={className}
        key={item.key}
        onClick={item.onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  if (errorMessage) {
    return (
      <section className="tasks-console-page">
        <ErrorStateCard
          actions={[{ label: "Open Full Board", href: boardHref }]}
          eyebrow="Tasks unavailable"
          message={errorMessage}
          title="The Tasks console could not load"
        />
      </section>
    );
  }

  return (
    <section className="tasks-console-page" ref={consoleRef}>
      <nav className="tasks-console-enterprise-nav" aria-label="Tasks enterprise capabilities">
        <button className="tasks-console-enterprise-tab tasks-console-enterprise-tab-active" onClick={handleResetBoardView} type="button">
          Board
        </button>
        {selectedBoardTask ? <Link className="tasks-console-enterprise-tab" href={createTaskDetailHref(selectedBoardTask.id, consoleReturnHref)}>Workbench</Link> : null}
        <Link className="tasks-console-enterprise-tab" href="/prototype/task-templates?view=automations">Automations</Link>
        <Link className="tasks-console-enterprise-tab" href="/prototype/task-templates">Templates</Link>
        <button className="tasks-console-enterprise-tab" onClick={() => handleQueueFilterChange("OVERDUE")} type="button">
          SLA &amp; Risk
        </button>
        <Link className="tasks-console-enterprise-tab" href="/reports">Insights</Link>
      </nav>

      <div className="tasks-console-toolbar">
        <div className="tasks-console-heading">
          <h1>Tasks</h1>
          <p>Task Operations Console</p>
        </div>

        <label className="tasks-console-search" aria-label="Search tasks">
          <Search size={16} />
          <input
            placeholder="Search tasks, vehicles, customers..."
            value={searchText}
            onChange={(event) => handleSearchValueChange(event.target.value)}
          />
        </label>

        <div className="tasks-console-action-group">
          <Link
            className="pill pill-primary tasks-console-create"
            href={`/tasks/intake?returnTo=${encodeURIComponent(consoleBaseHref)}`}
          >
            <Plus size={16} />
            Task Intake
          </Link>
          <button
            aria-label="Log concern"
            className="pill pill-secondary tasks-console-icon-pill"
            disabled={!isManager}
            onClick={() => { setConcernIntakeOpen(true); setQuickCreateOpen(false); }}
            title="Log concern"
            type="button"
          >
            <AlertTriangle size={16} />
          </button>
          <button
            className="pill pill-secondary"
            disabled={!isManager || isGeneratePending}
            onClick={handleGenerateBoard}
            type="button"
          >
            <RefreshCw size={16} />
            {isGeneratePending ? "Generating..." : "Generate Today's Board"}
          </button>
          <div className="tasks-console-date-pill">
            <Calendar size={16} />
            <span>{isTodayBoard ? "Today" : formatShortDate(`${boardDate}T00:00:00.000Z`)}</span>
            <strong>{formatBoardDateLabel(boardDate)}</strong>
          </div>
        </div>

        <div className="tasks-console-action-group tasks-console-action-group-end">
          <div className="tasks-console-menu-host">
            <button
              aria-expanded={activeMenu === "saved"}
              className="pill pill-secondary"
              onClick={() => handleMenuToggle("saved")}
              type="button"
            >
              Saved Views
              <ChevronDown size={14} />
            </button>
            {activeMenu === "saved" ? (
              <div className="tasks-console-popover tasks-console-toolbar-popover">
                <strong>Quick Views</strong>
                <button onClick={() => handleQueueFilterChange("ALL")} type="button">All tasks</button>
                <button onClick={() => handleQueueFilterChange("BLOCKED")} type="button">Blocked tasks</button>
                <button onClick={() => handleQueueFilterChange("READY_FOR_REVIEW")} type="button">Ready for review</button>
                <button onClick={() => handleQueueFilterChange("OVERDUE")} type="button">Overdue tasks</button>
                {savedViews.length ? (
                  <>
                    <strong>Shared Saved Views</strong>
                    {savedViews.map((savedView) => (
                      <div className="tasks-console-saved-view-row" key={savedView.id}>
                        <button onClick={() => handleApplySavedView(savedView)} type="button">
                          {savedView.name}
                        </button>
                        <button
                          aria-label={`Delete ${savedView.name}`}
                          className="tasks-console-saved-view-delete"
                          disabled={!isManager || isSavedViewPending}
                          onClick={() => handleDeleteSavedView(savedView.id)}
                          type="button"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </>
                ) : null}
                <button disabled={!isManager || isSavedViewPending} onClick={handleCreateSavedView} type="button">
                  {isSavedViewPending ? "Saving shared view..." : "Save shared view"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="tasks-console-menu-host">
            <button
              aria-expanded={activeMenu === "filters"}
              className="pill pill-secondary"
              onClick={() => handleMenuToggle("filters")}
              type="button"
            >
              <Filter size={15} />
              Filters
            </button>
            {activeMenu === "filters" ? (
              <div className="tasks-console-popover tasks-console-popover-wide tasks-console-toolbar-popover">
                <strong>Queue</strong>
                <div className="tasks-console-popover-grid">
                  {(["ALL", "NOT_STARTED", "IN_PROGRESS", "BLOCKED", "WAITING", "READY_FOR_REVIEW", "OVERDUE", "COMPLETED"] as QueueFilter[]).map((filter) => (
                    <button
                      className={activeQueueFilter === filter ? "tasks-console-popover-active" : undefined}
                      key={filter}
                      onClick={() => handleQueueFilterChange(filter)}
                      type="button"
                    >
                      {getQueueFilterLabel(filter)}
                    </button>
                  ))}
                </div>
                <strong>Department</strong>
                <div className="tasks-console-popover-grid">
                  {(["INVENTORY", "SERVICE_ADVISOR", "SHOP", "SALES", "ADVERTISING", "ADMIN", "COLLECTIONS"] as DepartmentFilter[]).map((filter) => (
                    <button
                      className={activeDepartmentFilter === filter ? "tasks-console-popover-active" : undefined}
                      key={filter}
                      onClick={() => handleDepartmentFilterChange(filter)}
                      type="button"
                    >
                      {getDepartmentLabel(filter)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button className="pill pill-secondary" onClick={handleExportVisibleTasks} type="button">
            <Download size={15} />
            Export
          </button>
          <div className="tasks-console-menu-host">
            <button
              aria-expanded={activeMenu === "more"}
              className="pill pill-secondary"
              onClick={() => handleMenuToggle("more")}
              type="button"
              aria-label="Advanced tools"
            >
              <MoreHorizontal size={16} />
              Advanced tools
            </button>
            {activeMenu === "more" ? (
              <div className="tasks-console-popover tasks-console-popover-right">
                <strong>Advanced tools</strong>
                <button onClick={handleResetBoardView} type="button">Reset board view</button>
                <button onClick={() => handleMenuToggle("columns")} type="button">Configure columns</button>
                <button onClick={handleExportVisibleTasks} type="button">Export visible tasks</button>
                <button onClick={() => { setActiveView("list"); setActiveMenu(null); }} type="button">Open list view</button>
                <button onClick={() => { setActiveView("board"); setActiveMenu(null); }} type="button">Open board view</button>
                <Link href={boardHref}>Open full board</Link>
              </div>
            ) : null}
          </div>
        </div>

        {board ? (
          <div className="tasks-console-header-metrics" aria-label="Task status summary">
            {taskMetrics.map((metric) => {
              const active = activeQueueFilter === metric.filter;

              return (
                <button
                  className={
                    active
                      ? `tasks-console-header-metric ${getMetricCardTone(metric.filter)} tasks-console-header-metric-active`
                      : `tasks-console-header-metric ${getMetricCardTone(metric.filter)}`
                  }
                  key={metric.label}
                  onClick={() => handleQueueFilterChange(metric.filter)}
                  type="button"
                >
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </button>
              );
            })}
          </div>
        ) : null}

        {board ? (
          <div className="tasks-console-freshness" aria-label="Board freshness">
            <span>Live board</span>
            <strong>Last generated {generatedLabel}</strong>
            <em>{activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : "No filters active"}</em>
          </div>
        ) : null}
      </div>

      {board ? (
        <section className="tasks-console-command-strip" aria-label="Task work health">
          {commandMetrics.map((metric) => (
            <button
              className={`tasks-console-command-card ${metric.value > 0 ? "attention" : ""}`}
              key={metric.label}
              onClick={() => handleQueueFilterChange(metric.filter)}
              type="button"
            >
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </button>
          ))}
        </section>
      ) : null}

      {board ? (
        <nav className="tasks-console-context-nav" aria-label="Task board navigation">
          <Link href={boardHref}>Overview</Link>
          <button className={activeQueueFilter === "MY_TASKS" ? "active" : undefined} onClick={() => handleQueueFilterChange("MY_TASKS")} type="button">
            My Tasks <span>{myTasksCount}</span>
          </button>
          <button className={activeQueueFilter === "ALL" ? "active" : undefined} onClick={() => handleQueueFilterChange("ALL")} type="button">
            Team Queue <span>{allTasks.length}</span>
          </button>
          <button className={acquisitionView === "available" ? "active" : undefined} onClick={() => setAcquisitionView(acquisitionView === "available" ? "all" : "available")} type="button">
            Available Work <span>{acquisitionOverview?.counts.available ?? 0}</span>
          </button>
          <button className={acquisitionView === "my-requests" ? "active" : undefined} onClick={() => setAcquisitionView(acquisitionView === "my-requests" ? "all" : "my-requests")} type="button">
            My Requests <span>{acquisitionOverview?.counts.pendingRequests ?? 0}</span>
          </button>
          <button className={acquisitionView === "needs-help" ? "active" : undefined} onClick={() => setAcquisitionView(acquisitionView === "needs-help" ? "all" : "needs-help")} type="button">
            Needs Help
          </button>
          {isManager ? (
            <button className={acquisitionView === "manager-requests" ? "active" : undefined} onClick={() => setAcquisitionView(acquisitionView === "manager-requests" ? "all" : "manager-requests")} type="button">
              Assignment Requests <span>{managerRequests.length}</span>
            </button>
          ) : null}
          <div className="tasks-console-context-menu-host">
            <button aria-expanded={statusLinksOpen} onClick={() => setStatusLinksOpen((open) => !open)} type="button">
              Status <ChevronDown size={13} />
            </button>
            {statusLinksOpen ? (
              <div className="tasks-console-context-menu">
                {statusSidebarItems.map((item) => renderSidebarItem(item))}
              </div>
            ) : null}
          </div>
          <div className="tasks-console-context-menu-host">
            <button aria-expanded={departmentLinksOpen} onClick={() => setDepartmentLinksOpen((open) => !open)} type="button">
              Departments <ChevronDown size={13} />
            </button>
            {departmentLinksOpen ? (
              <div className="tasks-console-context-menu tasks-console-context-menu-wide">
                {departmentSidebarItems.map((item) => renderSidebarItem(item))}
              </div>
            ) : null}
          </div>
          <div className="tasks-console-context-menu-host">
            <button aria-expanded={activeMenu === "saved"} onClick={() => handleMenuToggle("saved")} type="button">
              Saved Views <ChevronDown size={13} />
            </button>
            {activeMenu === "saved" ? (
              <div className="tasks-console-context-menu tasks-console-context-menu-wide">
                <button onClick={() => handleQueueFilterChange("ALL")} type="button">All tasks</button>
                <button onClick={() => handleQueueFilterChange("BLOCKED")} type="button">Blocked tasks</button>
                <button onClick={() => handleQueueFilterChange("READY_FOR_REVIEW")} type="button">Ready for review</button>
                <button onClick={() => handleQueueFilterChange("OVERDUE")} type="button">Overdue tasks</button>
                {savedViews.map((savedView) => (
                  <button key={savedView.id} onClick={() => handleApplySavedView(savedView)} type="button">{savedView.name}</button>
                ))}
                <button disabled={!isManager || isSavedViewPending} onClick={handleCreateSavedView} type="button">Save shared view</button>
              </div>
            ) : null}
          </div>
          <div className="tasks-console-context-menu-host tasks-console-context-menu-host-end">
            <button aria-expanded={activeMenu === "filters"} onClick={() => handleMenuToggle("filters")} type="button">
              <Filter size={13} /> Filters
            </button>
            {activeMenu === "filters" ? (
              <div className="tasks-console-context-menu tasks-console-context-filter-menu">
                {(["ALL", "NOT_STARTED", "IN_PROGRESS", "BLOCKED", "WAITING", "READY_FOR_REVIEW", "OVERDUE", "COMPLETED"] as QueueFilter[]).map((filter) => (
                  <button className={activeQueueFilter === filter ? "tasks-console-popover-active" : undefined} key={filter} onClick={() => handleQueueFilterChange(filter)} type="button">
                    {getQueueFilterLabel(filter)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button onClick={handleExportVisibleTasks} type="button"><Download size={13} /> Export</button>
        </nav>
      ) : null}

      {board ? (
        <nav className="tasks-console-execution-views" aria-label="Saved execution views">
          {executionViews.map((view) => (
            <button
              className={activeQueueFilter === view.filter ? "active" : undefined}
              key={view.label}
              onClick={() => handleQueueFilterChange(view.filter)}
              type="button"
            >
              <span>{view.label}</span>
              <strong>{view.count}</strong>
            </button>
          ))}
        </nav>
      ) : null}

      {acquisitionMessage || acquisitionError ? (
        <div className={acquisitionError ? "tasks-acquisition-notice tasks-acquisition-notice-error" : "tasks-acquisition-notice"}>
          {acquisitionError ?? acquisitionMessage}
        </div>
      ) : null}

      {acquisitionView === "my-requests" && acquisitionOverview?.requests.length ? (
        <section className="tasks-acquisition-request-strip" aria-label="My assignment requests">
          {acquisitionOverview.requests.slice(0, 6).map((request) => (
            <article key={request.id}>
              <div><strong>{request.task.title}</strong><span>{formatTaskEnumLabel(request.status)} · {formatDateTime(request.createdAt)}</span></div>
              {request.status === "PENDING" ? <button disabled={isAcquisitionPending} onClick={() => handleCancelAssignmentRequest(request.id)} type="button">Cancel</button> : null}
            </article>
          ))}
        </section>
      ) : null}

      {acquisitionView === "manager-requests" ? (
        <section className="tasks-acquisition-manager-queue" aria-label="Manager assignment requests">
          <header><strong>Assignment Requests</strong><span>{managerRequests.length} pending</span></header>
          {managerRequests.length ? managerRequests.map((request) => (
            <article key={request.id}>
              <div><strong>{request.task.title}</strong><span>{request.requester.name} · {request.task.workflowArea} · {request.task.priority} · {formatDateTime(request.createdAt)}</span></div>
              <p>{request.requestReason ?? "No additional reason provided."}</p>
              <div>
                <button disabled={isAcquisitionPending} onClick={() => handleManagerRequestDecision(request.id, "DECLINED")} type="button">Decline</button>
                <button className="primary" disabled={isAcquisitionPending} onClick={() => handleManagerRequestDecision(request.id, "APPROVED")} type="button">Approve</button>
                <form onSubmit={(event) => handleAssignAnotherOwner(event, request.id)}>
                  <select aria-label={`Alternative owner for ${request.task.title}`} name="targetUserId" required>
                    <option value="">Assign another...</option>
                    {assignableUsers.filter((user) => user.id !== request.requester.id).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                  <button disabled={isAcquisitionPending} type="submit">Assign</button>
                </form>
              </div>
            </article>
          )) : <p className="tasks-acquisition-empty">No assignment requests are waiting for review.</p>}
        </section>
      ) : null}

      {generationMessage ? (
        <div className="notice">
          <p>{generationMessage}</p>
        </div>
      ) : null}

      {concernIntakeOpen ? (
        <ConcernIntakePanel
          onClose={() => setConcernIntakeOpen(false)}
          onCreated={() => router.refresh()}
        />
      ) : null}

      {quickCreateOpen ? (
        <section className="panel-card tasks-console-quick-create" aria-label="Quick create task">
          <header>
            <div>
              <strong>Create task</strong>
              <span>Fast manager capture for today&apos;s board</span>
            </div>
            <button
              aria-label="Close create task panel"
              className="tasks-console-rail-icon-button"
              disabled={isQuickCreatePending}
              onClick={handleCloseQuickCreate}
              type="button"
            >
              <X size={15} />
            </button>
          </header>
          <form onSubmit={handleQuickCreateTask}>
            <label className="tasks-console-quick-create-title">
              <span>Task title</span>
              <input name="title" placeholder="Example: Check vehicles needing inspection" required />
            </label>
            <label>
              <span>Owner</span>
              <select defaultValue={defaultQuickCreateAssigneeId} name="assignedUserId" required>
                {assigneeOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Due time</span>
              <input defaultValue={getQuickCreateDefaultDueTime()} name="dueTime" required type="time" />
            </label>
            <label>
              <span>Department</span>
              <select defaultValue={selectedBoardTask?.workflowArea ?? WorkflowArea.GENERAL_MANAGER} name="workflowArea">
                {TASKS_CONSOLE_WORKFLOW_AREAS.map((workflowArea) => (
                  <option key={workflowArea} value={workflowArea}>
                    {getDepartmentLabel(workflowArea)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select defaultValue={TaskStatus.NOT_STARTED} name="status">
                {TASKS_CONSOLE_CREATE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatTaskEnumLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Vehicle / stock</span>
              <input name="vehicleReference" placeholder="Optional vehicle, stock, or VIN" />
            </label>
            <label>
              <span>Customer</span>
              <input name="customerReference" placeholder="Optional customer reference" />
            </label>
            <label className="tasks-console-quick-create-notes">
              <span>Notes</span>
              <textarea name="description" placeholder="Short note for the assignee..." rows={1} />
            </label>
            <label className="tasks-console-quick-create-notes">
              <span>Blocker reason</span>
              <textarea name="blockerReason" placeholder="Required only if status is Blocked..." rows={1} />
            </label>
            <label className="tasks-console-quick-create-check">
              <input name="requiresManagerApproval" type="checkbox" />
              <span>Requires manager review before completion</span>
            </label>
            <div className="tasks-console-quick-create-actions">
              {quickCreateError ? <p className="tasks-console-inline-error">{quickCreateError}</p> : null}
              {quickCreateMessage ? <p className="tasks-console-inline-success">{quickCreateMessage}</p> : null}
              <button className="pill pill-secondary" disabled={isQuickCreatePending} onClick={handleCloseQuickCreate} type="button">
                Cancel
              </button>
              <button className="pill pill-primary" disabled={isQuickCreatePending || assigneeOptions.length === 0} type="submit">
                {isQuickCreatePending ? "Creating..." : "Add Task"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!board ? (
        <EmptyStateCard
          actions={
            isManager
              ? [
                  {
                    label: "Open Full Board",
                    href: boardHref
                  }
                ]
              : []
          }
          eyebrow="No board yet"
          message={
            isManager
              ? `No board exists for ${formatBoardDateLabel(boardDate)} yet. Use the board generation control above or open the full board to begin the day.`
              : `No board exists for ${formatBoardDateLabel(boardDate)} yet. A manager can generate it when the team is ready.`
          }
          title="The Tasks console is ready, but this board has no tasks yet"
        />
      ) : (
        <div
          className={[
            "tasks-console-shell",
            effectiveRightRailMode === "closed"
              ? "tasks-console-shell-rail-closed"
              : effectiveRightRailMode === "collapsed"
                ? "tasks-console-shell-rail-collapsed"
                : "",
            workspaceMode === "focus" ? "tasks-console-shell-focus" : ""
          ].filter(Boolean).join(" ")}
        >
          <div className="tasks-console-main">
            <div
              aria-hidden={activeFilterChips.length === 0}
              aria-label={activeFilterChips.length ? "Active task filters" : undefined}
              className={
                activeFilterChips.length
                  ? "tasks-console-active-filters"
                  : "tasks-console-active-filters tasks-console-active-filters-empty"
              }
            >
              {activeFilterChips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
              {activeFilterChips.length ? (
                <button onClick={handleResetBoardView} type="button">
                  Clear
                </button>
              ) : null}
            </div>

            <section className="panel-card tasks-console-stage">
              <div className="tasks-console-stage-toolbar">
                <div className="tasks-console-view-toggle" aria-label="Tasks view">
                  <button
                    aria-label="List View"
                    className={activeView === "list" ? "tasks-console-view-button tasks-console-view-button-active" : "tasks-console-view-button"}
                    onClick={() => setActiveView("list")}
                    type="button"
                  >
                    <List size={15} />
                    List
                  </button>
                  <button
                    aria-label="Board View"
                    className={activeView === "board" ? "tasks-console-view-button tasks-console-view-button-active" : "tasks-console-view-button"}
                    onClick={() => setActiveView("board")}
                    type="button"
                  >
                    <LayoutGrid size={15} />
                    Board
                  </button>
                </div>

                <div className="tasks-console-stage-actions">
                  <div className="tasks-console-menu-host tasks-console-workspace-menu-host">
                    <button
                      aria-expanded={activeMenu === "workspace"}
                      className="pill pill-secondary tasks-console-workspace-trigger"
                      onClick={() => handleMenuToggle("workspace")}
                      type="button"
                    >
                      <LayoutGrid size={15} />
                      Workspace: {workspaceMode[0].toUpperCase() + workspaceMode.slice(1)}
                      <ChevronDown size={13} />
                    </button>
                    {activeMenu === "workspace" ? (
                      <div className="tasks-console-popover tasks-console-workspace-popover">
                        {([
                          ["standard", "Standard", "Full navigation and command panel."],
                          ["compact", "Compact", "Icon navigation and open command panel."],
                          ["focus", "Focus", "Maximum task space with minimized rails."]
                        ] as [WorkspaceMode, string, string][]).map(([mode, label, description]) => (
                          <button
                            className={workspaceMode === mode ? "tasks-console-workspace-option tasks-console-popover-active" : "tasks-console-workspace-option"}
                            key={mode}
                            onClick={() => { setWorkspaceMode(mode); setActiveMenu(null); }}
                            type="button"
                          >
                            <span><strong>{label}</strong><small>{description}</small></span>
                            {workspaceMode === mode ? <Check size={15} /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    aria-label={workspaceMode === "focus" ? "Exit Focus" : "Expand Tasks"}
                    aria-pressed={workspaceMode === "focus"}
                    className={workspaceMode === "focus" ? "pill pill-primary" : "pill pill-secondary"}
                    onClick={() => setWorkspaceMode(workspaceMode === "focus" ? "compact" : "focus")}
                    type="button"
                  >
                    <LayoutGrid size={15} />
                    {workspaceMode === "focus" ? "Exit Focus" : "Expand"}
                  </button>
                  <div className="tasks-console-menu-host">
                    <button
                      aria-expanded={activeMenu === "group"}
                      className="pill pill-secondary"
                      onClick={() => handleMenuToggle("group")}
                      type="button"
                    >
                      Group: {getGroupByLabel(groupBy)}
                      <ChevronDown size={14} />
                    </button>
                    {activeMenu === "group" ? (
                      <div className="tasks-console-popover tasks-console-popover-right">
                        {(["none", "status", "owner", "department"] as TasksConsoleGroupBy[]).map((option) => (
                          <button
                            className={groupBy === option ? "tasks-console-popover-active" : undefined}
                            key={option}
                            onClick={() => handleGroupByChange(option)}
                            type="button"
                          >
                            {getGroupByLabel(option)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="pill pill-secondary tasks-console-icon-pill"
                    onClick={() => router.refresh()}
                    type="button"
                    aria-label="Refresh stage"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <div className="tasks-console-menu-host">
                    <button
                      aria-expanded={activeMenu === "columns"}
                      className="pill pill-secondary"
                      onClick={() => handleMenuToggle("columns")}
                      type="button"
                    >
                      <Columns3 size={15} />
                      Columns
                      <ChevronDown size={14} />
                    </button>
                    {activeMenu === "columns" ? (
                      <div className="tasks-console-popover tasks-console-popover-wide tasks-console-popover-right">
                        <strong>Visible Columns</strong>
                        <div className="tasks-console-column-list">
                          {TASKS_CONSOLE_COLUMNS.map((column) => (
                            <label className="tasks-console-column-toggle" key={column.key}>
                              <input
                                checked={visibleColumnSet.has(column.key)}
                                disabled={column.key === "title"}
                                onChange={() => handleColumnToggle(column.key)}
                                type="checkbox"
                              />
                              <span>{column.label}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
                            setActiveMenu(null);
                          }}
                          type="button"
                        >
                          Reset columns
                        </button>
                        <button onClick={() => { setActiveView("board"); setActiveMenu(null); }} type="button">Switch to board lanes</button>
                      </div>
                    ) : null}
                  </div>
                  <div className="tasks-console-menu-host">
                    <button
                      aria-expanded={activeMenu === "stageMore"}
                      className="pill pill-secondary tasks-console-icon-pill"
                      onClick={() => handleMenuToggle("stageMore")}
                      type="button"
                      aria-label="Display settings"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {activeMenu === "stageMore" ? (
                      <div className="tasks-console-popover tasks-console-popover-right">
                        <button onClick={handleExportVisibleTasks} type="button">Export visible tasks</button>
                        <button onClick={handleResetBoardView} type="button">Clear filters</button>
                        {selectedBoardTask ? <Link href={createTaskDetailHref(selectedBoardTask.id, consoleReturnHref)}>Open selected task</Link> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {activeView === "list" ? (
                <div className="tasks-console-table-shell">
                  {selectedTasks.length ? (
                    <div className="tasks-console-bulk-bar" role="status">
                      <strong>{selectedTasks.length} selected</strong>
                      <span>Bulk execution</span>
                      {isManager ? <button onClick={() => handleOpenSelectedTaskForExecution("details")} type="button">Assign first</button> : null}
                      <button onClick={() => handleOpenSelectedTaskForExecution("details")} type="button">Update first</button>
                      <button onClick={handleExportSelectedTasks} type="button">Export selected</button>
                      <button onClick={() => setSelectedTaskIds([])} type="button">Clear</button>
                    </div>
                  ) : null}
                  <div className="tasks-console-table-scroll">
                    <table className="tasks-console-table">
                      <thead>
                        <tr>
                          <th className="tasks-console-checkbox-column">
                            <input aria-label="Select visible tasks" checked={allVisibleSelected} onChange={handleToggleVisibleTaskSelection} type="checkbox" />
                          </th>
                          {visibleColumnSet.has("title") ? <th className="tasks-console-column-title">Task description</th> : null}
                          {visibleColumnSet.has("priority") ? <th className="tasks-console-column-priority">Priority</th> : null}
                          {visibleColumnSet.has("status") ? <th className="tasks-console-column-status">Status</th> : null}
                          {visibleColumnSet.has("owner") ? <th className="tasks-console-column-owner">Owner</th> : null}
                          {visibleColumnSet.has("department") ? <th className="tasks-console-column-department">Department</th> : null}
                          {visibleColumnSet.has("dueTime") ? <th className="tasks-console-column-due-time">Due Time</th> : null}
                          {visibleColumnSet.has("vehicleCustomer") ? (
                            <th className="tasks-console-column-vehicle">Vehicle / Customer</th>
                          ) : null}
                          {visibleColumnSet.has("age") ? <th className="tasks-console-column-age">Age</th> : null}
                          {visibleColumnSet.has("taskNumber") ? <th className="tasks-console-column-task-number">Task #</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedTasks.length === 0 ? (
                          <tr>
                            <td className="tasks-console-table-empty" colSpan={visibleDataColumnCount + 1}>
                              No tasks match the current view.
                            </td>
                          </tr>
                        ) : (
                          pagedTasks.map((task) => {
                            const priority = getPriorityLabel(task, now);
                            const active = task.id === effectiveSelectedTaskId;
                            const updating = active && isWorkflowPending;
                            const taskReference = getTaskReference(task);
                            const executionSignal = getTaskExecutionSignal(task, now);
                            const acquisitionDecision = getTaskAcquisitionDecision(task.id);
                            const canStartTask = getTaskOwnerId(task) === currentUserId && task.status === TaskStatus.NOT_STARTED;
                            const rowSelected = selectedTaskIds.includes(task.id);

                            return (
                              <tr
                                className={[
                                  "tasks-console-row",
                                  getTaskRiskClass(task, now),
                                  rowSelected ? "tasks-console-row-selected" : "",
                                  active ? "tasks-console-row-active" : "",
                                  updating ? "tasks-console-row-updating" : ""
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                key={task.id}
                                onClick={() => handleSelectTask(task.id)}
                                onDoubleClick={() => router.push(createTaskDetailHref(task.id, consoleReturnHref))}
                              >
                                <td className="tasks-console-checkbox-column">
                                  <input
                                    aria-label={`Select ${task.title}`}
                                    checked={rowSelected}
                                    onChange={() => handleToggleTaskSelection(task.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    type="checkbox"
                                  />
                                </td>
                                {visibleColumnSet.has("title") ? (
                                  <td className="tasks-console-column-title">
                                    <div className="tasks-console-title-cell">
                                      <Link href={createTaskDetailHref(task.id, consoleReturnHref)} onClick={(event) => event.stopPropagation()} title="Open task workbench">
                                        <strong>{task.title}</strong>
                                      </Link>
                                      <small>{executionSignal}</small>
                                      {task.requiresManagerApproval ? (
                                        <span className="tasks-console-row-review-chip">Review</span>
                                      ) : null}
                                      {canStartTask ? (
                                        <button className="tasks-console-row-acquisition" disabled={isAcquisitionPending} onClick={(event) => { event.stopPropagation(); handleTaskAcquisition(task.id, "START"); }} type="button">Start Work</button>
                                      ) : acquisitionDecision?.policy === "DIRECT_CLAIM" ? (
                                        <button className="tasks-console-row-acquisition" disabled={isAcquisitionPending} onClick={(event) => { event.stopPropagation(); handleTaskAcquisition(task.id, "CLAIM"); }} title={acquisitionDecision.explanation} type="button">Claim</button>
                                      ) : acquisitionDecision?.policy === "APPROVAL_REQUIRED" || acquisitionDecision?.policy === "MANAGER_ASSIGN_ONLY" ? (
                                        <button className="tasks-console-row-acquisition" disabled={isAcquisitionPending} onClick={(event) => { event.stopPropagation(); handleTaskAcquisition(task.id, "REQUEST"); }} title={acquisitionDecision.explanation} type="button">Request</button>
                                      ) : null}
                                      <div className="tasks-console-row-quick-actions" aria-label={`Quick actions for ${task.title}`}>
                                        <Link href={createTaskDetailHref(task.id, consoleReturnHref)} onClick={(event) => event.stopPropagation()}>Open</Link>
                                        <button onClick={(event) => { event.stopPropagation(); handleSelectTask(task.id); setActiveTab("details"); }} type="button">Update</button>
                                        {isManager ? <button onClick={(event) => { event.stopPropagation(); handleSelectTask(task.id); setActiveTab("details"); }} type="button">Assign</button> : null}
                                      </div>
                                    </div>
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("priority") ? (
                                  <td className="tasks-console-column-priority">
                                    <span className={getPriorityToneClass(priority)}>{priority}</span>
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("status") ? (
                                  <td className="tasks-console-column-status">
                                    <span className={getStatusToneClass(task.status)}>
                                      {formatTaskEnumLabel(task.status)}
                                    </span>
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("owner") ? (
                                  <td className="tasks-console-column-owner">
                                    <div className="tasks-console-owner-cell">
                                      <span className="tasks-console-avatar">
                                        {getTaskOwnerInitials(task)}
                                      </span>
                                      <span className="tasks-console-owner-name">{getTaskOwnerName(task)}</span>
                                    </div>
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("department") ? (
                                  <td className="tasks-console-column-department tasks-console-department-cell">
                                    {getDepartmentLabel(task.workflowArea)}
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("dueTime") ? (
                                  <td className="tasks-console-column-due-time tasks-console-due-cell">
                                    <span className={getDueTimeToneClass(task, now)}>{formatTime(task.dueAt)}</span>
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("vehicleCustomer") ? (
                                  <td className="tasks-console-column-vehicle tasks-console-vehicle-cell" title={taskReference}>
                                    <span>{taskReference}</span>
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("age") ? (
                                  <td className="tasks-console-column-age tasks-console-age-cell">
                                    {formatAgeFromTimestamp(task.updatedAt, now)}
                                    {task.status === TaskStatus.BLOCKED || isTaskOverdue(task, now) ? (
                                      <span className="tasks-console-age-dot" aria-hidden="true" />
                                    ) : null}
                                  </td>
                                ) : null}
                                {visibleColumnSet.has("taskNumber") ? (
                                  <td className="tasks-console-column-task-number tasks-console-task-number">
                                    <Link href={createTaskDetailHref(task.id, consoleReturnHref)} onClick={(event) => event.stopPropagation()} title="Open task workbench">
                                      {formatTaskDisplayNumber(task.id)}
                                    </Link>
                                  </td>
                                ) : null}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="tasks-console-table-footer">
                    <span>
                      {pageSize === "all"
                        ? `Showing all ${visibleTasks.length} tasks`
                        : `Showing ${pageCountStart} to ${pageCountEnd} of ${visibleTasks.length} tasks`}
                    </span>
                    <div className="tasks-console-table-footer-controls">
                      <span>{getQueueFilterLabel(activeQueueFilter)}</span>
                      <div className="tasks-console-pagination" aria-label="Task pages">
                        <button
                          className="tasks-console-page-button tasks-console-page-button-icon"
                          disabled={activePage === 1}
                          onClick={() => setCurrentPage(activePage - 1)}
                          type="button"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        {paginationItems.map((item, index) =>
                          item === "ellipsis" ? (
                            <span className="tasks-console-page-ellipsis" key={`ellipsis-${index}`}>
                              ...
                            </span>
                          ) : (
                            <button
                              className={
                                item === activePage
                                  ? "tasks-console-page-button tasks-console-page-button-active"
                                  : "tasks-console-page-button"
                              }
                              key={item}
                              onClick={() => setCurrentPage(item)}
                              type="button"
                            >
                              {item}
                            </button>
                          )
                        )}
                        <button
                          className="tasks-console-page-button tasks-console-page-button-icon"
                          disabled={activePage === totalPages}
                          onClick={() => setCurrentPage(activePage + 1)}
                          type="button"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <label className="tasks-console-page-size">
                          <span className="sr-only">Rows per page</span>
                          <select
                            aria-label="Rows per page"
                            onChange={(event) => {
                              const nextPageSize = event.target.value === "all"
                                ? "all"
                                : Number(event.target.value) as Exclude<TasksPageSize, "all">;
                              setPageSize(nextPageSize);
                              setCurrentPage(1);
                            }}
                            value={String(pageSize)}
                          >
                            <option value="8">8 / page</option>
                            <option value="25">25 / page</option>
                            <option value="all">All</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tasks-console-board-view">
                  {BOARD_VIEW_STATUSES.map((status) => {
                    const laneTasks = pagedTasks.filter((task) => task.status === status);

                    return (
                      <section className="tasks-console-lane" key={status}>
                        <header className="tasks-console-lane-header">
                          <strong>{formatTaskEnumLabel(status)}</strong>
                          <span>{laneTasks.length}</span>
                        </header>
                        <div className="tasks-console-lane-list">
                          {laneTasks.length === 0 ? (
                            <div className="tasks-console-lane-empty">No tasks</div>
                          ) : (
                            laneTasks.map((task) => {
                              const active = task.id === effectiveSelectedTaskId;
                              const updating = active && isWorkflowPending;

                              return (
                                <button
                                  className={
                                    [
                                      "tasks-console-lane-card",
                                      active ? "tasks-console-lane-card-active" : "",
                                      updating ? "tasks-console-lane-card-updating" : ""
                                    ]
                                      .filter(Boolean)
                                      .join(" ")
                                  }
                                  key={task.id}
                                  onClick={() => handleSelectTask(task.id)}
                                  type="button"
                                >
                                  <div className="tasks-console-lane-card-top">
                                    <span className="tasks-console-task-number">
                                      {formatTaskDisplayNumber(task.id)}
                                    </span>
                                    <span>{formatTime(task.dueAt)}</span>
                                  </div>
                                  <strong>{task.title}</strong>
                                  <div className="tasks-console-lane-meta">
                                    <span className={getStatusToneClass(task.status)}>
                                      {formatTaskEnumLabel(task.status)}
                                    </span>
                                    <small>{getTaskOwnerName(task)}</small>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="tasks-console-summary-grid">
              {[
                {
                  title: "Blocked Tasks",
                  count: blockedTasks.length,
                  items: blockedTasks.slice(0, 2),
                  actionLabel: "View blocked",
                  filter: "BLOCKED" as const
                },
                    {
                      title: "Due Next 2 Hours",
                      count: dueSoonTasks.length,
                      items: dueSoonTasks.slice(0, 2),
                      actionLabel: "View due soon",
                      filter: "ALL" as const
                    },
                {
                  title: "Ready for Review",
                  count: readyForReviewTasks.length,
                  items: readyForReviewTasks.slice(0, 2),
                  actionLabel: "View ready",
                  filter: "READY_FOR_REVIEW" as const
                },
                {
                  title: "Unassigned Queue",
                  count: unassignedTasks.length,
                  items: unassignedTasks.slice(0, 2),
                  actionLabel: "View unassigned",
                  filter: "ALL" as const
                }
              ].map((card) => (
                <section className="panel-card tasks-console-summary-card" key={card.title}>
                  <header>
                    <div>
                      <strong>{card.title}</strong>
                      <span>{card.count}</span>
                    </div>
                  </header>
                  <div className="tasks-console-summary-list">
                    {card.items.length === 0 ? (
                      <p>
                        {card.title === "Unassigned Queue"
                          ? "The current task model assigns all work directly, so this queue is empty in the first pass."
                          : "No tasks in this queue right now."}
                      </p>
                    ) : (
                      card.items.map((task) => (
                        <button
                          className="tasks-console-summary-item"
                          key={task.id}
                          onClick={() => {
                            handleSelectTask(task.id);
                            handleQueueFilterChange(card.filter);
                            setActiveTab("details");
                          }}
                          type="button"
                        >
                          <strong>{task.title}</strong>
                          <small>
                            {formatTaskDisplayNumber(task.id)} | {getTaskOwnerName(task)} | {formatTime(task.dueAt)}
                          </small>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    className="tasks-console-summary-link"
                    onClick={() => handleQueueFilterChange(card.filter)}
                    type="button"
                  >
                    {card.actionLabel}
                  </button>
                </section>
              ))}
            </div>
          </div>

          {effectiveRightRailMode !== "closed" ? (
          <aside
            aria-busy={isWorkflowPending}
            className={
              effectiveRightRailMode === "collapsed"
                ? "panel-card tasks-console-rail tasks-console-rail-collapsed"
                : "panel-card tasks-console-rail"
            }
          >
            {selectedBoardTask ? (
              effectiveRightRailMode === "collapsed" ? (
                <div className="tasks-console-rail-collapsed-content">
                  <button
                    className="tasks-console-rail-icon-button"
                    onClick={() => workspaceMode === "focus" ? setWorkspaceMode("compact") : setRightRailMode("open")}
                    type="button"
                    aria-label="Expand task panel"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>{formatTaskDisplayNumber(selectedBoardTask.id)}</span>
                  <strong>{selectedBoardTask.title}</strong>
                  <button
                    className="tasks-console-rail-icon-button"
                    onClick={() => setRightRailMode("closed")}
                    type="button"
                    aria-label="Close task panel"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
              <>
                <div className="tasks-console-rail-header">
                  <div className="tasks-console-rail-record">
                    <div className="tasks-console-rail-record-badges">
                      <span>{formatTaskDisplayNumber(selectedBoardTask.id)}</span>
                      <span className={getStatusToneClass(selectedBoardTask.status)}>
                        {formatTaskEnumLabel(selectedBoardTask.status)}
                      </span>
                    </div>
                    <div className="tasks-console-rail-record-actions">
                      <button
                        className="tasks-console-rail-icon-button"
                        onClick={() => setRightRailMode("collapsed")}
                        type="button"
                        aria-label="Collapse task panel"
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button
                        className="tasks-console-rail-icon-button"
                        onClick={() => setRightRailMode("closed")}
                        type="button"
                        aria-label="Close task panel"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="tasks-console-rail-title">
                    <h2>{selectedBoardTask.title}</h2>
                    <p>{getTaskReference(selectedBoardTask)}</p>
                  </div>
                </div>

                <div className="tasks-console-rail-tabs" aria-label="Task detail tabs">
                  {([
                    {
                      value: "details",
                      label: "Details"
                    },
                    {
                      value: "comments",
                      label: `Comments${activeTaskDetail ? ` (${activeTaskDetail.comments.length})` : ""}`
                    },
                    {
                      value: "activity",
                      label: "Activity"
                    }
                  ] as Array<{ value: TasksConsoleTab; label: string }>).map((tab) => (
                    <button
                      className={
                        activeTab === tab.value
                          ? "tasks-console-rail-tab tasks-console-rail-tab-active"
                          : "tasks-console-rail-tab"
                      }
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {workflowMessage ? (
                  <div className="notice notice-success tasks-console-workflow-notice">
                    <p>{workflowMessage}</p>
                  </div>
                ) : null}

                {workflowError ? (
                  <div className="notice notice-danger tasks-console-workflow-notice">
                    <p>{workflowError}</p>
                  </div>
                ) : null}

                {isWorkflowPending ? (
                  <div className="tasks-console-rail-saving" role="status">
                    Updating selected task...
                  </div>
                ) : null}

                {detailLoading ? (
                  <div className="tasks-console-rail-state">
                    <p>Loading task details...</p>
                  </div>
                ) : null}

                {detailError ? (
                  <div className="notice notice-danger">
                    <p>{detailError}</p>
                  </div>
                ) : null}

                {!detailLoading && activeTab === "details" ? (
                  <div className="tasks-console-rail-panel">
                    <div className="tasks-console-rail-field-grid">
                      {activeTaskDetail ? (
                        <>
                          <div className="tasks-console-rail-field" key="status">
                            <span>Status</span>
                            <strong>
                              <span className={getStatusToneClass(activeTaskDetail.status)}>
                                {formatTaskEnumLabel(activeTaskDetail.status)}
                              </span>
                            </strong>
                          </div>
                          <div className="tasks-console-rail-field" key="priority">
                            <span>Priority</span>
                            <strong>
                              <span className={getPriorityToneClass(activeTaskPriority ?? "Low")}>
                                {activeTaskPriority ?? "Low"}
                              </span>
                            </strong>
                          </div>
                        </>
                      ) : null}
                      {rightRailFields.map((field) => (
                        <div className="tasks-console-rail-field" key={field.label}>
                          <span>{field.label}</span>
                          <strong>{field.value}</strong>
                        </div>
                      ))}
                    </div>

                    {activeTaskDetail && (activeTaskDetail.recommendation || activeTaskDetail.requiresManagerApproval) ? (
                      <div className="tasks-console-rail-insights">
                        {activeTaskDetail.recommendation ? (
                          <div>
                            <span>Recommendation</span>
                            <strong>{activeTaskDetail.recommendedUser?.name ?? "Recommended owner"}</strong>
                            <p>{activeTaskDetail.recommendation.explanation}</p>
                          </div>
                        ) : null}
                        {activeTaskDetail.requiresManagerApproval ? (
                          <div>
                            <span>Review required</span>
                            <strong>Ready for Review before Completed</strong>
                            <p>This task must be reviewed by a manager before it can close.</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <form
                      className="tasks-console-workflow-form"
                      key={`status-${activeTaskDetail?.id ?? selectedBoardTask.id}-${activeTaskDetail?.updatedAt ?? ""}`}
                      onSubmit={handleStatusUpdate}
                    >
                      <label>
                        <span>Status</span>
                        <select
                          name="status"
                          onChange={(event) =>
                            setStatusDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [selectedBoardTask.id]: event.target.value
                            }))
                          }
                          value={activeStatusDraft}
                        >
                          {TASKS_CONSOLE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatTaskEnumLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>
                          Blocker Reason
                          {activeStatusDraft === TaskStatus.BLOCKED ? " *" : ""}
                        </span>
                        <textarea
                          defaultValue={activeTaskDetail?.blockerReason ?? ""}
                          name="blockerReason"
                          placeholder="Required when moving task to blocked..."
                          rows={1}
                        />
                      </label>
                      <div className={`tasks-console-status-guidance tasks-console-status-guidance-${activeStatusGuidance.tone}`}>
                        <strong>{activeStatusGuidance.title}</strong>
                        <p>{activeStatusGuidance.body}</p>
                      </div>
                      {activeTaskDetail?.requiredUpdateFields.length ? (
                        <div className="tasks-console-update-fields">
                          <strong>Required Update Fields</strong>
                          {activeTaskDetail.requiredUpdateFields.map((field) => (
                            <label key={field.key}>
                              <span>
                                {field.label}
                                {field.required ? " *" : ""}
                              </span>
                              {field.type === "boolean" ? (
                                <input
                                  defaultChecked={activeTaskDetail.updateFieldValues[field.key] === true}
                                  name={`updateField:${field.key}`}
                                  type="checkbox"
                                />
                              ) : field.type === "single_select" && field.options?.length ? (
                                <select
                                  defaultValue={
                                    typeof activeTaskDetail.updateFieldValues[field.key] === "string"
                                      ? String(activeTaskDetail.updateFieldValues[field.key])
                                      : ""
                                  }
                                  name={`updateField:${field.key}`}
                                >
                                  <option value="">Select...</option>
                                  {field.options.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <textarea
                                  defaultValue={
                                    typeof activeTaskDetail.updateFieldValues[field.key] === "string"
                                      ? String(activeTaskDetail.updateFieldValues[field.key])
                                      : ""
                                  }
                                  name={`updateField:${field.key}`}
                                  placeholder={field.helpText ?? field.label}
                                  rows={field.type === "long_text" ? 2 : 1}
                                />
                              )}
                            </label>
                          ))}
                        </div>
                      ) : null}
                      <button className="pill pill-primary" disabled={isWorkflowPending} type="submit">
                        {isWorkflowPending ? "Saving..." : "Update Status"}
                      </button>
                    </form>

                    <div className="tasks-console-rail-block">
                      <span>Next Step</span>
                      <p>{buildNextStepCopy(activeTaskDetail)}</p>
                    </div>

                    <div className="tasks-console-rail-vehicle-card">
                      <div>
                        <span>Vehicle / Customer</span>
                        <strong>{getTaskReference(selectedBoardTask)}</strong>
                        {activeTaskDetail?.vehicleReference ? (
                          <small>Linked vehicle: {activeTaskDetail.vehicleReference}</small>
                        ) : null}
                        {activeTaskDetail?.customerReference ? (
                          <small>Linked customer: {activeTaskDetail.customerReference}</small>
                        ) : null}
                      </div>
                      <div className="tasks-console-vehicle-placeholder">No image linked</div>
                    </div>

                    <div className="tasks-console-rail-subtasks">
                      <div className="tasks-console-rail-subtasks-header">
                        <span>
                          Subtasks ({completedSubtaskCount}/{subtasks.length})
                        </span>
                        <strong>
                          {subtasks.length > 0
                            ? `${Math.round((completedSubtaskCount / subtasks.length) * 100)}%`
                            : "0%"}
                        </strong>
                      </div>
                      <div className="tasks-console-progress">
                        <div
                          className="tasks-console-progress-bar"
                          style={{
                            width:
                              subtasks.length > 0
                                ? `${(completedSubtaskCount / subtasks.length) * 100}%`
                                : "0%"
                          }}
                        />
                      </div>
                      <div className="tasks-console-checklist">
                        {subtasks.slice(0, 3).map((item) => (
                          <label className="tasks-console-checklist-item" key={item.id}>
                            <input
                              checked={item.completed}
                              disabled={isWorkflowPending}
                              onChange={() => handleChecklistToggle(item)}
                              type="checkbox"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {!detailLoading && activeTab === "comments" ? (
                  <div className="tasks-console-rail-panel">
                    <form
                      className="tasks-console-comment-form"
                      key={`comment-${activeTaskDetail?.id ?? selectedBoardTask.id}`}
                      onSubmit={handleCreateComment}
                    >
                      <div className="rich-text-field">
                        <span>New Comment</span>
                        <RichTextComposer
                          ariaLabel="New task comment"
                          compact
                          disabled={isWorkflowPending}
                          name="body"
                          onChange={(value) => {
                            setCommentDraft(value);
                            setWorkflowError(null);
                          }}
                          placeholder="Post a quick update for the team..."
                          rows={3}
                          value={commentDraft}
                        />
                      </div>
                      <button className="pill pill-primary" disabled={isWorkflowPending || !commentDraft.trim()} type="submit">
                        {isWorkflowPending ? "Posting..." : "Post Comment"}
                      </button>
                    </form>
                    {activeTaskDetail?.comments.length ? (
                      <div className="tasks-console-feed-list">
                        {activeTaskDetail.comments.map((comment) => (
                          <article className="tasks-console-feed-item" key={comment.id}>
                            <div className="tasks-console-feed-meta">
                              <strong>{comment.author.name}</strong>
                              <span>{formatDateTime(comment.createdAt)}</span>
                            </div>
                            <RichTextContent value={comment.body} />
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="tasks-console-rail-state tasks-console-rail-empty-state">
                        <strong>No comments yet</strong>
                        <p>Post the first update so the next person can see the current handoff context.</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {!detailLoading && activeTab === "activity" ? (
                  <div className="tasks-console-rail-panel">
                    {detailTimeline.length ? (
                      <div className="tasks-console-feed-list">
                        {detailTimeline.map((entry) => (
                          <article className="tasks-console-feed-item" key={entry.id}>
                            <div className="tasks-console-feed-meta">
                              <strong>{entry.actorName}</strong>
                              <span>{formatDateTime(entry.createdAt)}</span>
                            </div>
                            {entry.kind === "comment" ? <RichTextContent value={entry.body} /> : <p>{entry.body}</p>}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="tasks-console-rail-state tasks-console-rail-empty-state">
                        <strong>No activity yet</strong>
                        <p>Status changes, comments, checklist progress, and assignment updates will appear here.</p>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="tasks-console-rail-actions">
                  <Link className="pill pill-primary" href={createTaskDetailHref(selectedBoardTask.id, consoleReturnHref)}>
                    Open Workbench
                  </Link>
                  {canStartSelectedTask ? (
                    <button className="pill pill-primary" disabled={isAcquisitionPending} onClick={() => handleTaskAcquisition(selectedBoardTask.id, "START")} type="button">Start Work</button>
                  ) : selectedAcquisitionDecision?.policy === "DIRECT_CLAIM" ? (
                    <button className="pill pill-secondary" disabled={isAcquisitionPending} onClick={() => handleTaskAcquisition(selectedBoardTask.id, "CLAIM")} title={selectedAcquisitionDecision.explanation} type="button">Claim Task</button>
                  ) : selectedAcquisitionDecision?.policy === "APPROVAL_REQUIRED" || selectedAcquisitionDecision?.policy === "MANAGER_ASSIGN_ONLY" ? (
                    <button className="pill pill-secondary" disabled={isAcquisitionPending} onClick={() => handleTaskAcquisition(selectedBoardTask.id, "REQUEST")} title={selectedAcquisitionDecision.explanation} type="button">Request Task</button>
                  ) : null}
                  {isManager ? (
                    <form
                      className="tasks-console-reassign-form"
                      key={`assign-${activeTaskDetail?.id ?? selectedBoardTask.id}-${activeTaskDetail?.assignedUser.id ?? getTaskOwnerId(selectedBoardTask)}`}
                      onSubmit={handleReassignTask}
                    >
                      <select
                        defaultValue={activeTaskDetail?.assignedUser.id ?? getTaskOwnerId(selectedBoardTask)}
                        disabled={isWorkflowPending}
                        name="assignedUserId"
                      >
                        {assigneeOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <button className="pill pill-secondary" disabled={isWorkflowPending} type="submit">
                        Reassign
                      </button>
                    </form>
                  ) : null}
                  <button
                    className="pill pill-primary"
                    disabled={isWorkflowPending}
                    onClick={() => setActiveTab("details")}
                    type="button"
                  >
                    Update Status
                  </button>
                </div>
              </>
              )
            ) : (
              <div className="tasks-console-rail-state">
                <p>Select a task to inspect details, comments, activity, and execution progress.</p>
              </div>
            )}
          </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}
