"use client";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, ExternalLink, Pencil } from "lucide-react";
import type { TaskReadModel } from "@/server/services/task-read";
import styles from "./task-source-context.module.css";

export function TaskSourceContext({ canEdit, task }: { canEdit: boolean; task: TaskReadModel }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(task.description ?? "");
  const [draft, setDraft] = useState(description);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const source = task.sourceContext;
  const rawLabel = source?.sourceKind ?? task.sourceType;
  const label = rawLabel.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  const compactLabel = /quick update/i.test(label) ? "Workbook Quick Update" : /checklist/i.test(label) ? "Workbook checklist" : /workbook/i.test(label) ? "Workbook" : label;
  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true); setNotice("");
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: draft.trim() }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update the task description.");
      setDescription(draft.trim()); setEditing(false); setNotice("Task description updated.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update the task description."); }
    finally { setSaving(false); }
  }
  return <section className={styles.source} aria-label="Task source and context">
    <div className={styles.bar}>
      <span title={label}><BookOpen size={15} /><b>Source:</b> {compactLabel}</span>
      <button type="button" aria-label={open ? "Hide source context" : "View source context"} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Hide" : "Context"}</button>
      {canEdit ? <button aria-label="Refine task" type="button" onClick={() => { setDraft(description); setEditing(true); setOpen(true); setNotice(""); }}><Pencil size={14} /> Refine</button> : null}
    </div>
    {open ? <div className={styles.details}>
      <dl><div><dt>Created from</dt><dd>{label}</dd></div>{source?.channel ? <div><dt>Channel</dt><dd>{source.channel}</dd></div> : null}{source?.sourceId ? <div><dt>Source reference</dt><dd>{source.sourceId}</dd></div> : null}</dl>
      <div><b>Original workbook context</b><p>{source?.text || description || "No additional source context was preserved for this older task."}</p></div>
      {source?.href ? <Link href={source.href}><ExternalLink size={15} /> Open source in workbook</Link> : <small>A direct workbook link is unavailable because this task does not contain a verified workbook source reference.</small>}
      {editing ? <div className={styles.editor} role="group" aria-label="Refine task description">
        <label>Task description<textarea maxLength={4000} disabled={saving} value={draft} onChange={event => setDraft(event.target.value)} /></label>
        <p>Refining the task does not overwrite its original workbook context.</p>
        <span><button disabled={saving || !draft.trim() || draft.trim() === description} type="button" onClick={() => void save()}>{saving ? "Saving…" : "Save task changes"}</button><button disabled={saving} type="button" onClick={() => { setEditing(false); setDraft(description); setNotice(""); }}>Cancel</button></span>
      </div> : null}
      {notice ? <p role="status">{notice}</p> : null}
    </div> : null}
  </section>;
}
