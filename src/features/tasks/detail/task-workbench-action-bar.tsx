"use client";

import { Check, Clipboard, Focus, Link2, MoreHorizontal, Share2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function TaskWorkbenchActionBar({ canComplete, returnTo, status, taskId }: { canComplete: boolean; returnTo: string; status: string; taskId: string }) {
  const [focusMode, setFocusMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("task-workbench-focus", focusMode);
    return () => document.body.classList.remove("task-workbench-focus");
  }, [focusMode]);

  async function copyTaskLink(label: string) {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage(`${label} copied.`);
    } catch {
      setMessage("The task link could not be copied. Use the browser address bar instead.");
    }
  }

  async function completeTask() {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to complete the task right now.");
      setMessage("Task marked complete.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete the task right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="etw-task-action-bar" aria-label="Task actions">
      <button className="primary" disabled={!canComplete || isSaving || status === "COMPLETED"} onClick={completeTask} type="button"><Check size={14} />{status === "COMPLETED" ? "Completed" : isSaving ? "Completing…" : "Mark complete"}</button>
      <a href="#task-collaborators"><UserPlus size={14} />Collaborators</a>
      <button onClick={() => copyTaskLink("Share link")} type="button"><Share2 size={14} />Share</button>
      <button aria-label="Copy task link" onClick={() => copyTaskLink("Task link")} type="button"><Link2 size={14} /></button>
      <button aria-pressed={focusMode} onClick={() => setFocusMode((current) => !current)} type="button"><Focus size={14} />{focusMode ? "Exit focus" : "Focus"}</button>
      <div className="etw-task-action-more">
        <button aria-expanded={menuOpen} aria-label="More task actions" onClick={() => setMenuOpen((current) => !current)} type="button"><MoreHorizontal size={15} /></button>
        {menuOpen ? <div role="menu"><Link href={`/tasks/intake?returnTo=${encodeURIComponent(`/tasks/${taskId}`)}`} role="menuitem">Create related task</Link><Link href={`/appointments?sourceTask=${encodeURIComponent(taskId)}`} role="menuitem">Schedule follow-up</Link><Link href="/activity" role="menuitem">View full activity</Link><Link href={returnTo} role="menuitem">Return to task board</Link></div> : null}
      </div>
      {message ? <span className="etw-task-action-message" role="status"><Clipboard size={12} />{message}</span> : null}
    </section>
  );
}
