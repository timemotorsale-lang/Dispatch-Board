"use client";

import { TaskStatus } from "@prisma/client";
import { useState } from "react";

import {
  getAllowedMyTaskStatuses,
  getPrimaryMyTaskStatusActions,
  getTaskActionLabel
} from "@/features/tasks/my-tasks-helpers";
import type { TaskReadModel } from "@/server/services/task-read";

type TaskStatusPanelProps = {
  actorIsManager: boolean;
  canUpdate: boolean;
  task: TaskReadModel;
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

export function TaskStatusPanel({ actorIsManager, canUpdate, task }: TaskStatusPanelProps) {
  const [status, setStatus] = useState(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowedStatuses = canUpdate
    ? getAllowedMyTaskStatuses(
        {
          status,
          requiresManagerApproval: task.requiresManagerApproval
        },
        actorIsManager
      )
    : [];
  const quickActions = canUpdate
    ? getPrimaryMyTaskStatusActions(
        {
          status,
          requiresManagerApproval: task.requiresManagerApproval
        },
        actorIsManager
      )
    : [];
  const needsBlockerReason = status === TaskStatus.BLOCKED;
  const trimmedBlockerReason = blockerReason.trim();
  const canSubmit =
    canUpdate &&
    !isSubmitting &&
    allowedStatuses.length > 0 &&
    (!needsBlockerReason || Boolean(trimmedBlockerReason));

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
          status: nextStatus,
          ...(nextStatus === TaskStatus.BLOCKED ? { blockerReason: trimmedBlockerReason } : {})
        })
      });
      const result = (await response.json().catch(() => null)) as TaskStatusResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to update this task right now.");
        return;
      }

      setStatus(result.task.status);
      setBlockerReason(result.task.blockerReason ?? "");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="panel-card">
      <strong>Workflow action</strong>
      <h2>Update status</h2>
      <p>Use this panel to move the task forward, record a blocker, or complete manager review.</p>

      {!canUpdate ? (
        <p className="task-comments-readonly-copy">
          Only the assigned staff member or a manager can change this task&apos;s status.
        </p>
      ) : (
        <div className="my-task-action-grid">
          {quickActions.length > 0 ? (
            <div className="my-task-quick-actions" aria-label={`Quick status actions for ${task.title}`}>
              {quickActions.map((statusOption) => (
                <button
                  className="my-task-action-chip"
                  disabled={isSubmitting}
                  key={statusOption.value}
                  onClick={() => {
                    setStatus(statusOption.value);
                    if (statusOption.value !== TaskStatus.BLOCKED) {
                      void submit(statusOption.value);
                    }
                  }}
                  type="button"
                >
                  {getTaskActionLabel(
                    statusOption.value,
                    status,
                    task.requiresManagerApproval
                  )}
                </button>
              ))}
            </div>
          ) : null}

          <label className="field">
            <span>Next status</span>
            <select
              disabled={isSubmitting || allowedStatuses.length === 0}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as TaskStatus);
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
            <label className="field">
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
            </label>
          ) : null}

          <div className="my-task-actions">
            <button
              className="pill pill-primary"
              disabled={!canSubmit}
              onClick={() => void submit(status)}
              type="button"
            >
              {isSubmitting ? "Saving..." : getTaskActionLabel(status, task.status as TaskStatus, task.requiresManagerApproval)}
            </button>
          </div>
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
