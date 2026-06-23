"use client";

import { useState } from "react";

import type { TaskCommentReadModel } from "@/server/services/task-read";

type TaskCommentsPanelProps = {
  canComment: boolean;
  initialComments: TaskCommentReadModel[];
  taskId: string;
};

type TaskCommentCreateResponse = {
  comment?: TaskCommentReadModel;
  error?: string;
} | null;

export function appendTaskComment(
  currentComments: TaskCommentReadModel[],
  nextComment: TaskCommentReadModel
) {
  const existingCommentIndex = currentComments.findIndex((comment) => comment.id === nextComment.id);

  if (existingCommentIndex === -1) {
    return [...currentComments, nextComment];
  }

  return currentComments.map((comment) => (comment.id === nextComment.id ? nextComment : comment));
}

export function canSubmitTaskComment(body: string, isSubmitting: boolean) {
  return !isSubmitting && Boolean(body.trim());
}

function formatCommentTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function TaskCommentsPanel({
  canComment,
  initialComments,
  taskId
}: TaskCommentsPanelProps) {
  const [comments, setComments] = useState(initialComments);
  const [draftBody, setDraftBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftBody.trim()) {
      setErrorMessage("Enter an update before saving.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          body: draftBody
        })
      });
      const result = (await response.json().catch(() => null)) as TaskCommentCreateResponse;

      if (!response.ok || !result?.comment) {
        setErrorMessage(result?.error ?? "Unable to save this update right now.");
        return;
      }

      setComments((currentComments) => appendTaskComment(currentComments, result.comment!));
      setDraftBody("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this update right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="panel-card task-comments-card" id="task-updates">
      <div className="task-comments-header">
        <div>
          <strong>Updates</strong>
          <h2>Task comments</h2>
        </div>
        <p>Keep this focused on operational progress, blockers, and handoff-ready notes.</p>
      </div>

      {comments.length === 0 ? (
        <div className="notice task-comments-empty-state" role="status">
          <p>No updates yet.</p>
        </div>
      ) : (
        <div className="task-comments-list">
          {comments.map((comment) => (
            <article className="task-comment-card" key={comment.id}>
              <div className="task-comment-meta">
                <strong>{comment.author.name}</strong>
                <span>{formatCommentTimestamp(comment.createdAt)}</span>
              </div>
              <p className="task-comment-body">{comment.body}</p>
            </article>
          ))}
        </div>
      )}

      {canComment ? (
        <form className="task-comments-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Add update</span>
            <textarea
              disabled={isSubmitting}
              maxLength={2000}
              placeholder="Share the latest status, blocker, or next step."
              rows={4}
              value={draftBody}
              onChange={(event) => {
                setDraftBody(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
            />
            <small className="field-hint">Plain text only. Line breaks are preserved.</small>
          </label>

          <div className="task-comments-actions">
            <button className="pill pill-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Add update"}
            </button>
            {!canSubmitTaskComment(draftBody, isSubmitting) ? (
              <p className="task-comments-helper-copy">Enter a short update to post it.</p>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="task-comments-readonly-copy">
          Only the assigned staff member or a manager can add updates to this task.
        </p>
      )}

      {errorMessage ? (
        <div className="notice notice-danger" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </article>
  );
}
