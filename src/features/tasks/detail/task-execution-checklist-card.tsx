"use client";
import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

type TaskSubtaskExpandResponse = {
  task?: {
    id: string;
    href: string;
    title: string;
  };
  error?: string;
} | null;

type TaskExecutionChecklistCardProps = {
  allowCreate?: boolean;
  allowDelete?: boolean;
  allowExpandToTask?: boolean;
  allowToggle?: boolean;
  createPlaceholder?: string;
  embedded?: boolean;
  initialItems: ExecutionChecklistItem[];
  kind: TaskChecklistItemKindValue;
  onActivityChanged?: () => void;
  taskId: string;
  title: string;
};

function normalizeChecklistLabelForView(label: string) {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function dedupeChecklistItems(items: ExecutionChecklistItem[]) {
  const byLabel = new Map<string, ExecutionChecklistItem>();

  for (const item of items) {
    const key = normalizeChecklistLabelForView(item.label);
    const existingItem = byLabel.get(key);

    if (!existingItem || item.completed) {
      byLabel.set(key, {
        ...item,
        completed: existingItem?.completed || item.completed
      });
    }
  }

  return Array.from(byLabel.values());
}

export function TaskExecutionChecklistCard({
  allowCreate = false,
  allowDelete = false,
  allowExpandToTask = false,
  allowToggle = true,
  createPlaceholder = "Add item",
  embedded = false,
  initialItems,
  kind,
  onActivityChanged,
  taskId,
  title
}: TaskExecutionChecklistCardProps) {
  const router = useRouter();
  const [items, setItems] = useState(() => dedupeChecklistItems(initialItems));
  const [draftLabel, setDraftLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setItems(dedupeChecklistItems(initialItems));
  }, [initialItems]);

  function isTransientItemId(itemId: string) {
    return itemId.includes("-adaptive-") || itemId.includes("-template-") || itemId.includes("-subtask-");
  }

  async function ensurePersistedItem(item: ExecutionChecklistItem) {
    if (!isTransientItemId(item.id)) {
      return item.id;
    }

    const createResponse = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, label: item.label })
    });
    const createResult = (await createResponse.json().catch(() => null)) as TaskChecklistItemResponse;

    if (!createResponse.ok || !createResult?.item) {
      setErrorMessage(createResult?.error ?? "Unable to initialize this checklist item right now.");
      return null;
    }

    const persistedItem = createResult.item;
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, id: persistedItem.id, completed: persistedItem.completed }
          : currentItem
      )
    );

    return persistedItem.id;
  }

  async function toggleItem(item: ExecutionChecklistItem) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const persistedItemId = await ensurePersistedItem(item);
      if (!persistedItemId) return;

      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(persistedItemId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            completed: !item.completed
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
          item.id === persistedItemId ? { ...item, completed: result.item?.completed ?? item.completed } : item
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

  async function expandItemToTask(item: ExecutionChecklistItem) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const persistedItemId = await ensurePersistedItem(item);
      if (!persistedItemId) return;

      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(persistedItemId)}/expand`,
        { method: "POST" }
      );
      const result = (await response.json().catch(() => null)) as TaskSubtaskExpandResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to open this subtask as a task right now.");
        return;
      }

      const returnPath = `${window.location.pathname}${window.location.search}`;
      const destination = `${result.task.href}&returnTo=${encodeURIComponent(returnPath)}`;
      router.push(destination);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to open this subtask as a task right now.");
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

  async function deleteItem(item: ExecutionChecklistItem) {
    if (!window.confirm(`Delete subtask "${item.label}"?`)) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(item.id)}`,
        { method: "DELETE" }
      );
      const result = (await response.json().catch(() => null)) as TaskChecklistItemResponse;

      if (!response.ok) {
        setErrorMessage(result?.error ?? "Unable to delete this subtask right now.");
        return;
      }

      setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
      onActivityChanged?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete this subtask right now.");
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
          <div className="task-workspace-subtask-item" key={item.id}>
            <label>
              <input
                checked={item.completed}
                disabled={isSaving || !allowToggle}
                onChange={() => void toggleItem(item)}
                type="checkbox"
              />
              <span>{item.label}</span>
            </label>
            <div className="task-workspace-subtask-actions">
              {allowExpandToTask ? (
                <button
                  aria-label={`Open subtask ${item.label} as a task`}
                  className="task-workspace-subtask-open"
                  disabled={isSaving}
                  onClick={() => void expandItemToTask(item)}
                  type="button"
                >
                  <ExternalLink aria-hidden="true" size={13} />
                  <span>Open task</span>
                </button>
              ) : null}
              {allowDelete && !isTransientItemId(item.id) ? (
                <button
                  aria-label={`Delete subtask ${item.label}`}
                  className="task-workspace-subtask-delete"
                  disabled={isSaving}
                  onClick={() => void deleteItem(item)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              ) : null}
            </div>
          </div>
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
