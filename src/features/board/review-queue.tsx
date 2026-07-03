"use client";

import { TaskStatus } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { BoardReadTask } from "@/server/services/board-read";
import { formatBoardEnumLabel } from "./board-grouping";

type ReviewQueueTask = Omit<BoardReadTask, "assignedUser"> & {
  assignedUser: BoardReadTask["assignedUser"] | null;
};

type ReviewQueueProps = {
  isManager: boolean;
  onReviewActionComplete(): void;
  tasks: ReviewQueueTask[];
};

type ReviewAction = "approve" | "reopen";

type ReviewActionState = {
  error: string | null;
  pendingAction: ReviewAction | null;
  completedTaskIds: Set<string>;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function getReviewQueueTasks(tasks: ReviewQueueTask[]) {
  return tasks
    .filter((task) => task.status === TaskStatus.READY_FOR_REVIEW)
    .sort((a, b) => {
      if (a.requiresManagerApproval !== b.requiresManagerApproval) {
        return a.requiresManagerApproval ? -1 : 1;
      }

      const aReady = a.readyForReviewAt ? new Date(a.readyForReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bReady = b.readyForReviewAt ? new Date(b.readyForReviewAt).getTime() : Number.MAX_SAFE_INTEGER;

      if (aReady !== bReady) {
        return aReady - bReady;
      }

      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
}

export function buildReviewActionPayload(action: ReviewAction) {
  return {
    status: action === "approve" ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS
  };
}

export function ReviewQueue({ isManager, onReviewActionComplete, tasks }: ReviewQueueProps) {
  const [stateByTaskId, setStateByTaskId] = useState<Record<string, ReviewActionState>>({});
  const reviewTasks = useMemo(() => getReviewQueueTasks(tasks), [tasks]).filter(
    (task) => !stateByTaskId[task.id]?.completedTaskIds.has(task.id)
  );

  async function runReviewAction(taskId: string, action: ReviewAction) {
    setStateByTaskId((current) => ({
      ...current,
      [taskId]: {
        completedTaskIds: current[taskId]?.completedTaskIds ?? new Set<string>(),
        error: null,
        pendingAction: action
      }
    }));

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildReviewActionPayload(action))
      });
      const result = (await response.json().catch(() => null)) as { task?: { id: string; status: TaskStatus }; error?: string } | null;

      if (!response.ok || !result?.task) {
        throw new Error(result?.error ?? "Unable to update this task right now.");
      }

      setStateByTaskId((current) => ({
        ...current,
        [taskId]: {
          completedTaskIds: new Set([...(current[taskId]?.completedTaskIds ?? []), taskId]),
          error: null,
          pendingAction: null
        }
      }));
      onReviewActionComplete();
    } catch (error) {
      setStateByTaskId((current) => ({
        ...current,
        [taskId]: {
          completedTaskIds: current[taskId]?.completedTaskIds ?? new Set<string>(),
          error: error instanceof Error ? error.message : "Unable to update this task right now.",
          pendingAction: null
        }
      }));
    }
  }

  if (!isManager) {
    return null;
  }

  return (
    <section className="rail-card review-queue-card" aria-label="Manager review queue">
      <header>
        <div>
          <h2>Review Queue</h2>
          <span>{reviewTasks.length} waiting</span>
        </div>
        <Link href="/manager-review">View all</Link>
      </header>

      {reviewTasks.length === 0 ? (
        <div className="review-queue-empty" role="status">
          <strong>All clear</strong>
          <p>No tasks are ready for manager review.</p>
        </div>
      ) : (
        <div className="review-queue-list">
          {reviewTasks.map((task) => {
            const taskState = stateByTaskId[task.id];
            const isApproving = taskState?.pendingAction === "approve";
            const isReopening = taskState?.pendingAction === "reopen";
            const isPending = Boolean(taskState?.pendingAction);
            const reference = task.vehicleReference || task.customerReference;

            return (
              <article className="review-queue-item" key={task.id}>
                <div className="review-queue-item-top">
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.assignedUser?.name ?? "Unassigned"}</span>
                  </div>
                  {task.requiresManagerApproval ? <b>Approval</b> : <b className="review-queue-muted-badge">Review</b>}
                </div>

                <dl>
                  <div>
                    <dt>Due</dt>
                    <dd>{formatTime(task.dueAt)}</dd>
                  </div>
                  <div>
                    <dt>Workflow</dt>
                    <dd>{formatBoardEnumLabel(task.workflowArea)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{formatBoardEnumLabel(task.status)}</dd>
                  </div>
                </dl>

                {reference ? <p className="review-queue-reference">{reference}</p> : null}
                {task.readyForReviewAt ? <p className="review-queue-ready-at">Ready {formatDateTime(task.readyForReviewAt)}</p> : null}

                <div className="review-queue-actions">
                  <button disabled={isPending} onClick={() => void runReviewAction(task.id, "approve")} type="button">
                    {isApproving ? "Approving..." : "Approve"}
                  </button>
                  <button disabled={isPending} onClick={() => void runReviewAction(task.id, "reopen")} type="button">
                    {isReopening ? "Returning..." : "Reopen"}
                  </button>
                  <Link href={`/tasks/${task.id}`}>Open</Link>
                </div>

                {taskState?.error ? <p className="review-queue-error" role="alert">{taskState.error}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
