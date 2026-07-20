"use client";

import { Check, Clipboard, Focus, Link2, MoreHorizontal, Share2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  normalizeRequiredUpdateProgress,
  REQUIRED_UPDATE_PROGRESS_EVENT,
  type RequiredUpdateProgress,
  type RequiredUpdateProgressEventDetail
} from "@/features/tasks/detail/task-required-update-progress";

type TaskWorkbenchActionBarProps = {
  canComplete: boolean;
  initialRequiredUpdateProgress?: RequiredUpdateProgress | null;
  returnTo: string;
  status: string;
  taskId: string;
};

export function TaskWorkbenchActionBar({
  canComplete,
  initialRequiredUpdateProgress,
  returnTo,
  status,
  taskId
}: TaskWorkbenchActionBarProps) {
  const [focusMode, setFocusMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [requiredUpdateProgress, setRequiredUpdateProgress] = useState(() =>
    normalizeRequiredUpdateProgress(initialRequiredUpdateProgress)
  );

  useEffect(() => {
    document.body.classList.toggle("task-workbench-focus", focusMode);
    return () => document.body.classList.remove("task-workbench-focus");
  }, [focusMode]);

  useEffect(() => {
    function handleProgress(event: Event) {
      const detail = (event as CustomEvent<RequiredUpdateProgressEventDetail | undefined>).detail;
      if (!detail || detail.taskId !== taskId) return;
      setRequiredUpdateProgress(normalizeRequiredUpdateProgress(detail));
    }

    window.addEventListener(REQUIRED_UPDATE_PROGRESS_EVENT, handleProgress);
    return () => window.removeEventListener(REQUIRED_UPDATE_PROGRESS_EVENT, handleProgress);
  }, [taskId]);

  async function copyTaskLink(label: string) {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage(`${label} copied.`);
    } catch {
      setMessage("The task link could not be copied. Use the browser address bar instead.");
    }
  }

  function reviewCompletion() {
    setMessage("");
    const panel = document.getElementById("required-task-update");
    if (!panel) return;

    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    panel.classList.remove("my-task-guided-update-panel-attention");
    requestAnimationFrame(() => panel.classList.add("my-task-guided-update-panel-attention"));
    window.setTimeout(() => panel.classList.remove("my-task-guided-update-panel-attention"), 1800);

    const firstMissingKey = requiredUpdateProgress.missingFieldKeys[0];
    const firstMissingField = firstMissingKey
      ? document.getElementById(`task-update-${firstMissingKey}`)
      : panel.querySelector<HTMLElement>("button:not(:disabled), select:not(:disabled), textarea:not(:disabled), input:not(:disabled)");
    window.setTimeout(() => firstMissingField?.focus(), 350);
  }

  const hasMissingUpdates = requiredUpdateProgress.missingFieldKeys.length > 0;
  const completionLabel = status === "COMPLETED"
    ? "Completed"
    : hasMissingUpdates
      ? "Finish required update"
      : requiredUpdateProgress.totalCount > 0
        ? "Mark complete"
        : "Review completion";

  return (
    <section className="etw-task-action-bar" aria-label="Task actions">
      <button className="primary" disabled={!canComplete || status === "COMPLETED"} onClick={reviewCompletion} type="button"><Check size={14} />{completionLabel}</button>
      {requiredUpdateProgress.totalCount > 0 && status !== "COMPLETED" ? <span className="etw-completion-progress">{requiredUpdateProgress.readyCount} of {requiredUpdateProgress.totalCount} ready</span> : null}
      <a href="#task-collaborators"><UserPlus size={14} />Collaborators</a>
      <button onClick={() => copyTaskLink("Share link")} type="button"><Share2 size={14} />Share</button>
      <button aria-label="Copy task link" onClick={() => copyTaskLink("Task link")} type="button"><Link2 size={14} /></button>
      <button aria-pressed={focusMode} onClick={() => setFocusMode((current) => !current)} type="button"><Focus size={14} />{focusMode ? "Exit focus view" : "Focus view"}</button>
      <div className="etw-task-action-more">
        <button aria-expanded={menuOpen} aria-label="More task actions" onClick={() => setMenuOpen((current) => !current)} type="button"><MoreHorizontal size={15} /></button>
        {menuOpen ? <div role="menu"><Link href={`/tasks/intake?returnTo=${encodeURIComponent(`/tasks/${taskId}`)}`} role="menuitem">Create related task</Link><Link href={`/appointments?sourceTask=${encodeURIComponent(taskId)}`} role="menuitem">Schedule follow-up</Link><Link href="/activity" role="menuitem">View full activity</Link><Link href={returnTo} role="menuitem">Return to task board</Link></div> : null}
      </div>
      {message ? <span className="etw-task-action-message" role="status"><Clipboard size={12} />{message}</span> : null}
    </section>
  );
}
