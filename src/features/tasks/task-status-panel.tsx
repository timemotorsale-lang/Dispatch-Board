"use client";

import { TaskStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";

import {
  getAllowedMyTaskStatuses,
  getPrimaryMyTaskStatusActions,
  getTaskActionLabel
} from "@/features/tasks/my-tasks-helpers";
import type { TaskReadModel } from "@/server/services/task-read";
import type { TaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import { REQUIRED_UPDATE_PROGRESS_EVENT } from "@/features/tasks/detail/task-required-update-progress";

type TaskStatusPanelProps = {
  actorIsManager: boolean;
  canUpdate: boolean;
  initialReadiness?: TaskCompletionReadiness | null;
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

export function TaskStatusPanel({ actorIsManager, canUpdate, initialReadiness = null, task }: TaskStatusPanelProps) {
  const requiredUpdateFields = useMemo(() => task.requiredUpdateFields ?? [], [task.requiredUpdateFields]);
  const [status, setStatus] = useState(task.status as TaskStatus);
  const [savedStatus, setSavedStatus] = useState(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [updateFieldValues, setUpdateFieldValues] = useState<Record<string, string | boolean>>(
    task.updateFieldValues ?? {}
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [overrideReason, setOverrideReason] = useState("");
  const allowedStatuses = canUpdate
    ? getAllowedMyTaskStatuses(
        {
          status: savedStatus,
          requiresManagerApproval: task.requiresManagerApproval
        },
        actorIsManager
      )
    : [];
  const quickActions = canUpdate
    ? getPrimaryMyTaskStatusActions(
        {
          status: savedStatus,
          requiresManagerApproval: task.requiresManagerApproval
        },
        actorIsManager
      )
    : [];
  const needsBlockerReason = status === TaskStatus.BLOCKED;
  const trimmedBlockerReason = blockerReason.trim();
  const hasGuidedUpdateFields = requiredUpdateFields.length > 0;
  const missingRequiredUpdateFields = useMemo(
    () => requiredUpdateFields.filter(
      (field) => field.required && !isGuidedUpdateFieldComplete(field, updateFieldValues[field.key])
    ),
    [requiredUpdateFields, updateFieldValues]
  );
  const guidedUpdateFieldsCompleteCount = requiredUpdateFields.filter((field) =>
    isGuidedUpdateFieldComplete(field, updateFieldValues[field.key])
  ).length;
  const shouldHighlightGuidedUpdates =
    hasGuidedUpdateFields && statusNeedsGuidedUpdateFields(status);
  const canSubmit =
    canUpdate &&
    !isSubmitting &&
    allowedStatuses.length > 0 &&
    (!needsBlockerReason || Boolean(trimmedBlockerReason));

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(REQUIRED_UPDATE_PROGRESS_EVENT, {
      detail: {
        taskId: task.id,
        missingFieldKeys: missingRequiredUpdateFields.map((field) => field.key),
        readyCount: guidedUpdateFieldsCompleteCount,
        totalCount: requiredUpdateFields.length
      }
    }));
  }, [guidedUpdateFieldsCompleteCount, missingRequiredUpdateFields, requiredUpdateFields.length, task.id]);

  async function submit(nextStatus: TaskStatus) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (readiness && statusNeedsGuidedUpdateFields(nextStatus)) {
        const readinessResponse = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/readiness`);
        const readinessResult = await readinessResponse.json().catch(() => null) as { readiness?: TaskCompletionReadiness; error?: string } | null;
        if (!readinessResponse.ok || !readinessResult?.readiness) {
          setErrorMessage(readinessResult?.error ?? "Unable to verify completion readiness.");
          return;
        }
        setReadiness(readinessResult.readiness);
        if (!readinessResult.readiness.ready && !readinessResult.readiness.completionOverride) {
          setErrorMessage("Complete the requirements shown below before moving this task forward.");
          return;
        }
      }
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
      setSavedStatus(result.task.status);
      setBlockerReason(result.task.blockerReason ?? "");
      setUpdateFieldValues(result.task.updateFieldValues ?? {});
      if (readiness && statusNeedsGuidedUpdateFields(result.task.status)) {
        setReadiness((current) => current ? { ...current, ready: true } : current);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="panel-card" id="required-task-update" tabIndex={-1}>
      <strong>Workflow action</strong>
      <h2>Update status</h2>
      <p>Use this panel to move the task forward, record a blocker, or complete manager review.</p>

      {!canUpdate ? (
        <p className="task-comments-readonly-copy">
          Only the assigned staff member or a manager can change this task&apos;s status.
        </p>
      ) : (
        <div className="my-task-action-grid">
          {readiness ? (
            <section className={readiness.ready ? "task-readiness-card task-readiness-ready" : "task-readiness-card"} aria-label="Completion readiness">
              <div><strong>{readiness.accepted ? "Task accepted" : "Accept this task"}</strong><span>{readiness.ready ? "Ready to move forward" : readiness.completionOverride ? "Manager override authorized" : `${readiness.requirements.filter((item) => !item.satisfied).length} requirements remaining`}</span></div>
              {!readiness.accepted ? <button disabled={isSubmitting} onClick={async () => {
                setIsSubmitting(true);
                setErrorMessage(null);
                try {
                  const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/readiness`, { method: "POST" });
                  const result = await response.json().catch(() => null) as { readiness?: TaskCompletionReadiness; error?: string } | null;
                  if (!response.ok || !result?.readiness) setErrorMessage(result?.error ?? "Unable to accept this task.");
                  else setReadiness(result.readiness);
                } finally {
                  setIsSubmitting(false);
                }
              }} type="button">Accept Task</button> : null}
              {!readiness.ready ? <ul>{readiness.requirements.filter((item) => !item.satisfied).map((item) => <li key={item.code}>{item.label}</li>)}</ul> : <p>Required work and evidence are complete.</p>}
              {readiness.completionOverride ? <div className="task-readiness-override"><strong>Manager override recorded</strong><p>{readiness.completionOverride.reason}</p></div> : null}
              {actorIsManager && !readiness.ready && !readiness.completionOverride ? <div className="task-readiness-override-form"><label><span>Override reason</span><textarea aria-label="Completion override reason" disabled={isSubmitting} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Explain why completion may proceed without the remaining evidence." rows={3} value={overrideReason} /></label><button disabled={isSubmitting || overrideReason.trim().length < 10} onClick={async () => {
                setIsSubmitting(true);
                setErrorMessage(null);
                try {
                  const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/readiness`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: overrideReason }) });
                  const result = await response.json().catch(() => null) as { readiness?: TaskCompletionReadiness; error?: string } | null;
                  if (!response.ok || !result?.readiness) setErrorMessage(result?.error ?? "Unable to record this completion override.");
                  else setReadiness(result.readiness);
                } finally {
                  setIsSubmitting(false);
                }
              }} type="button">Authorize Override</button></div> : null}
              <small>{task.requiresManagerApproval ? "Completion will move this task to Ready for Review." : "Completion can close this task directly."}</small>
            </section>
          ) : null}
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
                    {guidedUpdateFieldsCompleteCount} of {requiredUpdateFields.length} ready
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
                {requiredUpdateFields.map((field) => {
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
                          id={`task-update-${field.key}`}
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
                          id={`task-update-${field.key}`}
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
                          id={`task-update-${field.key}`}
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
                        id={`task-update-${field.key}`}
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
                    savedStatus,
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
              {isSubmitting ? "Saving..." : getTaskActionLabel(status, savedStatus, task.requiresManagerApproval)}
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
