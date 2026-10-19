"use client";

import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TaskDescriptionEditor({ canEdit, description, taskId }: { canEdit: boolean; description: string; taskId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [savedDescription, setSavedDescription] = useState(description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: draft.trim() })
      });
      const result = await response.json().catch(() => null) as { task?: { description: string | null }; error?: string } | null;
      if (!response.ok || !result?.task) throw new Error(result?.error ?? "Unable to save the description.");
      setSavedDescription(result.task.description ?? "");
      setEditing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the description.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="task-review-description">
      {editing ? <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label htmlFor={`description-${taskId}`}>Description</label>
        <textarea autoFocus disabled={saving} id={`description-${taskId}`} maxLength={2000} onChange={(event) => setDraft(event.target.value)} rows={4} value={draft} />
        <div>
          <button disabled={saving || !draft.trim() || draft.trim() === savedDescription.trim()} type="submit">{saving ? "Saving..." : "Save description"}</button>
          <button aria-label="Cancel description edit" disabled={saving} onClick={() => { setEditing(false); setError(null); }} title="Cancel" type="button"><X size={16} /></button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
      </form> : <>
        <p>{savedDescription}</p>
        {canEdit ? <button aria-label="Edit task description" onClick={() => { setDraft(savedDescription); setEditing(true); }} title="Edit description" type="button"><Pencil size={15} /></button> : null}
      </>}
    </div>
  );
}
