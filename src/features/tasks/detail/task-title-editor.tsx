"use client";

import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TaskTitleEditorProps = {
  onSaved?: (task: { id: string; title: string }) => Promise<void> | void;
  taskId: string;
  title: string;
};

type TaskTitleUpdateResponse =
  | {
      task?: {
        id: string;
        title: string;
      };
      error?: string;
    }
  | null;

export function TaskTitleEditor({ onSaved, taskId, title }: TaskTitleEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedTitle = draftTitle.trim();
  const hasChanges = trimmedTitle !== title.trim();

  function reset() {
    setDraftTitle(title);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditing(false);
  }

  async function submit() {
    if (!trimmedTitle) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (!hasChanges) {
      reset();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: trimmedTitle
        })
      });
      const result = (await response.json().catch(() => null)) as TaskTitleUpdateResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to save the task title right now.");
        return;
      }

      setSuccessMessage("Task title saved.");
      setIsEditing(false);
      await onSaved?.(result.task);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the task title right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="task-title-editor">
        <div>
          <h1>{title}</h1>
          {successMessage ? <p role="status">{successMessage}</p> : null}
        </div>
        <button
          aria-label="Edit task title"
          className="task-title-editor-icon"
          onClick={() => {
            setDraftTitle(title);
            setErrorMessage(null);
            setSuccessMessage(null);
            setIsEditing(true);
          }}
          type="button"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <form
      className="task-title-editor task-title-editor-editing"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label>
        <span>Task title</span>
        <input
          autoFocus
          maxLength={160}
          value={draftTitle}
          onChange={(event) => {
            setDraftTitle(event.target.value);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        />
      </label>
      <div className="task-title-editor-actions">
        <button disabled={isSubmitting || !hasChanges} type="submit">
          {isSubmitting ? "Saving..." : "Save"}
        </button>
        <button aria-label="Cancel title edit" disabled={isSubmitting} onClick={reset} type="button">
          <X size={14} />
        </button>
      </div>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
    </form>
  );
}
