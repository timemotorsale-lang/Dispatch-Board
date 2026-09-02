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
import {
  getTaskMomentumState,
  normalizeTaskExecutionAssurance,
  type TaskExecutionAssurance
} from "@/lib/task-execution-assurance";

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
        executionAssurance: TaskExecutionAssurance;
        updateFieldValues?: Record<string, string | boolean>;
      };
      error?: string;
    }
  | null;

function statusNeedsGuidedUpdateFields(status: TaskStatus) {
  return status === TaskStatus.READY_FOR_REVIEW || status === TaskStatus.COMPLETED;
}

function isGuidedUpdateFieldComplete(value: string | boolean | undefined) {
  if (typeof value === "boolean") {
    return true;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatAssuranceTime(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time needs review";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function defaultBlockerTime(hoursFromNow: number) {
  return toDateTimeLocal(new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString());
}

const momentumLabels = {
  NOT_STARTED: "Starts when work begins",
  ON_TRACK: "On track",
  CHECK_IN_DUE: "Check-in due soon",
  STALLED: "Check-in overdue",
  BLOCKED: "Blocked — recovery plan active",
  WAITING: "Waiting — follow-up remains visible",
  READY_FOR_REVIEW: "Ready for review",
  COMPLETED: "Completed"
} as const;

function getGuidedUpdateFieldPresentation(
  field: TaskReadModel["requiredUpdateFields"][number]
) {
  if (field.key === "focus_summary") {
    return {
      label: "Review summary",
      helpText: "What did you review, and what did you find?",
      placeholder: "Example: Reviewed overdue work and found two ownership gaps."
    };
  }

  if (field.key === "top_priority") {
    return {
      label: "Highest-priority next action",
      helpText: "What must happen next, who owns it, and when is it due?",
      placeholder: "Example: Assign the overdue service task to Walter by 10:00 AM."
    };
  }

  return {
    label: field.label,
    helpText: field.helpText,
    placeholder: field.helpText
  };
}

export function TaskStatusPanel({ actorIsManager, canUpdate, initialReadiness = null, task }: TaskStatusPanelProps) {
  const initialAssurance = normalizeTaskExecutionAssurance(task.executionAssurance);
  const requiredUpdateFields = useMemo(() => task.requiredUpdateFields ?? [], [task.requiredUpdateFields]);
  const requiredCompletionFields = useMemo(
    () => requiredUpdateFields.filter((field) => field.required),
    [requiredUpdateFields]
  );
  const [status, setStatus] = useState(task.status as TaskStatus);
  const [savedStatus, setSavedStatus] = useState(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [assurance, setAssurance] = useState<TaskExecutionAssurance>(initialAssurance);
  const [progressNote, setProgressNote] = useState("");
  const [nextCheckpointAt, setNextCheckpointAt] = useState(
    toDateTimeLocal(initialAssurance.nextCheckpointAt)
  );
  const [unblockAction, setUnblockAction] = useState(
    initialAssurance.blockerPlan?.unblockAction ?? ""
  );
  const [blockerOwner, setBlockerOwner] = useState(
    initialAssurance.blockerPlan?.owner ?? task.assignedUser.name
  );
  const [blockerReviewAt, setBlockerReviewAt] = useState(
    toDateTimeLocal(initialAssurance.blockerPlan?.reviewAt) ||
      (task.status === TaskStatus.BLOCKED ? defaultBlockerTime(2) : "")
  );
  const [blockerEscalationAt, setBlockerEscalationAt] = useState(
    toDateTimeLocal(initialAssurance.blockerPlan?.escalationAt) ||
      (task.status === TaskStatus.BLOCKED ? defaultBlockerTime(4) : "")
  );
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
  const blockerPlanComplete = Boolean(
    unblockAction.trim() &&
    blockerOwner.trim() &&
    blockerReviewAt &&
    blockerEscalationAt
  );
  const momentumState = getTaskMomentumState(savedStatus, assurance);
  const hasGuidedUpdateFields = requiredUpdateFields.length > 0;
  const missingRequiredUpdateFields = useMemo(
    () => requiredCompletionFields.filter(
      (field) => !isGuidedUpdateFieldComplete(updateFieldValues[field.key])
    ),
    [requiredCompletionFields, updateFieldValues]
  );
  const guidedUpdateFieldsCompleteCount = requiredCompletionFields.filter((field) =>
    isGuidedUpdateFieldComplete(updateFieldValues[field.key])
  ).length;
  const shouldHighlightGuidedUpdates =
    hasGuidedUpdateFields && statusNeedsGuidedUpdateFields(status);
  const canSubmit =
    canUpdate &&
    !isSubmitting &&
    allowedStatuses.length > 0 &&
    (!needsBlockerReason || Boolean(trimmedBlockerReason) && blockerPlanComplete);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(REQUIRED_UPDATE_PROGRESS_EVENT, {
      detail: {
        taskId: task.id,
        missingFieldKeys: missingRequiredUpdateFields.map((field) => field.key),
        readyCount: guidedUpdateFieldsCompleteCount,
        totalCount: requiredCompletionFields.length
      }
    }));
  }, [guidedUpdateFieldsCompleteCount, missingRequiredUpdateFields, requiredCompletionFields.length, task.id]);

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
          ...(progressNote.trim() ? { progressNote: progressNote.trim() } : {}),
          ...(nextCheckpointAt ? { nextCheckpointAt: new Date(nextCheckpointAt).toISOString() } : {}),
          ...(nextStatus === TaskStatus.BLOCKED ? {
            blockerReason: trimmedBlockerReason,
            blockerPlan: {
              unblockAction: unblockAction.trim(),
              owner: blockerOwner.trim(),
              reviewAt: new Date(blockerReviewAt).toISOString(),
              escalationAt: new Date(blockerEscalationAt).toISOString()
            }
          } : {}),
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
      setAssurance(result.task.executionAssurance);
      setNextCheckpointAt(toDateTimeLocal(result.task.executionAssurance.nextCheckpointAt));
      setProgressNote("");
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
          {savedStatus !== TaskStatus.NOT_STARTED ? (
            <section className={`task-momentum-card task-momentum-${momentumState.toLowerCase()}`} aria-label="Task momentum">
              <div className="task-momentum-heading">
                <div>
                  <strong>Progress assurance</strong>
                  <span>{momentumLabels[momentumState]}</span>
                </div>
                <small>Next check-in: {formatAssuranceTime(assurance.nextCheckpointAt)}</small>
              </div>
              {assurance.lastProgressNote ? (
                <p>
                  <b>
                    Latest progress
                    {assurance.lastProgressAt ? ` recorded ${formatAssuranceTime(assurance.lastProgressAt)}` : ""}
                    :
                  </b>{" "}
                  {assurance.lastProgressNote}
                </p>
              ) : (
                <p>Add a brief outcome when meaningful progress is made. The next check-in will renew automatically.</p>
              )}
              {savedStatus === TaskStatus.IN_PROGRESS ? (
                <div className="task-momentum-fields">
                  <label className="field">
                    <span>Progress made</span>
                    <textarea
                      disabled={isSubmitting}
                      onChange={(event) => setProgressNote(event.target.value)}
                      placeholder="What changed, what was completed, or what happens next?"
                      rows={2}
                      value={progressNote}
                    />
                  </label>
                  <label className="field">
                    <span>Next check-in</span>
                    <input
                      disabled={isSubmitting}
                      onChange={(event) => setNextCheckpointAt(event.target.value)}
                      type="datetime-local"
                      value={nextCheckpointAt}
                    />
                  </label>
                  <button
                    className="pill pill-secondary"
                    disabled={isSubmitting || !progressNote.trim()}
                    onClick={() => void submit(savedStatus)}
                    type="button"
                  >
                    Record progress
                  </button>
                </div>
              ) : null}
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
                    {guidedUpdateFieldsCompleteCount} of {requiredCompletionFields.length} required fields complete
                  </span>
                  {shouldHighlightGuidedUpdates && missingRequiredUpdateFields.length > 0 ? (
                    <small>Needed for review or completion</small>
                  ) : (
                    <small>Saved when you submit this update</small>
                  )}
                </div>
              </div>

              {shouldHighlightGuidedUpdates && missingRequiredUpdateFields.length > 0 ? (
                <div className="my-task-guided-update-warning" role="status">
                  Missing: {missingRequiredUpdateFields.map((field) => getGuidedUpdateFieldPresentation(field).label).join(", ")}
                </div>
              ) : null}

              <div className="my-task-guided-update-fields">
                {requiredUpdateFields.map((field) => {
                  const value = updateFieldValues[field.key];
                  const isComplete = isGuidedUpdateFieldComplete(value);
                  const fieldPresentation = getGuidedUpdateFieldPresentation(field);
                  const fieldClassName = [
                    "field",
                    "my-task-guided-field",
                    isComplete
                      ? "my-task-guided-field-complete"
                      : field.required
                        ? "my-task-guided-field-required"
                        : ""
                  ].filter(Boolean).join(" ");
                  const fieldHeading = (
                    <span className="my-task-guided-field-heading">
                      <span>{fieldPresentation.label}{field.required ? " *" : ""}</span>
                      <small data-state={field.required ? (isComplete ? "complete" : "required") : "optional"}>
                        {field.required ? (isComplete ? "✓ Complete" : "Required") : "Optional"}
                      </small>
                    </span>
                  );

                  if (field.type === "boolean") {
                    return (
                      <label
                        className={fieldClassName}
                        key={field.key}
                      >
                        {fieldHeading}
                        <select
                          id={`task-update-${field.key}`}
                          disabled={isSubmitting}
                          aria-label={fieldPresentation.label}
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
                        {fieldPresentation.helpText ? <small className="field-hint">{fieldPresentation.helpText}</small> : null}
                      </label>
                    );
                  }

                  if (field.type === "single_select") {
                    return (
                      <label
                        className={fieldClassName}
                        key={field.key}
                      >
                        {fieldHeading}
                        <select
                          id={`task-update-${field.key}`}
                          disabled={isSubmitting}
                          aria-label={fieldPresentation.label}
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
                        {fieldPresentation.helpText ? <small className="field-hint">{fieldPresentation.helpText}</small> : null}
                      </label>
                    );
                  }

                  if (field.type === "long_text") {
                    return (
                      <label
                        className={fieldClassName}
                        key={field.key}
                      >
                        {fieldHeading}
                        <textarea
                          id={`task-update-${field.key}`}
                          disabled={isSubmitting}
                          aria-label={fieldPresentation.label}
                          placeholder={fieldPresentation.placeholder ?? undefined}
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
                        {fieldPresentation.helpText ? <small className="field-hint">{fieldPresentation.helpText}</small> : null}
                      </label>
                    );
                  }

                  return (
                    <label
                      className={fieldClassName}
                      key={field.key}
                    >
                      {fieldHeading}
                      <input
                        id={`task-update-${field.key}`}
                        disabled={isSubmitting}
                        aria-label={fieldPresentation.label}
                        placeholder={fieldPresentation.placeholder ?? undefined}
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) => {
                          setUpdateFieldValues((current) => ({
                            ...current,
                            [field.key]: event.target.value
                          }));
                          setErrorMessage(null);
                        }}
                      />
                      {fieldPresentation.helpText ? <small className="field-hint">{fieldPresentation.helpText}</small> : null}
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
                    if (statusOption.value === TaskStatus.BLOCKED) {
                      if (!blockerReviewAt) setBlockerReviewAt(defaultBlockerTime(2));
                      if (!blockerEscalationAt) setBlockerEscalationAt(defaultBlockerTime(4));
                    }
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
                const nextStatus = event.target.value as TaskStatus;
                setStatus(nextStatus);
                if (nextStatus === TaskStatus.BLOCKED) {
                  if (!blockerReviewAt) setBlockerReviewAt(defaultBlockerTime(2));
                  if (!blockerEscalationAt) setBlockerEscalationAt(defaultBlockerTime(4));
                }
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
            <section className="task-blocker-contract" aria-label="Blocker recovery plan">
              <div>
                <strong>Blocker recovery plan</strong>
                <p>Make the path back to progress visible and time-bound.</p>
              </div>
              <label className="field my-task-blocker-field">
                <span>What is blocking the task?</span>
                <input disabled={isSubmitting} onChange={(event) => setBlockerReason(event.target.value)} placeholder="Example: Waiting for lender paperwork" value={blockerReason} />
              </label>
              <label className="field">
                <span>Action that will unblock it</span>
                <input disabled={isSubmitting} onChange={(event) => setUnblockAction(event.target.value)} placeholder="Example: Call lender and request missing page" value={unblockAction} />
              </label>
              <label className="field">
                <span>Responsible person</span>
                <input disabled={isSubmitting} onChange={(event) => setBlockerOwner(event.target.value)} value={blockerOwner} />
              </label>
              <div className="task-blocker-contract-times">
                <label className="field">
                  <span>Review again</span>
                  <input disabled={isSubmitting} onChange={(event) => setBlockerReviewAt(event.target.value)} type="datetime-local" value={blockerReviewAt} />
                </label>
                <label className="field">
                  <span>Escalate if unresolved</span>
                  <input disabled={isSubmitting} onChange={(event) => setBlockerEscalationAt(event.target.value)} type="datetime-local" value={blockerEscalationAt} />
                </label>
              </div>
              <small className="field-hint">All five items are required so blocked work cannot disappear.</small>
            </section>
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
