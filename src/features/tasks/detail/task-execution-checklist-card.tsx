"use client";
import { useState } from "react";

import { type TaskChecklistItemKindValue } from "@/lib/task-checklist-kind";
import type {
  TaskDetailChecklistItem,
  TaskDetailSubtaskItem
} from "@/features/tasks/detail/task-detail-mappers";

type ExecutionChecklistItem = TaskDetailChecklistItem | TaskDetailSubtaskItem;

type TaskChecklistItemResponse = {
  item?: {
    id: string;
    label: string;
    completed: boolean;
  };
  error?: string;
} | null;

type TaskExecutionChecklistCardProps = {
  allowCreate?: boolean;
  createPlaceholder?: string;
  embedded?: boolean;
  initialItems: ExecutionChecklistItem[];
  kind: TaskChecklistItemKindValue;
  onActivityChanged?: () => void;
  taskId: string;
  title: string;
};

export function TaskExecutionChecklistCard({
  allowCreate = false,
  createPlaceholder = "Add item",
  embedded = false,
  initialItems,
  kind,
  onActivityChanged,
  taskId,
  title
}: TaskExecutionChecklistCardProps) {
  const [items, setItems] = useState(initialItems);
  const [draftLabel, setDraftLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function toggleItem(itemId: string, completed: boolean) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            completed: !completed
          })
        }
      );
      const result = (await response.json().catch(() => null)) as TaskChecklistItemResponse;

      if (!response.ok || !result?.item) {
        setErrorMessage(result?.error ?? "Unable to update this checklist item right now.");
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId ? { ...item, completed: result.item?.completed ?? item.completed } : item
        )
      );
      onActivityChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update this checklist item right now."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function addItem() {
    const trimmedLabel = draftLabel.trim();

    if (!trimmedLabel) {
      setErrorMessage("Enter a label before adding a new checklist item.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/checklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kind,
          label: trimmedLabel
        })
      });
      const result = (await response.json().catch(() => null)) as TaskChecklistItemResponse;

      if (!response.ok || !result?.item) {
        setErrorMessage(result?.error ?? "Unable to add this checklist item right now.");
        return;
      }

      const createdItem = result.item;

      setItems((currentItems) => [
        ...currentItems,
        {
          id: createdItem.id,
          label: createdItem.label,
          completed: createdItem.completed
        }
      ]);
      setDraftLabel("");
      onActivityChanged?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add this checklist item right now.");
    } finally {
      setIsSaving(false);
    }
  }

  const content = (
    <>
      <div className="enterprise-workspace-module-header">
        <strong>{title}</strong>
        <span>{items.filter((item) => item.completed).length}/{items.length}</span>
      </div>

      <div className="task-workspace-subtask-grid">
        {items.map((item) => (
          <label className="task-workspace-subtask-item" key={item.id}>
            <input
              checked={item.completed}
              disabled={isSaving}
              onChange={() => toggleItem(item.id, item.completed)}
              type="checkbox"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      {allowCreate ? (
        <div className="task-workspace-inline-create">
          <input
            aria-label={createPlaceholder}
            placeholder={createPlaceholder}
            value={draftLabel}
            onChange={(event) => {
              setDraftLabel(event.target.value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
          />
          <button
            className="pill pill-secondary"
            disabled={isSaving}
            onClick={addItem}
            type="button"
          >
            {isSaving ? "Saving..." : "Add"}
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notice notice-danger my-task-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return content;
  }

  return <section className="enterprise-detail-card enterprise-workspace-module">{content}</section>;
}
