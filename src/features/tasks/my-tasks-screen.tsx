"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { useRef, useState, useTransition } from "react";

import { EmptyStateCard, ErrorStateCard } from "@/components/ui/state-card";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  filterMyTasks,
  getAllowedMyTaskStatuses,
  getMyTasksFilterLabel,
  getMyTasksFilterOptions,
  getPrimaryMyTaskStatusActions,
  getTaskActionLabel,
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

type StatusUpdatePayload = {
  status: TaskStatus;
  blockerReason?: string;
};

type TaskOverride = {
  blockerReason: string | null;
  status: TaskStatus;
};

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
    return "board-status-chip board-status-chip-danger";
  }

  if (status === TaskStatus.WAITING_ON_PARTS || status === TaskStatus.WAITING_ON_APPROVAL) {
    return "board-status-chip board-status-chip-warning";
  }

  if (status === TaskStatus.READY_FOR_REVIEW) {
    return "board-status-chip board-status-chip-review";
  }

  if (status === TaskStatus.COMPLETED) {
    return "board-status-chip board-status-chip-success";
  }

  return "board-status-chip board-status-chip-default";
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

function getActiveTaskCount(tasks: BoardReadTask[]) {
  return tasks.filter((task) => task.status !== TaskStatus.COMPLETED).length;
}

function getBlockedTaskCount(tasks: BoardReadTask[]) {
  return tasks.filter((task) => task.status === TaskStatus.BLOCKED).length;
}

function getReadyForReviewCount(tasks: BoardReadTask[]) {
  return tasks.filter((task) => task.status === TaskStatus.READY_FOR_REVIEW).length;
}

type TaskCardProps = {
  isManager: boolean;
  now: Date;
  onTaskUpdated(taskId: string, update: { status: TaskStatus; blockerReason: string | null }): void;
  task: BoardReadTask;
};

function TaskCard({ isManager, now, onTaskUpdated, task }: TaskCardProps) {
  const allowedStatuses = getAllowedMyTaskStatuses(task, isManager);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasStatusChoices = allowedStatuses.length > 0;
  const primaryStatusActions = getPrimaryMyTaskStatusActions(task, isManager);
  const buttonLabel = getTaskActionLabel(
    selectedStatus,
    task.status as TaskStatus,
    task.requiresManagerApproval
  );
  const trimmedBlockerReason = blockerReason.trim();
  const needsBlockerReason = selectedStatus === TaskStatus.BLOCKED;
  const canSubmit =
    hasStatusChoices &&
    !isSubmitting &&
    (!needsBlockerReason || Boolean(trimmedBlockerReason)) &&
    (selectedStatus !== (task.status as TaskStatus) ||
      (needsBlockerReason && trimmedBlockerReason !== (task.blockerReason ?? "")));

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
      onTaskUpdated(task.id, {
        status: result.task.status,
        blockerReason: result.task.blockerReason
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuickAction(status: TaskStatus) {
    setSelectedStatus(status);
    setErrorMessage(null);

    if (status !== TaskStatus.BLOCKED) {
      void submitStatusUpdate({ status });
    }
  }

  return (
    <article className="panel-card my-task-card">
      <div className="my-task-topline">
        <div className="my-task-copy">
          <div className="my-task-heading-row">
            <h2>{task.title}</h2>
            <span className={getStatusTone(task.status)}>{formatStatusLabel(task.status)}</span>
          </div>
          {task.description ? <p>{task.description}</p> : null}
        </div>
        <div className="my-task-card-links">
          <Link className="pill pill-secondary" href={`/tasks/${task.id}`}>
            Detail
          </Link>
          <Link className="pill pill-muted" href={`/tasks/${task.id}#task-updates`}>
            Update
          </Link>
        </div>
      </div>

      <div className="my-task-meta-grid">
        <div>
          <span>Due</span>
          <strong>{formatDueTime(task.dueAt)}</strong>
          <small>{getDueCopy(task.dueAt, now)}</small>
        </div>
        <div>
          <span>Workflow</span>
          <strong>{formatStatusLabel(task.workflowArea)}</strong>
        </div>
        <div>
          <span>Assigned</span>
          <strong>{task.assignedUser.name}</strong>
          {task.assignedUser.email ? <small>{task.assignedUser.email}</small> : null}
        </div>
      </div>

      <div className="board-chip-row">
        {task.requiresManagerApproval ? (
          <span className="board-chip">Manager review required</span>
        ) : null}
        {task.vehicleReference ? <span className="board-chip">Vehicle: {task.vehicleReference}</span> : null}
        {task.customerReference ? <span className="board-chip">Customer: {task.customerReference}</span> : null}
      </div>

      {task.blockerReason && task.status === TaskStatus.BLOCKED ? (
        <p className="board-task-alert">Blocked: {task.blockerReason}</p>
      ) : null}

      {hasStatusChoices ? (
        <div className="my-task-action-grid">
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
                  onClick={() => handleQuickAction(statusOption.value)}
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

          <label className="field">
            <span>Next action</span>
            <select
              disabled={isSubmitting}
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

          {needsBlockerReason ? (
            <label className="field my-task-blocker-field">
              <span>Blocker reason</span>
              <input
                disabled={isSubmitting}
                placeholder="What is blocking this task?"
                value={blockerReason}
                onChange={(event) => {
                  setBlockerReason(event.target.value);
                  setErrorMessage(null);
                }}
              />
              <small className="field-hint">A blocker reason is required before this update can be sent.</small>
            </label>
          ) : null}

          <div className="my-task-actions">
            <button
              className="pill pill-primary"
              disabled={!canSubmit}
              onClick={() =>
                submitStatusUpdate({
                  status: selectedStatus,
                  ...(selectedStatus === TaskStatus.BLOCKED
                    ? { blockerReason: trimmedBlockerReason }
                    : {})
                })
              }
              type="button"
            >
              {isSubmitting ? "Saving..." : buttonLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="my-task-readonly-row">
          <p>
            {task.status === TaskStatus.COMPLETED
              ? "This task is already completed."
              : "This task is waiting on review before it can move again from this screen."}
          </p>
        </div>
      )}

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </article>
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
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskOverride>>({});
  const taskListRef = useRef<HTMLElement | null>(null);
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
  const activeFilterLabel = getMyTasksFilterLabel(activeFilter);
  const summaryCards: Array<{
    description: string;
    filter: MyTasksFilter;
    title: string;
    value: number;
  }> = [
    {
      description: "Tasks assigned to you on today's board.",
      filter: "all",
      title: "Assigned today",
      value: tasks.length
    },
    {
      description: "Everything still in flight or waiting on you today.",
      filter: "open",
      title: "Open work",
      value: getActiveTaskCount(tasks)
    },
    {
      description: "Tasks that need a blocker cleared before they can move.",
      filter: "blockedWaiting",
      title: "Blocked",
      value: getBlockedTaskCount(tasks)
    },
    {
      description: "Approval-ready work that may need a manager next.",
      filter: "readyForReview",
      title: "Ready for review",
      value: getReadyForReviewCount(tasks)
    }
  ];

  function refreshTasks() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  useLiveRefresh(() => {
    refreshTasks();
  });

  function handleTaskUpdated(taskId: string, update: { status: TaskStatus; blockerReason: string | null }) {
    setTaskOverrides((currentOverrides) => ({
      ...currentOverrides,
      [taskId]: update
    }));
  }

  function handleFilterSelect(filter: MyTasksFilter) {
    setActiveFilter((currentFilter) =>
      currentFilter === filter && filter !== "all" ? "all" : filter
    );
    requestAnimationFrame(() => {
      taskListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <section className="page-stack dashboard-page board-page my-tasks-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Staff task view</span>
          <h1>My Tasks</h1>
          <p>
            {userName}, this is your streamlined work list for {formatBoardDateLabel(boardDate)}.
            Stay focused here, then jump to the full board when you need wider daily context.
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
          <p className="my-tasks-generated-copy">Refreshes when you return to this tab or click Refresh.</p>
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

      <div className="panel-grid board-summary-grid">
        {summaryCards.map((card) => (
          <button
            aria-pressed={activeFilter === card.filter}
            className={
              activeFilter === card.filter
                ? "panel-card board-stat-card my-task-summary-card my-task-summary-card-active"
                : "panel-card board-stat-card my-task-summary-card"
            }
            key={card.title}
            onClick={() => handleFilterSelect(card.filter)}
            type="button"
          >
            <strong>{card.title}</strong>
            <h2>{card.value}</h2>
            <p className="board-stat-card-copy">{card.description}</p>
          </button>
        ))}
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
        <>
          <div className="panel-card board-controls-card">
            <div className="board-controls-heading">
              <div>
                <strong>Task filters</strong>
                <h2>Keep your list focused</h2>
              </div>
              <p>Click a summary card or use the chips below to focus on what needs your attention next.</p>
            </div>

            <div className="board-quick-filters" aria-label="My task filters">
              {filterOptions.map((filterOption) => (
                <button
                  key={filterOption.value}
                  className={
                    filterOption.value === activeFilter
                      ? "board-filter-pill board-filter-pill-active"
                      : "board-filter-pill"
                  }
                  onClick={() => handleFilterSelect(filterOption.value)}
                  type="button"
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
          </div>

          <div className="board-content-grid my-tasks-content-grid">
            <article className="panel-card board-main-card" ref={taskListRef}>
              <div className="board-section-heading">
                <div>
                  <strong>Assigned work</strong>
                  <h3>Your task list</h3>
                </div>
                <p>Keep updates quick, clear blockers fast, and open task detail when you need more context.</p>
              </div>

              <div className="my-tasks-filter-feedback" role="status">
                <strong>{activeFilterLabel}</strong>
                <span>
                  {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"} showing
                </span>
              </div>

              {visibleTasks.length === 0 ? (
                <EmptyStateCard
                  eyebrow="Filter result"
                  message="No tasks match this filter right now. Choose a different filter to bring work back into view."
                  title="Nothing matches this task filter"
                />
              ) : (
                <div className="my-task-list">
                  {visibleTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      isManager={isManager}
                      now={now}
                      onTaskUpdated={handleTaskUpdated}
                      task={task}
                    />
                  ))}
                </div>
              )}
            </article>

            <aside className="board-panel-stack">
              <section className="panel-card board-rail-card">
                <div className="board-section-heading">
                  <div>
                    <strong>Focus now</strong>
                    <h3>Quick scan</h3>
                  </div>
                  <p>Your most important counts stay visible beside the list.</p>
                </div>

                <ul className="board-attention-list">
                  <li className="board-attention-item">
                    <span>Open work</span>
                    <strong>{getActiveTaskCount(tasks)}</strong>
                  </li>
                  <li className="board-attention-item">
                    <span>Blocked</span>
                    <strong>{getBlockedTaskCount(tasks)}</strong>
                  </li>
                  <li className="board-attention-item">
                    <span>Ready for review</span>
                    <strong>{getReadyForReviewCount(tasks)}</strong>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}
