"use client";

import { useEffect, useState } from "react";

import { RichTextComposer, RichTextContent } from "@/components/ui/rich-text-composer";
import {
  canSubmitTaskComment
} from "@/features/tasks/task-comments-panel";
import { formatTaskDetailDateTime } from "@/features/tasks/detail/task-detail-mappers";
import type { TaskCommentReadModel } from "@/server/services/task-read";

type UnifiedFeedItem = {
  actorName: string;
  createdAt: string;
  id: string;
  kind: "comment" | "event";
  message: string;
};

type TaskUpdatesCommentsCardProps = {
  canComment: boolean;
  compact?: boolean;
  initialFeedItems: UnifiedFeedItem[];
  onActivityChanged?: () => void;
  refreshKey?: number;
  taskId: string;
};

type TaskCommentCreateResponse = {
  comment?: TaskCommentReadModel;
  error?: string;
} | null;

const TASK_NOTE_SHORTCUTS = [
  { label: "Customer contacted", text: "Customer contacted — outcome: " },
  { label: "DMV called", text: "DMV called — outcome: " },
  { label: "Waiting on document", text: "Waiting on document — document/owner: " },
  { label: "Follow-up scheduled", text: "Follow-up scheduled — date/time: " }
];

export function TaskUpdatesCommentsCard({
  canComment,
  compact = false,
  initialFeedItems,
  onActivityChanged,
  refreshKey = 0,
  taskId
}: TaskUpdatesCommentsCardProps) {
  const [feedItems, setFeedItems] = useState(initialFeedItems);
  const [draftBody, setDraftBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (refreshKey === 0) {
      return;
    }

    let isCancelled = false;

    async function refreshActivity() {
      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/activity`, {
          method: "GET"
        });
        const result = (await response.json().catch(() => null)) as
          | { error?: string; feedItems?: UnifiedFeedItem[] }
          | null;

        if (!response.ok || !result?.feedItems) {
          if (!isCancelled) {
            setErrorMessage(result?.error ?? "Unable to refresh task activity right now.");
          }
          return;
        }

        if (!isCancelled) {
          setFeedItems(result.feedItems);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to refresh task activity right now."
          );
        }
      }
    }

    void refreshActivity();

    return () => {
      isCancelled = true;
    };
  }, [refreshKey, taskId]);

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

      const comment = result.comment;

      setFeedItems((currentItems) => [
        {
          id: `comment-${comment.id}`,
          actorName: comment.author.name,
          createdAt: comment.createdAt,
          kind: "comment",
          message: comment.body
        },
        ...currentItems
      ]);
      setDraftBody("");
      onActivityChanged?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this update right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function insertQuickNote(text: string) {
    setDraftBody((current) => `${current.trimEnd()}${current.trim() ? "\n" : ""}${text}`.slice(0, 2000));
    setErrorMessage(null);
  }

  if (compact) {
    return (
      <section className="etw-notes-card">
        <div className="etw-note-heading"><strong>Case Notes</strong><span>{feedItems.filter((item) => item.kind === "comment").length}</span></div>
        {canComment ? (
          <form className="etw-note-composer" onSubmit={handleSubmit}>
            <RichTextComposer
              ariaLabel="Post a comment"
              compact
              disabled={isSubmitting}
              helperText="Select text before applying Bold or Link. Use a shortcut below to start a structured note."
              onChange={(value) => {
                setDraftBody(value);
                setErrorMessage(null);
              }}
              placeholder="Add a note... use @ to mention"
              rows={2}
              toolbarVariant="task-note"
              value={draftBody}
            />
            <button disabled={!canSubmitTaskComment(draftBody, isSubmitting)} type="submit">{isSubmitting ? "Adding..." : "Add Note"}</button>
          </form>
        ) : <p className="task-workspace-empty-copy">Only the assigned staff member or a manager can add notes.</p>}
        {canComment ? <div aria-label="Note shortcuts" className="etw-note-actions">{TASK_NOTE_SHORTCUTS.map((shortcut) => <button aria-label={`Insert ${shortcut.label} note`} key={shortcut.label} onClick={() => insertQuickNote(shortcut.text)} type="button">{shortcut.label}</button>)}</div> : null}
        {errorMessage ? <div className="notice notice-danger my-task-inline-notice" role="alert"><p>{errorMessage}</p></div> : null}
      </section>
    );
  }

  return (
    <section className="enterprise-detail-card enterprise-workspace-module">
      <div className="enterprise-workspace-module-header">
        <strong>Updates & Comments</strong>
        <span>Activity stream</span>
      </div>

      <div className="task-workspace-activity-stream">
        {feedItems.length === 0 ? (
          <p className="task-workspace-empty-copy">
            No activity has been recorded for this task yet.
          </p>
        ) : (
          feedItems.map((item) => (
            <article className="task-workspace-feed-item" key={item.id}>
              <div className="task-workspace-feed-dot" aria-hidden="true" />
              <div>
                <strong>
                  {item.actorName} {item.kind === "comment" ? "commented" : "updated"}
                </strong>
                {item.kind === "comment" ? <RichTextContent value={item.message} /> : <p>{item.message}</p>}
                <small>{formatTaskDetailDateTime(item.createdAt)}</small>
              </div>
            </article>
          ))
        )}
      </div>

      {canComment ? (
        <form className="task-workspace-comment-form" onSubmit={handleSubmit}>
          <div className="field rich-text-field">
            <span>Post a comment</span>
            <RichTextComposer
              ariaLabel="Post a comment"
              disabled={isSubmitting}
              onChange={(value) => {
                setDraftBody(value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              placeholder="@mention or add an operational update"
              rows={4}
              value={draftBody}
            />
          </div>
          <div className="task-workspace-comment-actions">
            <button
              className="pill pill-primary"
              disabled={!canSubmitTaskComment(draftBody, isSubmitting)}
              type="submit"
            >
              {isSubmitting ? "Sending..." : "Comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="task-workspace-empty-copy">
          Only the assigned staff member or a manager can add updates here.
        </p>
      )}

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
