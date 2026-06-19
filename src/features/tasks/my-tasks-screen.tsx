"use client";

import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import { useState } from "react";

import {
  filterMyTasks,
  getAllowedMyTaskStatuses,
  getMyTasksFilterOptions,
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

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
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
        <Link className="pill pill-secondary" href={`/tasks/${task.id}`}>
          Open
        </Link>
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
  const [activeFilter, setActiveFilter] = useState<MyTasksFilter>("all");
  const [tasks, setTasks] = useState(initialTasks);
  const now = new Date(nowIso);
  const filterOptions = getMyTasksFilterOptions(tasks, now);
  const visibleTasks = filterMyTasks(tasks, activeFilter, now);

  function handleTaskUpdated(taskId: string, update: { status: TaskStatus; blockerReason: string | null }) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: update.status,
              blockerReason: update.blockerReason
            }
          : task
      )
    );
  }

  return (
    <section className="page-stack board-page my-tasks-page">
      <div className="panel-card board-hero board-hero-shell">
        <div className="board-hero-copy">
          <span className="eyebrow">Staff task view</span>
          <h1>My Tasks</h1>
          <p>
            {userName}, this is your streamlined work list for {formatBoardDateLabel(boardDate)}. Stay in your own lane here, and jump to the full board when you need wider context.
          </p>
          <div className="board-hero-meta">
            <span className="board-hero-date">{formatBoardDateLabel(boardDate)}</span>
            <span className={getGenerationStatusTone(generationStatus)}>
              {generationStatus ? formatStatusLabel(generationStatus) : "Board not generated"}
            </span>
          </div>
          {generatedAt ? (
            <p className="my-tasks-generated-copy">Board generated {formatDateTime(generatedAt)}.</p>
          ) : null}
        </div>
        <div className="my-tasks-hero-actions">
          <Link className="pill pill-primary" href={fullBoardHref}>
            Open full board
          </Link>
          <button className="pill pill-secondary" onClick={() => window.location.reload()} type="button">
            Refresh
          </button>
        </div>
      </div>

      <div className="panel-grid board-summary-grid">
        <article className="panel-card board-stat-card">
          <strong>Assigned today</strong>
          <h2>{tasks.length}</h2>
          <p className="board-stat-card-copy">Tasks assigned to you on today&apos;s board.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Open work</strong>
          <h2>{getActiveTaskCount(tasks)}</h2>
          <p className="board-stat-card-copy">Everything still in flight or waiting on you today.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Blocked</strong>
          <h2>{getBlockedTaskCount(tasks)}</h2>
          <p className="board-stat-card-copy">Tasks that need a blocker cleared before they can move.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Ready for review</strong>
          <h2>{getReadyForReviewCount(tasks)}</h2>
          <p className="board-stat-card-copy">Approval-ready work that may need a manager next.</p>
        </article>
      </div>

      {errorMessage ? (
        <div className="notice notice-danger" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {!boardExists ? (
        <div className="panel-card my-tasks-empty-card">
          <strong>No board yet</strong>
          <h2>Today&apos;s board has not been generated.</h2>
          <p>Once the board exists, your assigned tasks will appear here automatically.</p>
        </div>
      ) : null}

      {boardExists && tasks.length === 0 ? (
        <div className="panel-card my-tasks-empty-card">
          <strong>All clear</strong>
          <h2>No tasks are assigned to you right now.</h2>
          <p>Check the full board if you need broader context or want to confirm whether work was reassigned.</p>
        </div>
      ) : null}

      {boardExists && tasks.length > 0 ? (
        <>
          <div className="panel-card board-controls-card">
            <div className="board-controls-heading">
              <div>
                <strong>Task filters</strong>
                <h2>Keep your list focused</h2>
              </div>
              <p>Use the simple chips below to focus on what needs your attention next.</p>
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
                  onClick={() => setActiveFilter(filterOption.value)}
                  type="button"
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <div className="notice board-empty-state" role="status">
              <p>No tasks match this filter right now.</p>
            </div>
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
        </>
      ) : null}
    </section>
  );
}
