"use client";

import { useState } from "react";

import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { TaskReadModel } from "@/server/services/task-read";

type TaskAssignmentPanelProps = {
  assignableUsers: ActiveUserSummary[];
  task: TaskReadModel;
};

type TaskAssignmentResponse =
  | {
      task?: {
        id: string;
        assignedUser: {
          id: string;
          name: string;
          email?: string;
        };
        recommendedUser: {
          id: string;
          name: string;
          email?: string;
        } | null;
        recommendation: {
          reasonCode: string;
          explanation: string;
        } | null;
      };
      error?: string;
    }
  | null;

export function TaskAssignmentPanel({ assignableUsers, task }: TaskAssignmentPanelProps) {
  const [currentAssignedUserId, setCurrentAssignedUserId] = useState(task.assignedUser.id);
  const [assignedUserId, setAssignedUserId] = useState(task.assignedUser.id);
  const [assignedUserName, setAssignedUserName] = useState(task.assignedUser.name);
  const [recommendedUserName, setRecommendedUserName] = useState(task.recommendedUser?.name ?? null);
  const [recommendationExplanation, setRecommendationExplanation] = useState(
    task.recommendation?.explanation ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasRecommendationOverride =
    Boolean(recommendedUserName) && assignedUserName !== recommendedUserName;
  const canSubmit = !isSubmitting && assignedUserId !== currentAssignedUserId;

  async function submit() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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

      setCurrentAssignedUserId(result.task.assignedUser.id);
      setAssignedUserId(result.task.assignedUser.id);
      setAssignedUserName(result.task.assignedUser.name);
      setRecommendedUserName(result.task.recommendedUser?.name ?? null);
      setRecommendationExplanation(result.task.recommendation?.explanation ?? null);
      setSuccessMessage(`Assigned to ${result.task.assignedUser.name}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reassign this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="panel-card">
      <strong>Task assignment</strong>
      <h2>Reassign task</h2>
      <p>Owner: {(task.ownerUser ?? task.assignedUser).name}</p>

      <div className="my-task-action-grid">
        <label className="field">
          <span>Assigned to</span>
          <select
            disabled={isSubmitting}
            value={assignedUserId}
            onChange={(event) => {
              setAssignedUserId(event.target.value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>

        {recommendedUserName ? (
          <div className="task-comments-readonly-copy">
            <p>
              Recommended assignee: <strong>{recommendedUserName}</strong>
              {hasRecommendationOverride ? " (currently overridden)" : ""}
            </p>
            {recommendationExplanation ? <p>{recommendationExplanation}</p> : null}
          </div>
        ) : (
          <p className="task-comments-readonly-copy">No recommendation is stored for this task.</p>
        )}

        <div className="my-task-actions">
          <button
            className="pill pill-primary"
            disabled={!canSubmit}
            onClick={() => void submit()}
            type="button"
          >
            {isSubmitting ? "Saving..." : "Save assignment"}
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="notice notice-success my-task-inline-notice" role="status">
          <p>{successMessage}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </article>
  );
}
