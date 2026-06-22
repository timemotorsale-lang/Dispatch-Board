"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { BoardReadTask } from "@/server/services/board-read";
import { formatBoardEnumLabel } from "./board-grouping";

export function getReviewQueueTasks(tasks: BoardReadTask[]) {
  return tasks
    .filter((task) => task.status === "READY_FOR_REVIEW")
    .sort((a, b) => Number(b.requiresManagerApproval) - Number(a.requiresManagerApproval) || +new Date(a.readyForReviewAt ?? a.dueAt) - +new Date(b.readyForReviewAt ?? b.dueAt));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function ReviewQueue({ tasks, onChanged }: { tasks: BoardReadTask[]; onChanged(): void }) {
  const reviewTasks = useMemo(() => getReviewQueueTasks(tasks), [tasks]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(taskId: string, status: "COMPLETED" | "IN_PROGRESS") {
    if (pendingId) return;
    setPendingId(taskId);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "The review action could not be completed.");
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The review action could not be completed.");
    } finally {
      setPendingId(null);
    }
  }

  return <section className="rail-card review-queue" aria-label="Manager review queue">
    <header><div><h2>Review Queue</h2><small>Manager action</small></div><span className="review-count" aria-label={`${reviewTasks.length} waiting for review`}>{reviewTasks.length}</span></header>
    {error ? <div className="review-error" role="alert">{error}<button onClick={() => setError(null)} type="button">Dismiss</button></div> : null}
    {!reviewTasks.length ? <div className="review-empty"><strong>All caught up</strong><span>No tasks are ready for review.</span></div> : <div className="review-list">{reviewTasks.map((task) => {
      const pending = pendingId === task.id;
      return <article className="review-item" key={task.id}>
        <div className="review-item-heading"><Link href={`/tasks/${task.id}`}>{task.title}</Link>{task.requiresManagerApproval ? <span>Approval required</span> : null}</div>
        <p>{task.vehicleReference || task.customerReference || formatBoardEnumLabel(task.workflowArea)}</p>
        <dl><div><dt>Assigned</dt><dd>{task.assignedUser.name}</dd></div><div><dt>Due</dt><dd>{formatTime(task.dueAt)}</dd></div><div><dt>Ready</dt><dd>{task.readyForReviewAt ? formatTime(task.readyForReviewAt) : "Time unavailable"}</dd></div></dl>
        <div className="review-actions"><button className="review-approve" disabled={Boolean(pendingId)} onClick={() => void changeStatus(task.id, "COMPLETED")} type="button">{pending ? "Updating…" : "Approve"}</button><button disabled={Boolean(pendingId)} onClick={() => void changeStatus(task.id, "IN_PROGRESS")} type="button">Return</button></div>
      </article>;
    })}</div>}
  </section>;
}
