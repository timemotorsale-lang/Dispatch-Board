"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { useState, useTransition } from "react";

import { EmptyStateCard, ErrorStateCard } from "@/components/ui/state-card";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  getAllowedMyTaskStatuses,
  getTaskActionLabel
} from "@/features/tasks/my-tasks-helpers";
import type { BoardReadTask } from "@/server/services/board-read";
import type { ManagerAttentionBucket, ManagerReviewFocus } from "@/server/services/manager-review";
import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { TeamExecutionHealthItem } from "@/server/services/team-execution-health";

type ManagerReviewScreenProps = {
  boardDate: string;
  boardExists: boolean;
  errorMessage?: string | null;
  fullBoardHref: string;
  generatedAt: string | null;
  generationStatus: string | null;
  initialAttentionBuckets: ManagerAttentionBucket[];
  initialFocus: ManagerReviewFocus;
  initialNeedsAssignmentTasks?: BoardReadTask[];
  initialTasks: BoardReadTask[];
  assignableUsers: ActiveUserSummary[];
  nowIso?: string;
  initialExecutionHealth?: TeamExecutionHealthItem[];
};

type StatusUpdateResponse =
  | {
      task?: {
        id: string;
        status: TaskStatus;
      };
      error?: string;
    }
  | null;

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDueTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function getReviewAgeCopy(readyForReviewAt: string | null, now: Date) {
  if (!readyForReviewAt) {
    return "Waiting for manager review";
  }

  const ageInMinutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(readyForReviewAt).getTime()) / 60000)
  );

  if (ageInMinutes < 60) {
    return `${ageInMinutes}m in queue`;
  }

  return `${Math.round(ageInMinutes / 60)}h in queue`;
}

function getElapsedAgeCopy(value: string, now: Date) {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round(hours / 24)}d`;
}

function getAttentionSla(task: BoardReadTask, now: Date) {
  const minutesUntilDue = Math.round((new Date(task.dueAt).getTime() - now.getTime()) / 60000);

  if (minutesUntilDue < 0) {
    return {
      label: "At Risk",
      tone: "danger" as const,
      detail: `${Math.abs(minutesUntilDue) < 60 ? `${Math.abs(minutesUntilDue)}m` : `${Math.round(Math.abs(minutesUntilDue) / 60)}h`} overdue`
    };
  }

  if (minutesUntilDue <= 120) {
    return {
      label: "Due Soon",
      tone: "warning" as const,
      detail: `${minutesUntilDue < 60 ? `${minutesUntilDue}m` : `${Math.round(minutesUntilDue / 60)}h`} left`
    };
  }

  if (task.status === TaskStatus.BLOCKED || task.status === TaskStatus.WAITING_ON_APPROVAL) {
    return {
      label: "Needs Manager",
      tone: "warning" as const,
      detail: "Decision holding progress"
    };
  }

  return {
    label: "On Track",
    tone: "neutral" as const,
    detail: "No immediate SLA risk"
  };
}

function getOverdueCount(tasks: BoardReadTask[], now: Date) {
  return tasks.filter((task) => new Date(task.dueAt).getTime() < now.getTime()).length;
}

function getOldestReviewTask(tasks: BoardReadTask[]) {
  return [...tasks]
    .sort((left, right) => {
      const leftValue = left.readyForReviewAt ?? left.dueAt;
      const rightValue = right.readyForReviewAt ?? right.dueAt;
      return new Date(leftValue).getTime() - new Date(rightValue).getTime();
    })
    .at(0);
}

function getAttentionTaskCount(attentionBuckets: ManagerAttentionBucket[]) {
  return attentionBuckets.reduce((total, bucket) => total + bucket.tasks.length, 0);
}

function getOldestAttentionTask(attentionBuckets: ManagerAttentionBucket[]) {
  return attentionBuckets
    .flatMap((bucket) => bucket.tasks)
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
    .at(0);
}

function createManagerQueueHref(boardDate: string, focus: ManagerReviewFocus) {
  const query = new URLSearchParams({ date: boardDate });

  if (focus) {
    query.set("focus", focus);
  }

  return `/manager-review?${query.toString()}`;
}

type ReviewCardProps = {
  boardHref: string;
  onTaskRemoved(taskId: string): void;
  task: BoardReadTask;
};

type TaskStatusResponse =
  | {
      task?: {
        id: string;
        status: TaskStatus;
        blockerReason: string | null;
      };
      error?: string;
    }
  | null;

type TaskAssignmentResponse =
  | {
      task?: {
        id: string;
        assignedUser: {
          id: string;
          name: string;
        };
      };
      error?: string;
    }
  | null;

function ReviewTaskCard({ boardHref, onTaskRemoved, task }: ReviewCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(nextStatus: TaskStatus) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: nextStatus
        })
      });
      const result = (await response.json().catch(() => null)) as StatusUpdateResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to update this review right now.");
        return;
      }

      onTaskRemoved(task.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this review right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="panel-card my-task-card manager-review-card">
      <div className="my-task-topline">
        <div className="my-task-copy">
          <div className="my-task-heading-row">
            <h2>{task.title}</h2>
            <span className="board-status-chip board-status-chip-review">
              {formatStatusLabel(task.status)}
            </span>
          </div>
          {task.description ? <p>{task.description}</p> : null}
        </div>
        <div className="my-task-card-links">
          <Link className="pill pill-secondary" href={`/tasks/${task.id}`}>
            Open detail
          </Link>
          <Link className="pill pill-muted" href={boardHref}>
            Open board
          </Link>
        </div>
      </div>

      <div className="my-task-meta-grid">
        <div>
          <span>Assigned</span>
          <strong>{task.assignedUser.name}</strong>
          {task.assignedUser.email ? <small>{task.assignedUser.email}</small> : null}
        </div>
        <div>
          <span>Due</span>
          <strong>{formatDueTime(task.dueAt)}</strong>
          <small>{formatDateTime(task.dueAt)}</small>
        </div>
        <div>
          <span>Ready since</span>
          <strong>{task.readyForReviewAt ? formatDateTime(task.readyForReviewAt) : "Not recorded"}</strong>
          <small>{getReviewAgeCopy(task.readyForReviewAt, new Date())}</small>
        </div>
        <div>
          <span>Workflow</span>
          <strong>{formatStatusLabel(task.workflowArea)}</strong>
          <small>{formatStatusLabel(task.sourceType)}</small>
        </div>
      </div>

      <div className="board-chip-row">
        <span className="board-chip">Manager review required</span>
        {task.vehicleReference ? <span className="board-chip">Vehicle: {task.vehicleReference}</span> : null}
        {task.customerReference ? <span className="board-chip">Customer: {task.customerReference}</span> : null}
      </div>

      {task.recommendation ? (
        <div className="manager-review-note">
          <span>Assignment recommendation</span>
          <p>{task.recommendation.explanation}</p>
        </div>
      ) : null}

      <div className="manager-review-actions">
        <button
          className="pill pill-primary"
          disabled={isSubmitting}
          onClick={() => void submit(TaskStatus.COMPLETED)}
          type="button"
        >
          {isSubmitting ? "Saving..." : "Approve completion"}
        </button>
        <button
          className="pill pill-secondary"
          disabled={isSubmitting}
          onClick={() => void submit(TaskStatus.IN_PROGRESS)}
          type="button"
        >
          Send back to In Progress
        </button>
      </div>

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </article>
  );
}

function AttentionTaskActions({
  onTaskChanged,
  assignableUsers,
  task
}: {
  onTaskChanged(message: string): void;
  assignableUsers: ActiveUserSummary[];
  task: BoardReadTask;
}) {
  const [assignedUserId, setAssignedUserId] = useState(task.assignedUser.id);
  const [selectedStatus, setSelectedStatus] = useState(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowedStatuses = getAllowedMyTaskStatuses(task, true);
  const requiresBlockerReason = selectedStatus === TaskStatus.BLOCKED;
  const trimmedBlockerReason = blockerReason.trim();

  async function saveAssignment() {
    if (assignedUserId === task.assignedUser.id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/assignment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assignedUserId
        })
      });
      const result = (await response.json().catch(() => null)) as TaskAssignmentResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to reassign this task right now.");
        return;
      }

      onTaskChanged(`Assigned ${task.title} to ${result.task.assignedUser.name}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reassign this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveStatus() {
    if (requiresBlockerReason && !trimmedBlockerReason) {
      setErrorMessage("Blocked tasks require a blocker reason.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: selectedStatus,
          ...(selectedStatus === TaskStatus.BLOCKED ? { blockerReason: trimmedBlockerReason } : {})
        })
      });
      const result = (await response.json().catch(() => null)) as TaskStatusResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to update this task right now.");
        return;
      }

      onTaskChanged(
        `${task.title} moved to ${formatStatusLabel(result.task.status)}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="manager-review-inline-actions">
      <label className="field">
        <span>Reassign owner</span>
        <select
          disabled={isSubmitting}
          value={assignedUserId}
          onChange={(event) => {
            setAssignedUserId(event.target.value);
            setErrorMessage(null);
          }}
        >
          {assignableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="pill pill-secondary manager-review-inline-button"
        disabled={isSubmitting || assignedUserId === task.assignedUser.id}
        onClick={() => void saveAssignment()}
        type="button"
      >
        {isSubmitting ? "Saving..." : "Save assignment"}
      </button>

      <label className="field">
        <span>Next status</span>
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

      {requiresBlockerReason ? (
        <label className="field manager-review-inline-span">
          <span>Blocker reason</span>
          <input
            disabled={isSubmitting}
            placeholder="What is still blocking this task?"
            value={blockerReason}
            onChange={(event) => {
              setBlockerReason(event.target.value);
              setErrorMessage(null);
            }}
          />
        </label>
      ) : null}

      <button
        className="pill pill-primary manager-review-inline-button"
        disabled={isSubmitting}
        onClick={() => void saveStatus()}
        type="button"
      >
        {isSubmitting ? "Saving..." : getTaskActionLabel(selectedStatus, task.status as TaskStatus, task.requiresManagerApproval)}
      </button>

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice manager-review-inline-span" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </div>
  );
}

function AttentionTaskCard({
  assignableUsers,
  boardHref,
  now,
  onTaskChanged,
  task
}: {
  assignableUsers: ActiveUserSummary[];
  boardHref: string;
  now: Date;
  onTaskChanged(message: string): void;
  task: BoardReadTask;
}) {
  const sla = getAttentionSla(task, now);

  return (
    <article className="panel-card my-task-card manager-review-card manager-review-card-compact">
      <div className="my-task-topline">
        <div className="my-task-copy">
          <div className="my-task-heading-row">
            <h2>{task.title}</h2>
            <span className="board-status-chip board-status-chip-warning">
              {formatStatusLabel(task.status)}
            </span>
          </div>
          {task.description ? <p>{task.description}</p> : null}
        </div>
        <div className="my-task-card-links">
          <Link className="pill pill-secondary" href={`/tasks/${task.id}`}>
            Open detail
          </Link>
        </div>
      </div>

      <div className="manager-review-signal-row">
        <span className={`manager-review-sla-pill manager-review-sla-pill-${sla.tone}`}>{sla.label}</span>
        <span className="board-chip board-chip-muted">{sla.detail}</span>
        <span className="board-chip board-chip-muted">Last updated {getElapsedAgeCopy(task.updatedAt, now)} ago</span>
      </div>

      <div className="my-task-meta-grid">
        <div>
          <span>Assigned</span>
          <strong>{task.assignedUser.name}</strong>
          {task.assignedUser.email ? <small>{task.assignedUser.email}</small> : null}
        </div>
        <div>
          <span>Due</span>
          <strong>{formatDueTime(task.dueAt)}</strong>
          <small>{formatDateTime(task.dueAt)}</small>
        </div>
        <div>
          <span>Workflow</span>
          <strong>{formatStatusLabel(task.workflowArea)}</strong>
          <small>{formatStatusLabel(task.sourceType)}</small>
        </div>
        <div>
          <span>Context</span>
          <strong>{task.vehicleReference ?? task.customerReference ?? "No reference"}</strong>
          <small>{task.blockerReason ?? "Open the detail view for the full next-step context."}</small>
        </div>
      </div>

      <div className="my-task-card-links manager-review-card-links">
        <Link className="pill pill-muted" href={boardHref}>
          Open board
        </Link>
      </div>

      <AttentionTaskActions assignableUsers={assignableUsers} onTaskChanged={onTaskChanged} task={task} />
    </article>
  );
}

export function ManagerReviewScreen({
  boardDate,
  boardExists,
  errorMessage,
  fullBoardHref,
  generatedAt,
  generationStatus,
  initialAttentionBuckets,
  initialFocus,
  initialNeedsAssignmentTasks = [],
  initialTasks,
  assignableUsers,
  nowIso
  ,initialExecutionHealth = []
}: ManagerReviewScreenProps) {
  const router = useRouter();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [removedTaskIds, setRemovedTaskIds] = useState<Record<string, true>>({});
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [focus, setFocus] = useState<ManagerReviewFocus>(initialFocus);
  const tasks = initialTasks.filter((task) => !removedTaskIds[task.id]);
  const attentionBuckets = initialAttentionBuckets.map((bucket) => ({
    ...bucket,
    tasks: bucket.tasks.filter((task) => !removedTaskIds[task.id])
  }));
  const needsAssignmentTasks = initialNeedsAssignmentTasks.filter((task) => !removedTaskIds[task.id]);
  const visibleReviewTasks = focus === "" || focus === "READY_FOR_REVIEW" ? tasks : [];
  const visibleAttentionBuckets =
    focus === "" || focus === "READY_FOR_REVIEW"
      ? attentionBuckets
      : attentionBuckets.filter((bucket) => bucket.status === focus);
  const visibleNeedsAssignmentTasks = focus === "" || focus === "NEEDS_ASSIGNMENT" ? needsAssignmentTasks : [];
  const now = new Date(nowIso ?? new Date().toISOString());
  const oldestTask = getOldestReviewTask(tasks);
  const oldestAttentionTask = getOldestAttentionTask(attentionBuckets);
  const attentionTaskCount = getAttentionTaskCount(attentionBuckets);

  function refreshQueue() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  useLiveRefresh(() => {
    refreshQueue();
  });

  function handleTaskRemoved(taskId: string) {
    setRemovedTaskIds((currentRemovedTaskIds) => ({
      ...currentRemovedTaskIds,
      [taskId]: true
    }));
    setLastActionMessage("The review queue has been updated.");
  }

  function handleAttentionTaskChanged(message: string) {
    setLastActionMessage(message);
    refreshQueue();
  }

  return (
    <section className="page-stack dashboard-page board-page manager-review-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Manager workflow</span>
          <h1>Manager Review</h1>
          <p>
            Review approval-required work for {formatBoardDateLabel(boardDate)}, then approve it or
            send it back into progress with one click.
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
          <div className="manager-review-focus-row">
            {[
              { label: "All manager work", value: "" },
              { label: "Ready for Review", value: "READY_FOR_REVIEW" },
              { label: "Blocked", value: "BLOCKED" },
              { label: "Waiting on Parts", value: "WAITING_ON_PARTS" },
              { label: "Waiting on Approval", value: "WAITING_ON_APPROVAL" }
              ,{ label: "Needs Assignment", value: "NEEDS_ASSIGNMENT" }
            ].map((option) => (
              <button
                aria-pressed={focus === option.value}
                className={focus === option.value ? "board-tab active" : "board-tab"}
                key={option.label}
                onClick={() => setFocus(option.value as ManagerReviewFocus)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="board-toolbar my-tasks-toolbar">
          <div className="board-toolbar-actions">
            <Link className="pill pill-primary" href={fullBoardHref}>
              Open full board
            </Link>
            <button className="pill pill-secondary" onClick={refreshQueue} type="button">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="panel-grid board-summary-grid">
        <article className="panel-card board-stat-card">
          <strong>Ready now</strong>
          <h2>{tasks.length}</h2>
          <p className="board-stat-card-copy">Tasks currently waiting for manager approval.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Overdue</strong>
          <h2>{getOverdueCount(tasks, now)}</h2>
          <p className="board-stat-card-copy">Review items whose due time has already passed.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Needs attention</strong>
          <h2>{attentionTaskCount}</h2>
          <p className="board-stat-card-copy">Blocked and waiting work that may need a manager move.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Needs assignment</strong>
          <h2>{needsAssignmentTasks.length}</h2>
          <p className="board-stat-card-copy">Claimable work available for eligible staff.</p>
        </article>
      </div>

      {lastActionMessage ? (
        <div className="notice manager-review-notice" role="status">
          <p>{lastActionMessage}</p>
        </div>
      ) : null}

      {initialExecutionHealth.length ? <section className="team-execution-health" aria-label="Team Execution Health"><header><div><span className="eyebrow">Explainable operating conditions</span><h2>Team Execution Health</h2><p>Each condition links to the work facts producing it. No rankings or passive activity timers are used.</p></div></header><div>{initialExecutionHealth.map((item) => <article className={`execution-health-item execution-health-${item.condition.toLowerCase()}`} key={item.staffDayId}><div><strong>{item.user.name}</strong><span>{formatStatusLabel(item.condition)}</span></div><p>{item.explanation}</p><small>Active {item.counts.active} · Blocked {item.counts.blocked} · Waiting {item.counts.waiting} · Review {item.counts.readyForReview} · Carryover {item.counts.carryover}</small>{item.facts.length ? <ul>{item.facts.slice(0, 3).map((fact) => <li key={`${fact.code}:${fact.taskId}`}>{fact.taskId ? <Link href={`/tasks/${fact.taskId}`}>{fact.label}</Link> : fact.label}</li>)}</ul> : null}</article>)}</div></section> : null}

      {errorMessage ? (
        <ErrorStateCard
          actions={[{ label: "Refresh", onClick: refreshQueue }]}
          eyebrow="Review queue unavailable"
          message={`${errorMessage} Existing board data may still be available elsewhere in the app.`}
          title="Couldn't load the manager review queue"
        />
      ) : null}

      {!errorMessage && !boardExists ? (
        <EmptyStateCard
          actions={[{ href: fullBoardHref, label: "Open full board", tone: "secondary" }]}
          eyebrow="No board yet"
          message="Generate or open today's board first, then approval-ready tasks will appear here automatically."
          title="Today's board has not been generated"
        />
      ) : null}

      {!errorMessage && boardExists && tasks.length === 0 && attentionTaskCount === 0 && needsAssignmentTasks.length === 0 ? (
        <EmptyStateCard
          actions={[{ href: fullBoardHref, label: "Back to board" }]}
          eyebrow="Queue clear"
          message="No approval-ready, blocked, or waiting work is asking for manager attention right now."
          title="The manager queue is clear"
        />
      ) : null}

      {!errorMessage && boardExists && (tasks.length > 0 || attentionTaskCount > 0 || needsAssignmentTasks.length > 0) ? (
        <div className="board-content-grid my-tasks-content-grid manager-review-columns">
          <article className="panel-card board-main-card">
            <div className="board-section-heading">
              <div>
                <strong>Approval queue</strong>
                <h3>Ready for Review</h3>
              </div>
              <p>Approve clean completions quickly, or reopen work that needs another pass.</p>
            </div>

            <div className="my-task-list">
              {visibleReviewTasks.length > 0 ? (
                visibleReviewTasks.map((task) => (
                  <ReviewTaskCard
                    boardHref={fullBoardHref}
                    key={task.id}
                    onTaskRemoved={handleTaskRemoved}
                    task={task}
                  />
                ))
              ) : (
                <div className="notice manager-review-empty-inline" role="status">
                  <p>
                    {focus === "" || focus === "READY_FOR_REVIEW"
                      ? "No tasks are waiting for formal manager review right now."
                      : "This focus is showing the attention queue instead of review-ready work."}
                  </p>
                </div>
              )}
            </div>
          </article>

          <article className="panel-card board-main-card">
            <div className="board-section-heading">
              <div>
                <strong>Attention queue</strong>
                <h3>Blocked and waiting work</h3>
              </div>
              <p>Work this queue when the board shows stalled or manager-held progress.</p>
            </div>

            <div className="manager-review-attention-groups">
              {focus === "" || focus === "NEEDS_ASSIGNMENT" ? <section className="manager-review-bucket manager-needs-assignment" aria-label="Needs Assignment queue"><div className="manager-review-bucket-header"><div><h4>Needs Assignment</h4><p>Claimable work that eligible staff can request from My Day.</p></div><div className="manager-review-bucket-actions"><span className="board-chip">{visibleNeedsAssignmentTasks.length}</span></div></div><div className="my-task-list">{visibleNeedsAssignmentTasks.length ? visibleNeedsAssignmentTasks.map((task) => <article className="my-task-card manager-attention-card" key={task.id}><div className="my-task-card-heading"><div><span className="eyebrow">{formatStatusLabel(task.workflowArea)}</span><h3>{task.title}</h3></div><span className="status-badge status-badge-muted">Claimable</span></div><p>{task.description ?? "No additional task context."}</p><div className="my-task-card-meta"><span>Current owner: {task.assignedUser.name}</span><span>Due {formatDueTime(task.dueAt)}</span></div><div className="my-task-card-links"><Link className="pill pill-muted" href={`/tasks/${task.id}`}>Open workspace</Link></div></article>) : <div className="notice manager-review-empty-inline" role="status"><p>No claimable tasks currently need assignment.</p></div>}</div></section> : null}
              {visibleAttentionBuckets.map((bucket) => (
                <section className="manager-review-bucket" key={bucket.status}>
                  <div className="manager-review-bucket-header">
                    <div>
                      <h4>{bucket.label}</h4>
                      <p>{bucket.description}</p>
                    </div>
                    <div className="manager-review-bucket-actions">
                      <span className="board-chip">{bucket.tasks.length}</span>
                      <Link
                        className="pill pill-muted manager-review-bucket-link"
                        href={createManagerQueueHref(boardDate, bucket.status)}
                      >
                        Open only this queue
                      </Link>
                    </div>
                  </div>

                  <div className="my-task-list">
                    {bucket.tasks.length > 0 ? (
                      bucket.tasks.map((task) => (
                        <AttentionTaskCard
                          assignableUsers={assignableUsers}
                          boardHref={fullBoardHref}
                          key={task.id}
                          now={now}
                          onTaskChanged={handleAttentionTaskChanged}
                          task={task}
                        />
                      ))
                    ) : (
                      <div className="notice manager-review-empty-inline" role="status">
                        <p>No tasks are currently in this status.</p>
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="board-panel-stack">
            <section className="panel-card board-rail-card">
              <div className="board-section-heading">
                <div>
                  <strong>Queue scan</strong>
                  <h3>What needs attention</h3>
                </div>
                <p>Use the queue age and due times to decide what to review first.</p>
              </div>

              <ul className="board-attention-list">
                <li className="board-attention-item">
                  <span>Needs assignment</span>
                  <strong>{needsAssignmentTasks.length}</strong>
                </li>
                <li className="board-attention-item">
                  <span>Waiting review</span>
                  <strong>{tasks.length}</strong>
                </li>
                <li className="board-attention-item">
                  <span>Needs attention</span>
                  <strong>{attentionTaskCount}</strong>
                </li>
                <li className="board-attention-item">
                  <span>Oldest attention item</span>
                  <strong>{oldestAttentionTask ? oldestAttentionTask.title : oldestTask ? oldestTask.title : "None"}</strong>
                </li>
              </ul>

              <div className="manager-review-rail-actions">
                <Link className="pill pill-secondary" href={createManagerQueueHref(boardDate, "READY_FOR_REVIEW")}>
                  Review-only view
                </Link>
                <Link className="pill pill-muted" href={createManagerQueueHref(boardDate, "")}>
                  Reset queue focus
                </Link>
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
