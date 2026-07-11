"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus, WorkflowArea } from "@prisma/client";
import {
  BellRing,
  CheckCheck,
  Clock3,
  CircleAlert,
  FileText,
  Info,
  LayoutGrid,
  List,
  MoreHorizontal,
  Search,
  ShieldAlert,
  Star,
} from "lucide-react";
import { useState, useTransition } from "react";

import { EmptyStateCard, ErrorStateCard } from "@/components/ui/state-card";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  filterMyTasks,
  getAllowedMyTaskStatuses,
  hasMissingRequiredUpdate,
  isTaskDueSoon,
  isTaskOverdue,
  getMyTasksFilterOptions,
  getPrimaryMyTaskStatusActions,
  getTaskActionLabel,
  needsManagerDecision,
  type MyTasksFilter
} from "@/features/tasks/my-tasks-helpers";
import type { BoardReadTask } from "@/server/services/board-read";

type MyTasksScreenProps = {
  boardDate: string;
  boardExists: boolean;
  currentUserId: string;
  fullBoardHref: string;
  generatedAt: string | null;
  generationStatus: string | null;
  initialTasks: BoardReadTask[];
  isManager: boolean;
  nowIso: string;
  userName: string;
  errorMessage?: string | null;
};

type DisplayMode = "list" | "cards";
type InspectorTab = "Overview" | "Checklist" | "Updates" | "Attachments" | "History" | "Dependencies";
type TaskOverride = {
  blockerReason: string | null;
  status: TaskStatus;
  updateFieldValues: Record<string, string | boolean>;
};
type StatusUpdatePayload = {
  status: TaskStatus;
  blockerReason?: string;
  updateFields?: Record<string, string | boolean>;
};
type GuidedUpdateField = BoardReadTask["requiredUpdateFields"][number];
type SelfCreateTaskForm = {
  customerReference: string;
  description: string;
  dueTime: string;
  title: string;
  vehicleReference: string;
  workflowArea: WorkflowArea;
};

const selfCreateWorkflowAreas: WorkflowArea[] = [
  WorkflowArea.INVENTORY,
  WorkflowArea.SHOP,
  WorkflowArea.SALES,
  WorkflowArea.ADVERTISING,
  WorkflowArea.MARKETING,
  WorkflowArea.ADMIN,
  WorkflowArea.COLLECTIONS,
  WorkflowArea.GENERAL_MANAGER
];

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function createInitialSelfCreateTaskForm(): SelfCreateTaskForm {
  return {
    customerReference: "",
    description: "",
    dueTime: "09:00",
    title: "",
    vehicleReference: "",
    workflowArea: WorkflowArea.SALES
  };
}

function buildSelfCreateDueAt(boardDate: string, dueTime: string) {
  return `${boardDate}T${dueTime}:00`;
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDueTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getStatusTone(status: string) {
  if (status === TaskStatus.BLOCKED) {
    return "enterprise-status-chip enterprise-status-chip-danger";
  }

  if (status === TaskStatus.WAITING_ON_PARTS || status === TaskStatus.WAITING_ON_APPROVAL) {
    return "enterprise-status-chip enterprise-status-chip-warning";
  }

  if (status === TaskStatus.READY_FOR_REVIEW) {
    return "enterprise-status-chip enterprise-status-chip-review";
  }

  if (status === TaskStatus.COMPLETED) {
    return "enterprise-status-chip enterprise-status-chip-success";
  }

  if (status === TaskStatus.NOT_STARTED) {
    return "enterprise-status-chip enterprise-status-chip-neutral";
  }

  return "enterprise-status-chip enterprise-status-chip-default";
}

function getCommandActionTone(status: TaskStatus) {
  if (status === TaskStatus.BLOCKED) {
    return "my-task-action-chip my-task-action-chip-danger";
  }

  if (status === TaskStatus.WAITING_ON_PARTS || status === TaskStatus.WAITING_ON_APPROVAL) {
    return "my-task-action-chip my-task-action-chip-warning";
  }

  if (status === TaskStatus.READY_FOR_REVIEW) {
    return "my-task-action-chip my-task-action-chip-review";
  }

  if (status === TaskStatus.COMPLETED) {
    return "my-task-action-chip my-task-action-chip-success";
  }

  return "my-task-action-chip my-task-action-chip-brand";
}

function getUrgencyTone(task: BoardReadTask, now: Date) {
  const minutesUntilDue = Math.round((new Date(task.dueAt).getTime() - now.getTime()) / 60000);

  if (
    task.status === TaskStatus.BLOCKED ||
    task.status === TaskStatus.WAITING_ON_APPROVAL ||
    task.status === TaskStatus.WAITING_ON_PARTS ||
    minutesUntilDue <= 120
  ) {
    return "enterprise-priority-chip enterprise-priority-chip-high";
  }

  return "enterprise-priority-chip enterprise-priority-chip-normal";
}

function getUrgencyLabel(task: BoardReadTask, now: Date) {
  const minutesUntilDue = Math.round((new Date(task.dueAt).getTime() - now.getTime()) / 60000);

  if (
    task.status === TaskStatus.BLOCKED ||
    task.status === TaskStatus.WAITING_ON_APPROVAL ||
    task.status === TaskStatus.WAITING_ON_PARTS ||
    minutesUntilDue <= 120
  ) {
    return "High";
  }

  return "Normal";
}

function getGenerationStatusTone(generationStatus: string | null) {
  if (generationStatus === "FAILED") {
    return "status-badge status-badge-danger";
  }

  if (generationStatus === "GENERATED") {
    return "status-badge status-badge-success";
  }

  return "status-badge status-badge-muted";
}

function getLiveStatusTone(isRefreshing: boolean) {
  return isRefreshing ? "status-badge status-badge-muted" : "status-badge status-badge-success";
}

function getDueCopy(dueAt: string, now: Date) {
  const minutesUntilDue = Math.round((new Date(dueAt).getTime() - now.getTime()) / 60000);

  if (minutesUntilDue < 0) {
    const overdueMinutes = Math.abs(minutesUntilDue);

    if (overdueMinutes < 60) {
      return `${overdueMinutes}m overdue`;
    }

    return `${Math.round(overdueMinutes / 60)}h overdue`;
  }

  if (minutesUntilDue < 60) {
    return `${minutesUntilDue}m left`;
  }

  return `${Math.round(minutesUntilDue / 60)}h left`;
}

function getTaskReference(task: BoardReadTask) {
  if (task.vehicleReference) {
    return `Vehicle: ${task.vehicleReference}`;
  }

  if (task.customerReference) {
    return `Customer: ${task.customerReference}`;
  }

  return "No linked vehicle or customer";
}

function getTaskSignal(task: BoardReadTask, now: Date) {
  if (hasMissingRequiredUpdate(task)) {
    return {
      body: "This task still needs its required update fields filled in before it can move cleanly to review or completion.",
      title: "Required update still missing",
      tone: "enterprise-overview-card-head-warning"
    };
  }

  if (task.status === TaskStatus.BLOCKED && task.blockerReason) {
    return {
      body: task.blockerReason,
      title: "Blocked work needs attention",
      tone: "enterprise-overview-card-head-danger"
    };
  }

  if (
    task.status === TaskStatus.WAITING_ON_PARTS ||
    task.status === TaskStatus.WAITING_ON_APPROVAL
  ) {
    return {
      body: "Waiting tasks should still carry a clear next step and owner-ready note.",
      title: "Waiting work should not stall quietly",
      tone: "enterprise-overview-card-head-warning"
    };
  }

  if (task.status === TaskStatus.READY_FOR_REVIEW) {
    return {
      body: needsManagerDecision(task)
        ? "This task is staged for a manager decision before final completion."
        : "This task is staged for the next review step before final close-out.",
      title: needsManagerDecision(task) ? "Needs manager decision" : "Ready for review",
      tone: "enterprise-overview-card-head-review"
    };
  }

  if (task.status === TaskStatus.COMPLETED) {
    return {
      body: "The work is complete. Use the activity trail or task detail page if you need final proof or notes.",
      title: "Completed work",
      tone: "enterprise-overview-card-head-success"
    };
  }

  if (isTaskOverdue(task, now)) {
    return {
      body: "This task is already overdue. Update it now so the next handoff reflects the real state of the work.",
      title: "Overdue",
      tone: "enterprise-overview-card-head-danger"
    };
  }

  if (isTaskDueSoon(task, now)) {
    return {
      body: `This task is due soon. Keep the update crisp so the next person can act without chasing context.`,
      title: "Due soon",
      tone: "enterprise-overview-card-head"
    };
  }

  return {
    body: "Keep status, blockers, and next action current so this task stays easy to scan from the queue.",
    title: "Operational signal",
    tone: "enterprise-overview-card-head-info"
  };
}

function getExpectedOutcome(task: BoardReadTask) {
  if (task.status === TaskStatus.READY_FOR_REVIEW) {
    return "Manager review can happen quickly because the task already carries enough context and a clear recommendation.";
  }

  if (task.status === TaskStatus.COMPLETED) {
    return "The work is clearly closed and recorded so nobody has to revisit the task for missing context.";
  }

  return "The task moves forward with a current status, the right owner, and enough context for the next handoff.";
}

function getCompletionCriteria(task: BoardReadTask) {
  const criteria = [
    "Current status is accurate",
    "Next action is clear",
    "Owner and due time are visible"
  ];

  if (task.requiresManagerApproval) {
    criteria.push("Manager review is triggered at the correct step");
  }

  if (task.vehicleReference || task.customerReference) {
    criteria.push("Linked vehicle or customer context is preserved");
  }

  return criteria;
}

function getActivityItems(task: BoardReadTask) {
  const activity = [
    {
      label: "Due",
      time: formatDateTime(task.dueAt),
      detail: `Task is currently ${formatStatusLabel(task.status)}.`
    }
  ];

  if (task.readyForReviewAt) {
    activity.push({
      label: "Review",
      time: formatDateTime(task.readyForReviewAt),
      detail: "Task was marked ready for manager review."
    });
  }

  if (task.completedAt) {
    activity.push({
      label: "Done",
      time: formatDateTime(task.completedAt),
      detail: "Task completion has been recorded."
    });
  }

  if (task.blockerReason) {
    activity.push({
      label: "Blocker",
      time: "Current",
      detail: task.blockerReason
    });
  }

  return activity;
}

function getBlockedQueue(tasks: BoardReadTask[]) {
  return tasks
    .filter(
      (task) =>
        task.status === TaskStatus.BLOCKED ||
        task.status === TaskStatus.WAITING_ON_PARTS ||
        task.status === TaskStatus.WAITING_ON_APPROVAL
    )
    .slice(0, 3);
}

function getLatestUpdate(task: BoardReadTask, now: Date) {
  if (task.blockerReason && task.status === TaskStatus.BLOCKED) {
    return {
      actor: task.assignedUser.name,
      detail: task.blockerReason,
      time: "Current blocker"
    };
  }

  if (task.readyForReviewAt) {
    return {
      actor: task.assignedUser.name,
      detail: "Task is staged for review with enough context for a manager decision.",
      time: formatDateTime(task.readyForReviewAt)
    };
  }

  return {
    actor: task.assignedUser.name,
    detail: `Task is currently ${formatStatusLabel(task.status)}.`,
    time: getDueCopy(task.dueAt, now)
  };
}

function statusNeedsGuidedUpdateFields(status: TaskStatus) {
  return status === TaskStatus.READY_FOR_REVIEW || status === TaskStatus.COMPLETED;
}

function isGuidedUpdateFieldComplete(field: GuidedUpdateField, value: string | boolean | undefined) {
  if (!field.required) {
    return true;
  }

  if (typeof value === "boolean") {
    return true;
  }

  return typeof value === "string" && value.trim().length > 0;
}

type TaskStatusEditorProps = {
  compact?: boolean;
  fullBoardHref: string;
  isManager: boolean;
  onTaskUpdated(taskId: string, update: TaskOverride): void;
  task: BoardReadTask;
};

function TaskStatusEditor({
  compact = false,
  fullBoardHref,
  isManager,
  onTaskUpdated,
  task
}: TaskStatusEditorProps) {
  const allowedStatuses = getAllowedMyTaskStatuses(task, isManager);
  const primaryStatusActions = getPrimaryMyTaskStatusActions(task, isManager);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [updateFieldValues, setUpdateFieldValues] = useState<Record<string, string | boolean>>(
    task.updateFieldValues ?? {}
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasStatusChoices = allowedStatuses.length > 0;
  const hasGuidedUpdateFields = task.requiredUpdateFields.length > 0;
  const needsBlockerReason = selectedStatus === TaskStatus.BLOCKED;
  const trimmedBlockerReason = blockerReason.trim();
  const missingRequiredUpdateFields = task.requiredUpdateFields.filter(
    (field) => field.required && !isGuidedUpdateFieldComplete(field, updateFieldValues[field.key])
  );
  const shouldHighlightGuidedUpdates =
    hasGuidedUpdateFields && statusNeedsGuidedUpdateFields(selectedStatus);
  const canSubmit =
    hasStatusChoices &&
    !isSubmitting &&
    (!needsBlockerReason || Boolean(trimmedBlockerReason)) &&
    (selectedStatus !== (task.status as TaskStatus) ||
      trimmedBlockerReason !== (task.blockerReason ?? "") ||
      JSON.stringify(updateFieldValues) !== JSON.stringify(task.updateFieldValues ?? {}));

  async function submitStatusUpdate(payload: StatusUpdatePayload) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as
        | {
            task?: {
              id: string;
              status: TaskStatus;
              blockerReason: string | null;
              updateFieldValues?: Record<string, string | boolean>;
            };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to update this task right now.");
        return;
      }

      setSelectedStatus(result.task.status);
      setBlockerReason(result.task.blockerReason ?? "");
      setUpdateFieldValues(result.task.updateFieldValues ?? updateFieldValues);
      onTaskUpdated(task.id, {
        status: result.task.status,
        blockerReason: result.task.blockerReason,
        updateFieldValues: result.task.updateFieldValues ?? updateFieldValues
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className={
        compact
          ? "enterprise-detail-card enterprise-required-update-card my-tasks-command-card my-tasks-command-card-compact"
          : "enterprise-detail-card enterprise-required-update-card"
      }
    >
      <div className="enterprise-card-heading">
        <h3>Task Command Center</h3>
        {compact ? <span>Live update</span> : null}
      </div>

      {primaryStatusActions.length > 0 ? (
        <div className="my-task-quick-actions" aria-label={`Quick status actions for ${task.title}`}>
          {primaryStatusActions.map((statusOption) => (
            <button
              className={
                statusOption.value === selectedStatus
                  ? `${getCommandActionTone(statusOption.value)} my-task-action-chip-active`
                  : getCommandActionTone(statusOption.value)
              }
              disabled={isSubmitting}
              key={statusOption.value}
              onClick={() => {
                setSelectedStatus(statusOption.value);
                setErrorMessage(null);

                if (statusOption.value !== TaskStatus.BLOCKED) {
                  void submitStatusUpdate({
                    status: statusOption.value,
                    ...(hasGuidedUpdateFields ? { updateFields: updateFieldValues } : {})
                  });
                }
              }}
              type="button"
            >
              {getTaskActionLabel(
                statusOption.value,
                task.status as TaskStatus,
                task.requiresManagerApproval
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="enterprise-form-grid enterprise-form-grid-mockup">
        <label className="field">
          <span>Next Status</span>
          <select
            disabled={isSubmitting || allowedStatuses.length === 0}
            value={selectedStatus}
            onChange={(event) => {
              setSelectedStatus(event.target.value as TaskStatus);
              setErrorMessage(null);
            }}
          >
            {allowedStatuses.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
        </label>

        {!compact ? (
          <label className="field">
            <span>Due Time</span>
            <input disabled value={formatDateTime(task.dueAt)} readOnly />
          </label>
        ) : null}

        {!compact ? (
          <label className="field">
            <span>Workflow</span>
            <input disabled value={formatStatusLabel(task.workflowArea)} readOnly />
          </label>
        ) : null}

        {hasGuidedUpdateFields ? (
          <div className="field enterprise-summary-span">
            <span>Required Update Fields</span>
            {shouldHighlightGuidedUpdates && missingRequiredUpdateFields.length > 0 ? (
              <small className="field-hint">
                Missing: {missingRequiredUpdateFields.map((field) => field.label).join(", ")}
              </small>
            ) : (
              <small className="field-hint">
                These details travel with the task so review and completion are easier downstream.
              </small>
            )}

            <div className="enterprise-guided-update-grid">
              {task.requiredUpdateFields.map((field) => {
                const value = updateFieldValues[field.key];

                if (field.type === "boolean") {
                  return (
                    <label className="field" key={field.key}>
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        disabled={isSubmitting}
                        value={typeof value === "boolean" ? String(value) : ""}
                        onChange={(event) => {
                          const nextValue = event.target.value;

                          setUpdateFieldValues((current) => ({
                            ...current,
                            [field.key]: nextValue === "true"
                          }));
                          setErrorMessage(null);
                        }}
                      >
                        <option value="">Select an option</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </label>
                  );
                }

                if (field.type === "single_select") {
                  return (
                    <label className="field" key={field.key}>
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        disabled={isSubmitting}
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) => {
                          setUpdateFieldValues((current) => ({
                            ...current,
                            [field.key]: event.target.value
                          }));
                          setErrorMessage(null);
                        }}
                      >
                        <option value="">Select an option</option>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (field.type === "long_text") {
                  return (
                    <label className="field" key={field.key}>
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <textarea
                        disabled={isSubmitting}
                        placeholder={field.helpText ?? undefined}
                        rows={4}
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) => {
                          setUpdateFieldValues((current) => ({
                            ...current,
                            [field.key]: event.target.value
                          }));
                          setErrorMessage(null);
                        }}
                      />
                    </label>
                  );
                }

                return (
                  <label className="field" key={field.key}>
                    <span>
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                    <input
                      disabled={isSubmitting}
                      placeholder={field.helpText ?? undefined}
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => {
                        setUpdateFieldValues((current) => ({
                          ...current,
                          [field.key]: event.target.value
                        }));
                        setErrorMessage(null);
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {needsBlockerReason ? (
          <label className="field enterprise-summary-span">
            <span>Blocker Reason</span>
            <textarea
              disabled={isSubmitting}
              placeholder="What is blocking this task?"
              rows={3}
              value={blockerReason}
              onChange={(event) => {
                setBlockerReason(event.target.value);
                setErrorMessage(null);
              }}
            />
          </label>
        ) : !compact ? (
          <label className="field enterprise-summary-span">
            <span>Task Context</span>
            <textarea disabled readOnly rows={3} value={task.description ?? getTaskReference(task)} />
          </label>
        ) : (
          <div className="my-tasks-command-note">
            <strong>Current context</strong>
            <p>{task.description ?? getTaskReference(task)}</p>
          </div>
        )}
      </div>

      {!compact ? (
        <div className="my-tasks-live-link-row">
          <Link className="pill pill-secondary" href={`/tasks/${task.id}`}>
            Open detail
          </Link>
          <Link className="pill pill-muted" href={`/tasks/${task.id}#task-updates`}>
            View updates
          </Link>
          <Link className="pill pill-muted" href={fullBoardHref}>
            Full board
          </Link>
        </div>
      ) : null}

      <button
        className="pill pill-primary enterprise-save-button"
        disabled={!canSubmit}
        onClick={() =>
          submitStatusUpdate({
            status: selectedStatus,
            ...(hasGuidedUpdateFields ? { updateFields: updateFieldValues } : {}),
            ...(selectedStatus === TaskStatus.BLOCKED ? { blockerReason: trimmedBlockerReason } : {})
          })
        }
        type="button"
      >
        {isSubmitting
          ? "Saving..."
          : compact
            ? "Save Update"
            : getTaskActionLabel(selectedStatus, task.status as TaskStatus, task.requiresManagerApproval)}
      </button>

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </section>
  );
}

export function MyTasksScreen({
  boardDate,
  boardExists,
  currentUserId,
  errorMessage,
  fullBoardHref,
  generatedAt,
  generationStatus,
  initialTasks,
  isManager,
  nowIso,
  userName
}: MyTasksScreenProps) {
  const router = useRouter();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<MyTasksFilter>("all");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("Overview");
  const [searchText, setSearchText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[0]?.id ?? "");
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskOverride>>({});
  const [selfCreateOpen, setSelfCreateOpen] = useState(false);
  const [selfCreateForm, setSelfCreateForm] = useState<SelfCreateTaskForm>(() =>
    createInitialSelfCreateTaskForm()
  );
  const [selfCreateError, setSelfCreateError] = useState<string | null>(null);
  const [selfCreateMessage, setSelfCreateMessage] = useState<string | null>(null);
  const [isSelfCreatePending, startSelfCreateTransition] = useTransition();
  const tasks = initialTasks.map((task) =>
    taskOverrides[task.id]
      ? {
          ...task,
          ...taskOverrides[task.id]
        }
      : task
  );
  const now = new Date(nowIso);
  const filterOptions = getMyTasksFilterOptions(tasks, now);
  const visibleTasks = filterMyTasks(tasks, activeFilter, now).filter((task) => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      task.title,
      task.description ?? "",
      task.assignedUser.name,
      formatStatusLabel(task.status),
      formatStatusLabel(task.workflowArea),
      task.vehicleReference ?? "",
      task.customerReference ?? ""
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null;
  const selectedTaskSignal = selectedTask ? getTaskSignal(selectedTask, now) : null;
  const blockedQueue = getBlockedQueue(tasks);
  const latestUpdate = selectedTask ? getLatestUpdate(selectedTask, now) : null;

  function refreshTasks() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  useLiveRefresh(() => {
    refreshTasks();
  });

  function handleTaskUpdated(taskId: string, update: TaskOverride) {
    setTaskOverrides((currentOverrides) => ({
      ...currentOverrides,
      [taskId]: update
    }));
  }

  function handleTaskSelect(taskId: string) {
    setSelectedTaskId(taskId);
    setInspectorTab("Overview");
  }

  function resetSelfCreateForm() {
    setSelfCreateForm(createInitialSelfCreateTaskForm());
  }

  function handleSelfCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelfCreateError(null);
    setSelfCreateMessage(null);

    const title = selfCreateForm.title.trim();

    if (!title) {
      setSelfCreateError("Task title is required.");
      return;
    }

    startSelfCreateTransition(async () => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            assignedUserId: currentUserId,
            boardDate,
            ...(selfCreateForm.customerReference.trim()
              ? { customerReference: selfCreateForm.customerReference.trim() }
              : {}),
            description: selfCreateForm.description.trim(),
            dueAt: buildSelfCreateDueAt(boardDate, selfCreateForm.dueTime),
            requiresManagerApproval: false,
            status: TaskStatus.NOT_STARTED,
            title,
            ...(selfCreateForm.vehicleReference.trim()
              ? { vehicleReference: selfCreateForm.vehicleReference.trim() }
              : {}),
            workflowArea: selfCreateForm.workflowArea
          })
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              task?: {
                id: string;
                title: string;
              };
              error?: string;
            }
          | null;

        if (!response.ok || !payload?.task) {
          setSelfCreateError(payload?.error ?? "Unable to create this task right now.");
          return;
        }

        setSelfCreateMessage(`${payload.task.title} was added to your work.`);
        resetSelfCreateForm();
        setSelfCreateOpen(false);
        refreshTasks();
      } catch (error) {
        setSelfCreateError(error instanceof Error ? error.message : "Unable to create this task right now.");
      }
    });
  }

  return (
    <section className="page-stack dashboard-page enterprise-prototype-page my-tasks-live-page">
      <div className="dashboard-page-header enterprise-prototype-header">
        <div className="dashboard-page-copy">
          <h1>My Tasks</h1>
          <p>My Work queue for today: assigned tasks, self-created work, and live status updates.</p>
          <div className="board-page-meta my-tasks-header-meta">
            <span className={getGenerationStatusTone(generationStatus)}>
              {generationStatus ? formatStatusLabel(generationStatus) : "Board not generated"}
            </span>
            <span className={getLiveStatusTone(isRefreshPending)}>
              {isRefreshPending ? "Updating..." : "Live"}
            </span>
            <span className="board-chip board-chip-muted">{userName}</span>
          </div>
          {generatedAt ? (
            <p className="my-tasks-generated-copy">Board generated {formatDateTime(generatedAt)}.</p>
          ) : null}
        </div>

        <div className="board-toolbar my-tasks-toolbar">
          <div className="board-toolbar-actions">
            <button
              className="pill pill-primary"
              onClick={() => {
                setSelfCreateError(null);
                setSelfCreateMessage(null);
                setSelfCreateOpen((current) => !current);
              }}
              type="button"
            >
              {selfCreateOpen ? "Close Create" : "Create My Task"}
            </button>
            <Link className="pill pill-primary" href={fullBoardHref}>
              Open full board
            </Link>
            <button className="pill pill-secondary" onClick={refreshTasks} type="button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {selfCreateOpen ? (
        <section className="enterprise-detail-card my-tasks-self-create-card" aria-label="Create my task">
          <div className="enterprise-card-heading">
            <h2>Create my task</h2>
            <span>Self-assigned work for {formatBoardDateLabel(boardDate)}</span>
          </div>
          <form className="enterprise-form-grid enterprise-form-grid-mockup" onSubmit={handleSelfCreateTask}>
            <label className="field enterprise-summary-span">
              <span>Task title</span>
              <input
                name="title"
                placeholder="Example: Follow up with customer"
                required
                value={selfCreateForm.title}
                onChange={(event) =>
                  setSelfCreateForm((current) => ({
                    ...current,
                    title: event.target.value
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Due time</span>
              <input
                name="dueTime"
                required
                type="time"
                value={selfCreateForm.dueTime}
                onChange={(event) =>
                  setSelfCreateForm((current) => ({
                    ...current,
                    dueTime: event.target.value
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Workflow area</span>
              <select
                name="workflowArea"
                value={selfCreateForm.workflowArea}
                onChange={(event) =>
                  setSelfCreateForm((current) => ({
                    ...current,
                    workflowArea: event.target.value as WorkflowArea
                  }))
                }
              >
                {selfCreateWorkflowAreas.map((workflowArea) => (
                  <option key={workflowArea} value={workflowArea}>
                    {formatStatusLabel(workflowArea)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Vehicle / stock</span>
              <input
                name="vehicleReference"
                placeholder="Optional vehicle reference"
                value={selfCreateForm.vehicleReference}
                onChange={(event) =>
                  setSelfCreateForm((current) => ({
                    ...current,
                    vehicleReference: event.target.value
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Customer</span>
              <input
                name="customerReference"
                placeholder="Optional customer reference"
                value={selfCreateForm.customerReference}
                onChange={(event) =>
                  setSelfCreateForm((current) => ({
                    ...current,
                    customerReference: event.target.value
                  }))
                }
              />
            </label>
            <label className="field enterprise-summary-span">
              <span>Notes</span>
              <textarea
                name="description"
                placeholder="Short note for your own task..."
                rows={2}
                value={selfCreateForm.description}
                onChange={(event) =>
                  setSelfCreateForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
              />
            </label>
            <div className="my-tasks-live-link-row enterprise-summary-span">
              <button className="pill pill-primary" disabled={isSelfCreatePending} type="submit">
                {isSelfCreatePending ? "Creating..." : "Add To My Tasks"}
              </button>
              <button
                className="pill pill-secondary"
                disabled={isSelfCreatePending}
                onClick={() => {
                  resetSelfCreateForm();
                  setSelfCreateOpen(false);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
          {selfCreateError ? (
            <div className="notice notice-danger my-task-inline-notice" role="alert">
              <p>{selfCreateError}</p>
            </div>
          ) : null}
          {selfCreateMessage ? (
            <div className="notice notice-success my-task-inline-notice">
              <p>{selfCreateMessage}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {errorMessage ? (
        <ErrorStateCard
          actions={[{ label: "Refresh", onClick: refreshTasks }]}
          eyebrow="My Tasks unavailable"
          message={`${errorMessage} Your previous work may still be saved.`}
          title="Couldn't load your task list"
        />
      ) : null}

      {!errorMessage && !boardExists ? (
        <EmptyStateCard
          actions={[{ href: fullBoardHref, label: "Open full board", tone: "secondary" }]}
          eyebrow="No board yet"
          message="Once the board exists, your assigned tasks will appear here automatically."
          title="Today's board has not been generated"
        />
      ) : null}

      {!errorMessage && boardExists && tasks.length === 0 ? (
        <EmptyStateCard
          actions={[{ href: fullBoardHref, label: "Check full board" }]}
          eyebrow="All clear"
          message="Check the full board if you need broader context or want to confirm whether work was reassigned."
          title="No tasks are assigned to you right now"
        />
      ) : null}

      {!errorMessage && boardExists && tasks.length > 0 ? (
        <section className="enterprise-prototype-stage my-tasks-live-stage">
          <div className="enterprise-stage-controls">
            <div className="my-tasks-control-cluster">
              <span className="board-page-date-pill">{formatBoardDateLabel(boardDate)}</span>
              <div className="enterprise-filter-row" aria-label="My task filters">
                {filterOptions.map((filterOption) => (
                  <button
                    key={filterOption.value}
                    className={
                      filterOption.value === activeFilter
                        ? "enterprise-filter-chip enterprise-filter-chip-active"
                        : "enterprise-filter-chip"
                    }
                    onClick={() => setActiveFilter(filterOption.value)}
                    type="button"
                  >
                    {filterOption.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="enterprise-display-toggle" aria-label="Task list display mode">
              <button
                className={
                  displayMode === "list"
                    ? "enterprise-display-toggle-button enterprise-display-toggle-button-active"
                    : "enterprise-display-toggle-button"
                }
                onClick={() => setDisplayMode("list")}
                type="button"
              >
                <List size={15} />
                List
              </button>
              <button
                className={
                  displayMode === "cards"
                    ? "enterprise-display-toggle-button enterprise-display-toggle-button-active"
                    : "enterprise-display-toggle-button"
                }
                onClick={() => setDisplayMode("cards")}
                type="button"
              >
                <LayoutGrid size={15} />
                Cards
              </button>
            </div>
          </div>

          <div className="enterprise-shell enterprise-shell-mockup my-tasks-live-shell">
            <section className="enterprise-task-list-panel enterprise-task-list-panel-mockup">
              <div className="enterprise-list-toolbar my-tasks-queue-toolbar">
                <div className="my-tasks-queue-title">
                  <strong>Task Queue</strong>
                  <span className="board-chip board-chip-muted">{visibleTasks.length}</span>
                </div>
                <button className="enterprise-menu-button" type="button" aria-label="More list options">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <label className="my-tasks-queue-search">
                <Search size={16} />
                <input
                  aria-label="Search tasks"
                  placeholder="Search tasks..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>

              <div
                className={
                  displayMode === "cards"
                    ? "enterprise-card-list enterprise-card-list-mockup"
                    : "enterprise-card-list enterprise-card-list-mockup enterprise-card-list-compact"
                }
              >
                {visibleTasks.length === 0 ? (
                  <div className="enterprise-list-empty-state">
                    <strong>No tasks in this filter</strong>
                    <p>Try a different filter to bring matching work back into the queue.</p>
                  </div>
                ) : (
                  visibleTasks.map((task) => {
                    const isSelected = task.id === selectedTask?.id;

                    if (displayMode === "list") {
                      return (
                        <article
                          className={isSelected ? "enterprise-list-row enterprise-list-row-selected" : "enterprise-list-row"}
                          key={task.id}
                        >
                          <button className="enterprise-list-row-hit" onClick={() => handleTaskSelect(task.id)} type="button">
                            <div className="enterprise-list-row-top">
                              <span className={getUrgencyTone(task, now)}>{getUrgencyLabel(task, now)}</span>
                              <span className="enterprise-list-row-due">{formatDueTime(task.dueAt)}</span>
                            </div>
                            <div className="enterprise-list-row-main">
                              <div className="enterprise-list-row-copy">
                                <h3>{task.title}</h3>
                                <p>{task.description ?? "Keep this task moving with a clear update and next step."}</p>
                              </div>
                              <span className={getStatusTone(task.status)}>{formatStatusLabel(task.status)}</span>
                            </div>
                            <div className="enterprise-list-row-meta">
                              <span>{task.assignedUser.name}</span>
                              <span>{formatStatusLabel(task.workflowArea)}</span>
                            </div>
                          </button>
                          <div className="enterprise-list-row-actions">
                            <Link className="pill pill-primary" href={`/tasks/${task.id}`}>
                              Open Workspace
                            </Link>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article
                        className={isSelected ? "enterprise-task-card enterprise-task-card-selected" : "enterprise-task-card"}
                        key={task.id}
                      >
                        <button className="enterprise-task-card-hit" onClick={() => handleTaskSelect(task.id)} type="button">
                          <div className="enterprise-task-topline">
                            <div className="enterprise-card-labels">
                              <span className={getUrgencyTone(task, now)}>{getUrgencyLabel(task, now)}</span>
                            </div>
                            <span className="enterprise-due-copy">
                              <Clock3 size={14} />
                              {formatDueTime(task.dueAt)}
                            </span>
                          </div>

                          <div className="enterprise-task-copy">
                            <h3>{task.title}</h3>
                            <p>{task.description ?? getTaskReference(task)}</p>
                          </div>

                          <div className="enterprise-card-facts">
                            <span>{task.assignedUser.name}</span>
                            <span>{formatStatusLabel(task.workflowArea)}</span>
                          </div>

                          <div className="enterprise-task-actions enterprise-task-actions-mockup">
                            <span className={getStatusTone(task.status)}>{formatStatusLabel(task.status)}</span>
                          </div>
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <aside className="enterprise-inspector enterprise-inspector-mockup my-tasks-optimized-stage">
              {selectedTask ? (
                <>
                  <div className="enterprise-inspector-header enterprise-inspector-header-mockup my-tasks-optimized-header">
                    <div className="enterprise-inspector-title enterprise-inspector-title-mockup my-tasks-optimized-header-grid">
                      <div className="my-tasks-optimized-header-copy">
                        <div className="enterprise-title-row">
                          <Star size={18} className="enterprise-title-star" />
                          <h2>{selectedTask.title}</h2>
                        </div>
                        <div className="my-tasks-optimized-summary">
                          <span className={getStatusTone(selectedTask.status)}>{formatStatusLabel(selectedTask.status)}</span>
                          <span>Due: {formatDateTime(selectedTask.dueAt)}</span>
                          <span>Owner: {selectedTask.assignedUser.name}</span>
                          <span>Workflow: {formatStatusLabel(selectedTask.workflowArea)}</span>
                          <span>Source: {formatStatusLabel(selectedTask.sourceType)}</span>
                        </div>
                      </div>
                      <div className="my-tasks-optimized-actions">
                        <Link className="pill pill-primary" href={`/tasks/${selectedTask.id}`}>
                          Open Workspace
                        </Link>
                        <button className="pill pill-secondary" onClick={() => setInspectorTab("Updates")} type="button">
                          View Updates
                        </button>
                        <Link className="pill pill-secondary" href={fullBoardHref}>
                          Full Board
                        </Link>
                        <Link className="pill pill-secondary" href={`/tasks/${selectedTask.id}`}>
                          More
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="enterprise-tab-row enterprise-tab-row-mockup my-tasks-optimized-tabs" aria-label="Task inspector tabs">
                    {(["Overview", "Checklist", "Updates", "Attachments", "History", "Dependencies"] as InspectorTab[]).map((tab) => (
                      <button
                        key={tab}
                        className={tab === inspectorTab ? "enterprise-tab enterprise-tab-active" : "enterprise-tab"}
                        onClick={() => setInspectorTab(tab)}
                        type="button"
                      >
                        {tab}
                        {tab === "Checklist" ? <span className="my-tasks-tab-count">{getCompletionCriteria(selectedTask).length}</span> : null}
                        {tab === "Updates" ? <span className="my-tasks-tab-count">{getActivityItems(selectedTask).length}</span> : null}
                        {tab === "Attachments" ? <span className="my-tasks-tab-count">1</span> : null}
                      </button>
                    ))}
                  </div>

                  <div className="my-tasks-optimized-content">
                    <div className="my-tasks-optimized-main">
                      {inspectorTab === "Overview" ? (
                        <div className="my-tasks-overview-grid">
                          <article className="enterprise-overview-card my-tasks-overview-card-feature">
                            <div className="enterprise-overview-card-head">
                              <CircleAlert size={18} />
                              <h3>What is Expected</h3>
                            </div>
                            <p>
                              {selectedTask.description ??
                                "Move this task forward by keeping the status current, logging blockers clearly, and handing off enough context for the next step."}
                            </p>
                          </article>

                          <article className="enterprise-overview-card">
                            <div className="enterprise-overview-card-head enterprise-overview-card-head-success">
                              <CheckCheck size={18} />
                              <h3>Expected Outcome</h3>
                            </div>
                            <p>{getExpectedOutcome(selectedTask)}</p>
                          </article>

                          <article className="enterprise-overview-card">
                            <div className={`enterprise-overview-card-head ${selectedTaskSignal?.tone ?? ""}`}>
                              <Info size={18} />
                              <h3>Latest Update</h3>
                            </div>
                            <p><strong>{latestUpdate?.actor}</strong></p>
                            <p>{latestUpdate?.detail}</p>
                            <p>{latestUpdate?.time}</p>
                          </article>

                          <article className="enterprise-overview-card my-tasks-overview-card-wide">
                            <div className="enterprise-overview-card-head enterprise-overview-card-head-info">
                              <BellRing size={18} />
                              <h3>Recent Activity</h3>
                            </div>
                            <ul className="enterprise-activity-preview-list">
                              {getActivityItems(selectedTask).slice(0, 2).map((item, index) => (
                                <li key={`${item.label}-${index}`}>
                                  <span className={`enterprise-activity-dot enterprise-activity-dot-${Math.min(index + 1, 3)}`} />
                                  <span>{item.time}</span>
                                  <p>{item.detail}</p>
                                </li>
                              ))}
                            </ul>
                            <Link className="pill pill-secondary my-tasks-inline-link" href={`/tasks/${selectedTask.id}#task-updates`}>
                              View full activity
                            </Link>
                          </article>
                        </div>
                      ) : null}

                      {inspectorTab === "Checklist" ? (
                        <article className="enterprise-overview-card">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-review">
                            <FileText size={18} />
                            <h3>Checklist</h3>
                          </div>
                          <ul>
                            {getCompletionCriteria(selectedTask).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </article>
                      ) : null}

                      {inspectorTab === "Updates" ? (
                        <article className="enterprise-overview-card">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-info">
                            <BellRing size={18} />
                            <h3>Updates</h3>
                          </div>
                          <ul className="enterprise-activity-preview-list">
                            {getActivityItems(selectedTask).map((item, index) => (
                              <li key={`${item.label}-${index}`}>
                                <span className={`enterprise-activity-dot enterprise-activity-dot-${Math.min(index + 1, 3)}`} />
                                <span>{item.time}</span>
                                <p>{item.detail}</p>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ) : null}

                      {inspectorTab === "Attachments" ? (
                        <article className="enterprise-overview-card">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-review">
                            <FileText size={18} />
                            <h3>Attachments</h3>
                          </div>
                          <p>Attachment persistence is not available yet in the current backend, so this stays as a placeholder on the main page.</p>
                        </article>
                      ) : null}

                      {inspectorTab === "History" ? (
                        <article className="enterprise-overview-card">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-review">
                            <Clock3 size={18} />
                            <h3>History</h3>
                          </div>
                          <ul className="enterprise-timeline">
                            {getActivityItems(selectedTask).map((item, index) => (
                              <li key={`${item.label}-${index}`}>
                                <span className="enterprise-timeline-dot" aria-hidden="true" />
                                <div>
                                  <strong>{item.label}</strong>
                                  <p>{item.time} - {item.detail}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ) : null}

                      {inspectorTab === "Dependencies" ? (
                        <article className="enterprise-overview-card">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-warning">
                            <ShieldAlert size={18} />
                            <h3>Dependencies</h3>
                          </div>
                          <div className="enterprise-blocked-queue">
                            {blockedQueue.length > 0 ? (
                              blockedQueue.map((task) => (
                                <div className="enterprise-blocked-queue-item" key={task.id}>
                                  <span>{task.title}</span>
                                  <strong>{formatStatusLabel(task.status)}</strong>
                                </div>
                              ))
                            ) : (
                              <div className="enterprise-blocked-queue-item">
                                <span>No blocked or waiting tasks are assigned to you right now.</span>
                                <strong>Clear</strong>
                              </div>
                            )}
                          </div>
                        </article>
                      ) : null}
                    </div>

                    <aside className="my-tasks-command-center">
                      <TaskStatusEditor
                        compact
                        fullBoardHref={fullBoardHref}
                        isManager={isManager}
                        key={`${selectedTask.id}:${selectedTask.status}:${selectedTask.blockerReason ?? ""}`}
                        onTaskUpdated={handleTaskUpdated}
                        task={selectedTask}
                      />

                      <section className="enterprise-detail-card enterprise-side-card my-tasks-info-card">
                        <div className="enterprise-card-heading">
                          <Info size={18} />
                          <h3>Task Information</h3>
                        </div>
                        <dl className="enterprise-information-list">
                          <div><dt>Due Time</dt><dd>{formatDateTime(selectedTask.dueAt)}</dd></div>
                          <div><dt>Assigned To</dt><dd>{selectedTask.assignedUser.name}</dd></div>
                          <div><dt>Requires Review</dt><dd>{selectedTask.requiresManagerApproval ? "Yes" : "No"}</dd></div>
                          <div><dt>Last Update</dt><dd>{latestUpdate?.time ?? "No recent update"}</dd></div>
                          <div><dt>Created</dt><dd>{formatDateTime(selectedTask.dueAt)}</dd></div>
                        </dl>
                      </section>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="enterprise-overview-board my-tasks-live-empty-inspector">
                  <strong>No task selected</strong>
                  <p>Choose a filter with matching tasks to bring the inspector back into view.</p>
                </div>
              )}
            </aside>
          </div>
        </section>
      ) : null}
    </section>
  );
}
