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
        updateFieldValues?: Record<string, string | boolean>;
      };
      error?: string;
    }
  | null;

function statusNeedsGuidedUpdateFields(status: TaskStatus) {
  return status === TaskStatus.READY_FOR_REVIEW || status === TaskStatus.COMPLETED;
}

function isGuidedUpdateFieldComplete(
  field: TaskReadModel["requiredUpdateFields"][number],
  value: string | boolean | undefined
) {
  if (!field.required) {
    return true;
  }

  if (typeof value === "boolean") {
    return true;
  }

  return typeof value === "string" && value.trim().length > 0;
}

export function TaskStatusPanel({ actorIsManager, canUpdate, task }: TaskStatusPanelProps) {
  const [status, setStatus] = useState(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [updateFieldValues, setUpdateFieldValues] = useState<Record<string, string | boolean>>(
    task.updateFieldValues ?? {}
  );
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
  const hasGuidedUpdateFields = task.requiredUpdateFields.length > 0;
  const missingRequiredUpdateFields = task.requiredUpdateFields.filter(
    (field) => field.required && !isGuidedUpdateFieldComplete(field, updateFieldValues[field.key])
  );
  const guidedUpdateFieldsCompleteCount = task.requiredUpdateFields.filter((field) =>
    isGuidedUpdateFieldComplete(field, updateFieldValues[field.key])
  ).length;
  const shouldHighlightGuidedUpdates =
    hasGuidedUpdateFields && statusNeedsGuidedUpdateFields(status);
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
          ...(nextStatus === TaskStatus.BLOCKED ? { blockerReason: trimmedBlockerReason } : {}),
          ...(hasGuidedUpdateFields ? { updateFields: updateFieldValues } : {})
        })
      });
      const result = (await response.json().catch(() => null)) as TaskStatusResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to update this task right now.");
        return;
      }

      setStatus(result.task.status);
      setBlockerReason(result.task.blockerReason ?? "");
      setUpdateFieldValues(result.task.updateFieldValues ?? {});
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
          {hasGuidedUpdateFields ? (
            <section
              className={
                shouldHighlightGuidedUpdates
                  ? "my-task-guided-update-panel my-task-guided-update-panel-active"
                  : "my-task-guided-update-panel"
              }
            >
              <div className="my-task-guided-update-header">
                <div className="my-task-guided-update-copy">
                  <strong>Required update form</strong>
                  <p>Capture the required workflow details before sending this task forward.</p>
                </div>
                <div className="my-task-guided-update-progress">
                  <span>
                    {guidedUpdateFieldsCompleteCount} of {task.requiredUpdateFields.length} ready
                  </span>
                  {shouldHighlightGuidedUpdates && missingRequiredUpdateFields.length > 0 ? (
                    <small>Needed for review or completion</small>
                  ) : (
                    <small>Saved on this task as you update it</small>
                  )}
                </div>
              </div>

              {shouldHighlightGuidedUpdates && missingRequiredUpdateFields.length > 0 ? (
                <div className="my-task-guided-update-warning" role="status">
                  Missing: {missingRequiredUpdateFields.map((field) => field.label).join(", ")}
                </div>
              ) : null}

              <div className="my-task-guided-update-fields">
                {task.requiredUpdateFields.map((field) => {
                  const value = updateFieldValues[field.key];
                  const isComplete = isGuidedUpdateFieldComplete(field, value);

                  if (field.type === "boolean") {
                    return (
                      <label
                        className={isComplete ? "field my-task-guided-field my-task-guided-field-complete" : "field my-task-guided-field"}
                        key={field.key}
                      >
                        <span>{field.label}{field.required ? " *" : ""}</span>
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
                        {field.helpText ? <small className="field-hint">{field.helpText}</small> : null}
                      </label>
                    );
                  }

                  if (field.type === "single_select") {
                    return (
                      <label
                        className={isComplete ? "field my-task-guided-field my-task-guided-field-complete" : "field my-task-guided-field"}
                        key={field.key}
                      >
                        <span>{field.label}{field.required ? " *" : ""}</span>
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
                        {field.helpText ? <small className="field-hint">{field.helpText}</small> : null}
                      </label>
                    );
                  }

                  if (field.type === "long_text") {
                    return (
                      <label
                        className={isComplete ? "field my-task-guided-field my-task-guided-field-complete" : "field my-task-guided-field"}
                        key={field.key}
                      >
                        <span>{field.label}{field.required ? " *" : ""}</span>
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
                        {field.helpText ? <small className="field-hint">{field.helpText}</small> : null}
                      </label>
                    );
                  }

                  return (
                    <label
                      className={isComplete ? "field my-task-guided-field my-task-guided-field-complete" : "field my-task-guided-field"}
                      key={field.key}
                    >
                      <span>{field.label}{field.required ? " *" : ""}</span>
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
                      {field.helpText ? <small className="field-hint">{field.helpText}</small> : null}
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null}

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
