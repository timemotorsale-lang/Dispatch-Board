"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import {
  BellRing,
  CheckCheck,
  Clock3,
  CircleAlert,
  CircleHelp,
  Expand,
  FileText,
  Info,
  LayoutGrid,
  List,
  MoreHorizontal,
  ShieldAlert,
  Star,
  X
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
type InspectorTab = "Overview" | "Update Form" | "Activity" | "Manager";
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

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
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

function getTaskSummaryFacts(task: BoardReadTask, now: Date) {
  return [
    formatStatusLabel(task.workflowArea),
    getDueCopy(task.dueAt, now),
    task.requiresManagerApproval ? "Manager review required" : "Staff-owned update"
  ];
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

function getManagerGuidance(task: BoardReadTask) {
  if (task.requiresManagerApproval) {
    return [
      "Use Ready for Review when the work is complete but still needs a manager decision.",
      "Managers can send the task back to In Progress if more context is required."
    ];
  }

  return [
    "Use blocked or waiting states only when the next move truly depends on something external.",
    "Keep the task detail page updated so later handoffs remain clear."
  ];
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
  fullBoardHref: string;
  isManager: boolean;
  onTaskUpdated(taskId: string, update: TaskOverride): void;
  task: BoardReadTask;
};

function TaskStatusEditor({
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
    <section className="enterprise-detail-card enterprise-required-update-card">
      <div className="enterprise-card-heading">
        <h3>Required Update</h3>
      </div>

      {primaryStatusActions.length > 0 ? (
        <div className="my-task-quick-actions" aria-label={`Quick status actions for ${task.title}`}>
          {primaryStatusActions.map((statusOption) => (
            <button
              className={
                statusOption.value === selectedStatus
                  ? "my-task-action-chip my-task-action-chip-active"
                  : "my-task-action-chip"
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

        <label className="field">
          <span>Due Time</span>
          <input disabled value={formatDateTime(task.dueAt)} readOnly />
        </label>

        <label className="field">
          <span>Workflow</span>
          <input disabled value={formatStatusLabel(task.workflowArea)} readOnly />
        </label>

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
        ) : (
          <label className="field enterprise-summary-span">
            <span>Task Context</span>
            <textarea disabled readOnly rows={3} value={task.description ?? getTaskReference(task)} />
          </label>
        )}
      </div>

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
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[0]?.id ?? "");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskOverride>>({});
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
  const visibleTasks = filterMyTasks(tasks, activeFilter, now);
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null;
  const selectedTaskSignal = selectedTask ? getTaskSignal(selectedTask, now) : null;
  const selectedTaskFacts = selectedTask ? getTaskSummaryFacts(selectedTask, now) : [];
  const blockedQueue = getBlockedQueue(tasks);

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

  return (
    <section className="page-stack dashboard-page enterprise-prototype-page my-tasks-live-page">
      <div className="dashboard-page-header enterprise-prototype-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Staff task view</span>
          <h1>My Tasks</h1>
          <p>
            {userName}, this is your real task workspace for {formatBoardDateLabel(boardDate)}.
            Use the left queue for speed, the right inspector for context, and open the workspace when you need a deeper pass.
          </p>
          <div className="board-page-meta">
            <span className="board-page-date-pill">{formatBoardDateLabel(boardDate)}</span>
            <span className={getGenerationStatusTone(generationStatus)}>
              {generationStatus ? formatStatusLabel(generationStatus) : "Board not generated"}
            </span>
            <span className={getLiveStatusTone(isRefreshPending)}>
              {isRefreshPending ? "Updating..." : "Live"}
            </span>
          </div>
          {generatedAt ? (
            <p className="my-tasks-generated-copy">Board generated {formatDateTime(generatedAt)}.</p>
          ) : null}
        </div>

        <div className="board-toolbar my-tasks-toolbar">
          <div className="board-toolbar-actions">
            <Link className="pill pill-primary" href={fullBoardHref}>
              Open full board
            </Link>
            <button className="pill pill-secondary" onClick={refreshTasks} type="button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <ErrorStateCard
          actions={[{ label: "Refresh", onClick: refreshTasks }]}
          eyebrow="My Tasks unavailable"
          message={`${errorMessage} Your previous work may still be saved.`}
          title="Couldn't load your task list"
        />
      ) : null}

      {!boardExists ? (
        <EmptyStateCard
          actions={[{ href: fullBoardHref, label: "Open full board", tone: "secondary" }]}
          eyebrow="No board yet"
          message="Once the board exists, your assigned tasks will appear here automatically."
          title="Today's board has not been generated"
        />
      ) : null}

      {boardExists && tasks.length === 0 ? (
        <EmptyStateCard
          actions={[{ href: fullBoardHref, label: "Check full board" }]}
          eyebrow="All clear"
          message="Check the full board if you need broader context or want to confirm whether work was reassigned."
          title="No tasks are assigned to you right now"
        />
      ) : null}

      {boardExists && tasks.length > 0 ? (
        <section className="enterprise-prototype-stage my-tasks-live-stage">
          <div className="enterprise-stage-controls">
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
              <div className="enterprise-list-toolbar">
                <button className="enterprise-sort-button" type="button">
                  <Clock3 size={14} />
                  Sort by: Due Time
                </button>
                <span className="my-tasks-live-list-stat">
                  {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}
                </span>
                <button className="enterprise-menu-button" type="button" aria-label="More list options">
                  <MoreHorizontal size={18} />
                </button>
              </div>

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
                    const facts = getTaskSummaryFacts(task, now);

                    if (displayMode === "list") {
                      return (
                        <article
                          className={isSelected ? "enterprise-list-row enterprise-list-row-selected" : "enterprise-list-row"}
                          key={task.id}
                        >
                          <button className="enterprise-list-row-hit" onClick={() => handleTaskSelect(task.id)} type="button">
                            <div className="enterprise-list-row-top">
                              <span className={getUrgencyTone(task, now)}>{getUrgencyLabel(task, now)}</span>
                              <span className="enterprise-role-copy">{formatStatusLabel(task.workflowArea)}</span>
                              <span className="enterprise-list-row-due">{formatDueTime(task.dueAt)}</span>
                            </div>
                            <div className="enterprise-list-row-main">
                              <div className="enterprise-list-row-copy">
                                <h3>{task.title}</h3>
                                <p>{task.description ?? getTaskReference(task)}</p>
                              </div>
                              <span className={getStatusTone(task.status)}>{formatStatusLabel(task.status)}</span>
                            </div>
                            <div className="enterprise-list-row-meta">
                              <span>{facts[0]}</span>
                              <span>{facts[1]}</span>
                              <span>{facts[2]}</span>
                            </div>
                          </button>
                          <div className="enterprise-list-row-actions">
                            <button
                              className="pill pill-primary"
                              onClick={() => {
                                handleTaskSelect(task.id);
                                setInspectorTab("Update Form");
                              }}
                              type="button"
                            >
                              Update
                            </button>
                            <Link className="pill pill-secondary" href={`/tasks/${task.id}`}>
                              Detail
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
                              <span className="enterprise-role-copy">{formatStatusLabel(task.workflowArea)}</span>
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
                            <span>{facts[0]}</span>
                            <span>{facts[1]}</span>
                          </div>

                          {task.blockerReason && task.status === TaskStatus.BLOCKED ? (
                            <div className="enterprise-warning-row">
                              <CircleAlert size={14} />
                              <span>{task.blockerReason}</span>
                            </div>
                          ) : null}

                          <div className="enterprise-task-actions">
                            <span className="pill pill-primary">Inspect</span>
                            <span className="pill pill-secondary">Detail</span>
                            <span className={getStatusTone(task.status)}>{formatStatusLabel(task.status)}</span>
                          </div>
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <aside className="enterprise-inspector enterprise-inspector-mockup">
              {selectedTask ? (
                <>
                  <div className="enterprise-inspector-header enterprise-inspector-header-mockup">
                    <div className="enterprise-inspector-title enterprise-inspector-title-mockup">
                      <div className="enterprise-title-row">
                        <Star size={18} className="enterprise-title-star" />
                        <h2>{selectedTask.title}</h2>
                      </div>
                      <div className="enterprise-summary-grid-detail enterprise-summary-grid-detail-mockup">
                        <div>
                          <dt>Status</dt>
                          <dd><span className={getStatusTone(selectedTask.status)}>{formatStatusLabel(selectedTask.status)}</span></dd>
                        </div>
                        <div>
                          <dt>Workflow</dt>
                          <dd>{formatStatusLabel(selectedTask.workflowArea)}</dd>
                        </div>
                        <div>
                          <dt>Assigned To</dt>
                          <dd>{selectedTask.assignedUser.name}</dd>
                        </div>
                        <div>
                          <dt>Due</dt>
                          <dd>{formatDateTime(selectedTask.dueAt)}</dd>
                        </div>
                        <div>
                          <dt>Source</dt>
                          <dd>{formatStatusLabel(selectedTask.sourceType)}</dd>
                        </div>
                        <div>
                          <dt>Requires Review</dt>
                          <dd>{selectedTask.requiresManagerApproval ? "Yes" : "No"}</dd>
                        </div>
                      </div>
                    </div>
                    <div className="enterprise-header-actions">
                      <button
                        className="enterprise-icon-button"
                        onClick={() => setWorkspaceOpen(true)}
                        type="button"
                        aria-label="Expand workspace"
                      >
                        <Expand size={17} />
                      </button>
                      <Link className="enterprise-icon-button" href={`/tasks/${selectedTask.id}`} aria-label="Open task detail">
                        <BellRing size={17} />
                      </Link>
                      <button className="enterprise-icon-button" onClick={() => setInspectorTab("Overview")} type="button" aria-label="Reset inspector">
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="enterprise-tab-row enterprise-tab-row-mockup" aria-label="Task inspector tabs">
                    {(["Overview", "Update Form", "Activity", "Manager"] as InspectorTab[]).map((tab) => (
                      <button
                        key={tab}
                        className={tab === inspectorTab ? "enterprise-tab enterprise-tab-active" : "enterprise-tab"}
                        onClick={() => setInspectorTab(tab)}
                        type="button"
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {inspectorTab === "Overview" ? (
                    <div className="enterprise-overview-board">
                      <div className="enterprise-overview-main">
                        <section className="enterprise-overview-stack">
                          <article className="enterprise-overview-card enterprise-overview-card-icon">
                            <div className="enterprise-overview-card-head">
                              <CircleAlert size={18} />
                              <h3>What is Expected</h3>
                            </div>
                            <p>
                              {selectedTask.description ??
                                "Move this task forward by keeping the status current, logging blockers clearly, and handing off enough context for the next step."}
                            </p>
                          </article>

                          <article className="enterprise-overview-card enterprise-overview-card-icon">
                            <div className={`enterprise-overview-card-head ${selectedTaskSignal?.tone ?? ""}`}>
                              <Info size={18} />
                              <h3>{selectedTaskSignal?.title ?? "Why This Matters"}</h3>
                            </div>
                            <p>{selectedTaskSignal?.body}</p>
                          </article>

                          <article className="enterprise-overview-card enterprise-overview-card-icon">
                            <div className="enterprise-overview-card-head enterprise-overview-card-head-success">
                              <CheckCheck size={18} />
                              <h3>Expected Outcome</h3>
                            </div>
                            <p>{getExpectedOutcome(selectedTask)}</p>
                          </article>

                          <article className="enterprise-overview-card enterprise-overview-card-icon">
                            <div className="enterprise-overview-card-head enterprise-overview-card-head-review">
                              <FileText size={18} />
                              <h3>Completion Criteria</h3>
                            </div>
                            <ul>
                              {getCompletionCriteria(selectedTask).map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </article>

                          <article className="enterprise-overview-card enterprise-overview-card-icon">
                            <div className="enterprise-overview-card-head enterprise-overview-card-head-danger">
                              <ShieldAlert size={18} />
                              <h3>Manager Guidance</h3>
                            </div>
                            <ul>
                              {getManagerGuidance(selectedTask).map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </article>
                        </section>

                        <TaskStatusEditor
                          fullBoardHref={fullBoardHref}
                          isManager={isManager}
                          key={`${selectedTask.id}:${selectedTask.status}:${selectedTask.blockerReason ?? ""}`}
                          onTaskUpdated={handleTaskUpdated}
                          task={selectedTask}
                        />

                        <aside className="enterprise-side-panel-stack">
                          <section className="enterprise-detail-card enterprise-side-card">
                            <div className="enterprise-card-heading">
                              <Info size={18} />
                              <h3>Task Information</h3>
                            </div>
                            <dl className="enterprise-information-list">
                              <div><dt>Source</dt><dd>{formatStatusLabel(selectedTask.sourceType)}</dd></div>
                              <div><dt>Assigned</dt><dd>{selectedTask.assignedUser.name}</dd></div>
                              <div><dt>Due Window</dt><dd>{getDueCopy(selectedTask.dueAt, now)}</dd></div>
                              <div><dt>Reference</dt><dd>{getTaskReference(selectedTask)}</dd></div>
                              <div><dt>Workflow</dt><dd>{formatStatusLabel(selectedTask.workflowArea)}</dd></div>
                            </dl>
                          </section>

                          <section className="enterprise-detail-card enterprise-side-card">
                            <div className="enterprise-card-heading">
                              <CircleHelp size={18} />
                              <h3>Quick Actions</h3>
                            </div>
                            <div className="enterprise-quick-actions">
                              <Link className="enterprise-quick-action enterprise-quick-action-review" href={`/tasks/${selectedTask.id}`}>
                                Open task detail
                              </Link>
                              <Link className="enterprise-quick-action enterprise-quick-action-success" href={`/tasks/${selectedTask.id}#task-updates`}>
                                View task updates
                              </Link>
                              <Link className="enterprise-quick-action enterprise-quick-action-warning" href={fullBoardHref}>
                                Open full board
                              </Link>
                              <button className="enterprise-more-action" onClick={() => setWorkspaceOpen(true)} type="button">
                                Expand workspace
                              </button>
                            </div>
                          </section>
                        </aside>
                      </div>

                      <div className="enterprise-overview-footer">
                        <section className="enterprise-detail-card">
                          <div className="enterprise-card-heading">
                            <h3>Activity Preview</h3>
                            <span>(Live task data)</span>
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
                        </section>

                        <section className="enterprise-detail-card">
                          <div className="enterprise-card-heading">
                            <h3>Blocked / Waiting</h3>
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
                        </section>
                      </div>
                    </div>
                  ) : null}

                  {inspectorTab === "Update Form" ? (
                    <div className="enterprise-tab-panel">
                      <TaskStatusEditor
                        fullBoardHref={fullBoardHref}
                        isManager={isManager}
                        key={`update-${selectedTask.id}:${selectedTask.status}:${selectedTask.blockerReason ?? ""}`}
                        onTaskUpdated={handleTaskUpdated}
                        task={selectedTask}
                      />
                    </div>
                  ) : null}

                  {inspectorTab === "Activity" ? (
                    <div className="enterprise-tab-panel">
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
                    </div>
                  ) : null}

                  {inspectorTab === "Manager" ? (
                    <div className="enterprise-tab-panel">
                      <div className="enterprise-action-grid">
                        <Link className="enterprise-manager-action" href={`/tasks/${selectedTask.id}`}>
                          Open full detail
                        </Link>
                        <Link className="enterprise-manager-action" href={`/tasks/${selectedTask.id}#task-updates`}>
                          Review updates
                        </Link>
                        <button className="enterprise-manager-action" onClick={() => setWorkspaceOpen(true)} type="button">
                          Expand workspace
                        </button>
                        <Link className="enterprise-manager-action" href={fullBoardHref}>
                          Open board context
                        </Link>
                      </div>
                      <section className="enterprise-detail-card">
                        <strong>Manager notes</strong>
                        <ul>
                          {getManagerGuidance(selectedTask).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    </div>
                  ) : null}
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

      {workspaceOpen && selectedTask ? (
        <div className="enterprise-workspace-backdrop" role="dialog" aria-modal="true" aria-label="Expanded task workspace">
          <section className="enterprise-workspace">
            <div className="enterprise-workspace-header">
              <div className="enterprise-workspace-heading">
                <div className="enterprise-chip-row">
                  <span className={getStatusTone(selectedTask.status)}>{formatStatusLabel(selectedTask.status)}</span>
                  <span className={getUrgencyTone(selectedTask, now)}>{getUrgencyLabel(selectedTask, now)}</span>
                  <span className="enterprise-meta-chip">{formatStatusLabel(selectedTask.workflowArea)}</span>
                </div>
                <h2>{selectedTask.title}</h2>
                <p>
                  {selectedTask.assignedUser.name} | {formatDateTime(selectedTask.dueAt)} | {getTaskReference(selectedTask)} | Requires review: {selectedTask.requiresManagerApproval ? "Yes" : "No"}
                </p>
              </div>
              <button className="enterprise-workspace-close" onClick={() => setWorkspaceOpen(false)} type="button">
                <X size={18} />
                Close
              </button>
            </div>

            <div className="enterprise-workspace-grid my-tasks-live-workspace-grid">
              <section className="enterprise-workspace-main">
                <div className="enterprise-content-block">
                  <strong>Operational overview</strong>
                  <p>
                    {selectedTask.description ??
                      "Use this workspace when the inspector is not enough and you need deeper task context before making the next move."}
                  </p>
                </div>
                <TaskStatusEditor
                  fullBoardHref={fullBoardHref}
                  isManager={isManager}
                  key={`workspace-${selectedTask.id}:${selectedTask.status}:${selectedTask.blockerReason ?? ""}`}
                  onTaskUpdated={handleTaskUpdated}
                  task={selectedTask}
                />
                <section className="enterprise-detail-card">
                  <strong>Live activity</strong>
                  <ul className="enterprise-activity-list">
                    {getActivityItems(selectedTask).map((item, index) => (
                      <li key={`${item.label}-${index}`}>{item.time} - {item.detail}</li>
                    ))}
                  </ul>
                </section>
              </section>

              <aside className="enterprise-workspace-side">
                <section className="enterprise-detail-card">
                  <strong>Task information</strong>
                  <ul>
                    {selectedTaskFacts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="enterprise-detail-card">
                  <strong>Manager guidance</strong>
                  <ul>
                    {getManagerGuidance(selectedTask).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="enterprise-detail-card enterprise-future-card">
                  <strong>Next best links</strong>
                  <div className="enterprise-future-list">
                    <Link href={`/tasks/${selectedTask.id}`}>Task detail</Link>
                    <Link href={`/tasks/${selectedTask.id}#task-updates`}>Task updates</Link>
                    <Link href={fullBoardHref}>Board context</Link>
                  </div>
                </section>
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
