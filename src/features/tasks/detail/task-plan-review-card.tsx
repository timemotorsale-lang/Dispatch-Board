"use client";

import { CheckCircle2, ListChecks, PencilLine, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { normalizeTaskExecutionAssurance } from "@/lib/task-execution-assurance";
import type { TaskReadModel } from "@/server/services/task-read";

type TaskPlanReviewCardProps = {
  canUpdate: boolean;
  compact?: boolean;
  task: Pick<TaskReadModel, "executionAssurance" | "id">;
};

type TaskPlanResponse = {
  plan?: {
    createdCount: number;
    removedCount: number;
    planReview: {
      status: string;
      reviewedByName: string | null;
    };
  };
  error?: string;
} | null;

type TaskPlanReviewAction = "CONFIRM" | "SIMPLIFY" | "BYPASS";

function planStatusLabel(status: string) {
  if (status === "CONFIRMED") return "Working plan accepted";
  if (status === "SIMPLIFIED") return "Basic plan selected";
  if (status === "BYPASSED") return "Working from updates";
  return "Suggested working plan";
}

function planStatusHelp(status: string, reviewedByName: string | null) {
  if (status === "CONFIRMED") return `${reviewedByName ?? "Staff"} accepted the suggested subtasks and checklist.`;
  if (status === "SIMPLIFIED") return `${reviewedByName ?? "Staff"} replaced the suggestion with a basic working plan.`;
  if (status === "BYPASSED") return `${reviewedByName ?? "Staff"} chose to use progress updates instead of generated plan items.`;
  return "Edit any item below if needed, then choose how staff should work this task.";
}

export function TaskPlanReviewCard({ canUpdate, compact = false, task }: TaskPlanReviewCardProps) {
  const router = useRouter();
  const assurance = normalizeTaskExecutionAssurance(task.executionAssurance);
  const planReview = assurance.planReview;
  const planReviewed = planReview.status === "CONFIRMED" || planReview.status === "SIMPLIFIED" || planReview.status === "BYPASSED";
  const [pendingAction, setPendingAction] = useState<TaskPlanReviewAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function reviewPlan(action: TaskPlanReviewAction) {
    setPendingAction(action);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await response.json().catch(() => null) as TaskPlanResponse;

      if (!response.ok || !result?.plan) {
        setErrorMessage(result?.error ?? "Unable to update this plan right now.");
        return;
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this plan right now.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className={compact ? "task-plan-review-card task-plan-review-card-compact" : "task-plan-review-card"}>
      <div>
        {planReviewed ? <CheckCircle2 size={17} /> : <Sparkles size={17} />}
        <span>
          <strong>{planStatusLabel(planReview.status)}</strong>
          <small>{planStatusHelp(planReview.status, planReview.reviewedByName)}</small>
        </span>
      </div>

      {!planReviewed && canUpdate ? (
        <nav aria-label="Choose how to use the suggested task plan">
          <button
            disabled={Boolean(pendingAction)}
            onClick={() => void reviewPlan("CONFIRM")}
            type="button"
          >
            <CheckCircle2 size={14} />
            {pendingAction === "CONFIRM" ? "Saving..." : "Keep plan"}
          </button>
          <button
            disabled={Boolean(pendingAction)}
            onClick={() => void reviewPlan("SIMPLIFY")}
            type="button"
          >
            <ListChecks size={14} />
            {pendingAction === "SIMPLIFY" ? "Saving..." : "Use basic plan"}
          </button>
          <button
            disabled={Boolean(pendingAction)}
            onClick={() => void reviewPlan("BYPASS")}
            type="button"
          >
            <PencilLine size={14} />
            {pendingAction === "BYPASS" ? "Saving..." : "Updates only"}
          </button>
        </nav>
      ) : null}

      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
    </section>
  );
}
