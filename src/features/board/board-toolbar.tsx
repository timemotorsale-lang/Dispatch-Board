"use client";

import { TaskStatus, WorkflowArea } from "@prisma/client";
import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import type { BoardReadLatestGeneration } from "@/server/services/board-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";

import { formatBoardEnumLabel } from "./board-grouping";

type ManualBoardGenerationResponse = {
  status: "success" | "failed";
  boardDate: string;
  generationRunId: string | null;
  createdTaskCount: number | null;
  skippedExistingTaskCount: number | null;
  alreadyExistingTaskCount: number | null;
  summary: string | null;
  errorMessage: string | null;
  latestGeneration: {
    attemptedAt: string;
  } | null;
};

type ManualTaskCreateResponse = {
  task: {
    id: string;
    title: string;
  };
};

type BoardToolbarProps = {
  assignableUsers: ActiveUserSummary[];
  boardDate: string;
  generationStatus: string | undefined;
  isManager: boolean;
  latestGeneration: BoardReadLatestGeneration | null | undefined;
  onBoardDateChange(boardDate: string): void;
  onBoardRefreshRequested(): void;
};

type FeedbackState =
  | {
      tone: "success";
      message: string;
      detail: string | null;
    }
  | {
      tone: "error";
      message: string;
      detail: string | null;
    }
  | null;

type TaskFormState = {
  assignedUserId: string;
  blockerReason: string;
  customerReference: string;
  description: string;
  dueTime: string;
  requiresManagerApproval: boolean;
  status: TaskStatus;
  title: string;
  vehicleReference: string;
  workflowArea: WorkflowArea;
};

const taskStatusOptions: TaskStatus[] = [
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.WAITING_ON_PARTS,
  TaskStatus.WAITING_ON_APPROVAL,
  TaskStatus.READY_FOR_REVIEW,
  TaskStatus.COMPLETED
];

const workflowAreaOptions: WorkflowArea[] = [
  WorkflowArea.INVENTORY,
  WorkflowArea.ADVERTISING,
  WorkflowArea.MARKETING,
  WorkflowArea.SALES,
  WorkflowArea.ADMIN,
  WorkflowArea.COLLECTIONS,
  WorkflowArea.SHOP,
  WorkflowArea.GENERAL_MANAGER
];

function createInitialTaskFormState(assignableUsers: ActiveUserSummary[]): TaskFormState {
  return {
    assignedUserId: assignableUsers[0]?.id ?? "",
    blockerReason: "",
    customerReference: "",
    description: "",
    dueTime: "09:00",
    requiresManagerApproval: false,
    status: TaskStatus.NOT_STARTED,
    title: "",
    vehicleReference: "",
    workflowArea: WorkflowArea.INVENTORY
  };
}

function buildSuccessMessage(payload: ManualBoardGenerationResponse) {
  const createdTaskCount = payload.createdTaskCount ?? 0;
  const skippedTaskCount = payload.skippedExistingTaskCount ?? 0;
  const summaryParts = [`${createdTaskCount} tasks created`, `${skippedTaskCount} duplicates skipped`];

  return {
    message: "Board generated.",
    detail: payload.summary ?? summaryParts.join(" | ")
  };
}

function toDueAtIso(boardDate: string, dueTime: string) {
  return new Date(`${boardDate}T${dueTime}:00`).toISOString();
}

function buildBoardUrl(boardDate: string) {
  return `/board?date=${encodeURIComponent(boardDate)}`;
}

function formatGenerationTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function getGenerationHealthMessage(
  generationStatus: string | undefined,
  latestGeneration: BoardReadLatestGeneration | null | undefined,
  isManager: boolean
) {
  if (latestGeneration?.status === "failed") {
    return {
      tone: "danger" as const,
      message: `Last ${latestGeneration.triggeredBy === "scheduled" ? "automatic" : "manual"} run failed at ${formatGenerationTimestamp(latestGeneration.attemptedAt)}.`,
      detail:
        latestGeneration.errorMessage ??
        latestGeneration.summary ??
        (isManager
          ? "Retry is safe after you review the failure."
          : "A manager can review the failure and retry safely.")
    };
  }

  if (latestGeneration?.status === "running") {
    return {
      tone: "neutral" as const,
      message: `${latestGeneration.triggeredBy === "scheduled" ? "Automatic" : "Manual"} generation is running.`,
      detail: `Started ${formatGenerationTimestamp(latestGeneration.startedAt)}.`
    };
  }

  if (latestGeneration?.status === "success") {
    return {
      tone: "neutral" as const,
      message: `Last ${latestGeneration.triggeredBy === "scheduled" ? "automatic" : "manual"} run succeeded at ${formatGenerationTimestamp(latestGeneration.attemptedAt)}.`,
      detail: latestGeneration.summary ?? "The board generation service completed successfully."
    };
  }

  if (generationStatus === "FAILED") {
    return {
      tone: "danger" as const,
      message: "Board generation needs attention.",
      detail: isManager
        ? "The board exists, but no successful generation run is recorded for it yet. Retry is safe."
        : "The board exists, but no successful generation run is recorded for it yet."
    };
  }

  if (generationStatus === "IN_PROGRESS") {
    return {
      tone: "neutral" as const,
      message: "Board generation is in progress.",
      detail: "Refresh in a moment to see whether the run completed cleanly."
    };
  }

  if (generationStatus === "NOT_STARTED") {
    return {
      tone: "neutral" as const,
      message: "No generation run has completed for this board yet.",
      detail: isManager
        ? "The scheduler may not have reached the configured time yet, or a manager can trigger the first run."
        : "The scheduler may not have reached the configured time yet."
    };
  }

  return null;
}

export function BoardToolbar({
  assignableUsers,
  boardDate,
  generationStatus,
  isManager,
  latestGeneration,
  onBoardDateChange,
  onBoardRefreshRequested
}: BoardToolbarProps) {
  const router = useRouter();
  const [isGeneratePending, startGenerateTransition] = useTransition();
  const [isTaskPending, startTaskTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskFormState, setTaskFormState] = useState<TaskFormState>(() =>
    createInitialTaskFormState(assignableUsers)
  );
  const generationHealth = getGenerationHealthMessage(generationStatus, latestGeneration, isManager);

  function handleDateChange(nextBoardDate: string) {
    if (!nextBoardDate) {
      return;
    }

    setFeedback(null);
    onBoardDateChange(nextBoardDate);
    router.replace(buildBoardUrl(nextBoardDate));
  }

  function resetTaskForm() {
    setTaskFormState(createInitialTaskFormState(assignableUsers));
  }

  function closeTaskModal() {
    setIsCreateTaskOpen(false);
    resetTaskForm();
  }

  function openTaskModal() {
    resetTaskForm();
    setIsCreateTaskOpen(true);
  }

  function handleGenerate() {
    setFeedback(null);

    startGenerateTransition(async () => {
      const response = await fetch("/api/board/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          boardDate
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | (ManualBoardGenerationResponse & { error?: string })
        | { error?: string }
        | null;
      const hasStatus = payload && "status" in payload;

      if (!response.ok || (hasStatus && payload.status === "failed")) {
        const detail =
          payload && "errorMessage" in payload && typeof payload.errorMessage === "string"
            ? payload.errorMessage
            : payload?.error ?? "Unable to generate the board right now.";

        setFeedback({
          tone: "error",
          message: "Generation failed.",
          detail
        });
        onBoardRefreshRequested();
        return;
      }

      if (!payload || !("status" in payload) || payload.status !== "success") {
        setFeedback({
          tone: "error",
          message: "Generation failed.",
          detail: "Unable to generate the board right now."
        });
        return;
      }

      const nextFeedback = buildSuccessMessage(payload);

      setFeedback({
        tone: "success",
        message: nextFeedback.message,
        detail: nextFeedback.detail
      });
      onBoardRefreshRequested();
    });
  }

  function handleCreateTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTaskTransition(async () => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assignedUserId: taskFormState.assignedUserId,
          ...(taskFormState.blockerReason.trim()
            ? { blockerReason: taskFormState.blockerReason.trim() }
            : {}),
          boardDate,
          ...(taskFormState.customerReference.trim()
            ? { customerReference: taskFormState.customerReference.trim() }
            : {}),
          description: taskFormState.description.trim(),
          dueAt: toDueAtIso(boardDate, taskFormState.dueTime),
          requiresManagerApproval: taskFormState.requiresManagerApproval,
          status: taskFormState.status,
          title: taskFormState.title.trim(),
          ...(taskFormState.vehicleReference.trim()
            ? { vehicleReference: taskFormState.vehicleReference.trim() }
            : {}),
          workflowArea: taskFormState.workflowArea
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | (ManualTaskCreateResponse & { error?: string })
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("task" in payload) || !payload.task) {
        setFeedback({
          tone: "error",
          message: "Task creation failed.",
          detail: payload?.error ?? "Unable to create the task right now."
        });
        return;
      }

      setFeedback({
        tone: "success",
        message: "Task created.",
        detail: `${payload.task.title} was added to ${boardDate}.`
      });
      closeTaskModal();
      onBoardRefreshRequested();
    });
  }

  const isPending = isGeneratePending || isTaskPending;
  const needsBlockerReason = taskFormState.status === TaskStatus.BLOCKED;
  const canCreateTask = Boolean(
    taskFormState.title.trim() &&
      taskFormState.assignedUserId &&
      taskFormState.dueTime &&
      (!needsBlockerReason || taskFormState.blockerReason.trim())
  );

  return (
    <div className="board-toolbar">
      <div className="board-toolbar-row">
        <label className="field board-date-field">
          <span>Board date</span>
          <input
            name="boardDate"
            type="date"
            value={boardDate}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </label>

        <div className="board-toolbar-actions">
          <button
            className="pill pill-secondary"
            disabled={isPending}
            onClick={onBoardRefreshRequested}
            type="button"
          >
            Refresh
          </button>

          {isManager ? (
            <>
              <button
                className="pill pill-secondary"
                disabled={isTaskPending}
                onClick={openTaskModal}
                type="button"
              >
                Create Task
              </button>
              <button
                className="pill pill-action board-generate-button"
                disabled={isGeneratePending}
                onClick={handleGenerate}
                type="button"
              >
                {isGeneratePending
                  ? "Generating..."
                  : latestGeneration?.status === "failed"
                    ? "Retry Board Generation"
                    : "Generate Board"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {generationHealth ? (
        <div
          className={
            generationHealth.tone === "danger"
              ? "notice notice-danger board-feedback"
              : "notice board-feedback"
          }
          role={generationHealth.tone === "danger" ? "alert" : "status"}
        >
          <p>
            <strong>{generationHealth.message}</strong>
            {generationHealth.detail ? ` ${generationHealth.detail}` : ""}
          </p>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={
            feedback.tone === "error"
              ? "notice notice-danger board-feedback"
              : "notice board-feedback"
          }
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          <p>
            <strong>{feedback.message}</strong>
            {feedback.detail ? ` ${feedback.detail}` : ""}
          </p>
        </div>
      ) : null}

      {!feedback && isGeneratePending ? (
        <div className="notice board-feedback" role="status">
          <p>
            <strong>Generating board...</strong> This can take a moment. Repeated clicks are disabled until the run finishes.
          </p>
        </div>
      ) : null}

      {!feedback && isTaskPending ? (
        <div className="notice board-feedback" role="status">
          <p>
            <strong>Creating task...</strong> Your task is being saved to the selected board date.
          </p>
        </div>
      ) : null}

      {isManager && isCreateTaskOpen ? (
        <div className="board-modal-backdrop" role="presentation">
          <section
            aria-labelledby="create-task-title"
            aria-modal="true"
            className="board-modal"
            role="dialog"
          >
            <div className="board-modal-header">
              <div>
                <strong>Manager action</strong>
                <h2 id="create-task-title">Create task for {boardDate}</h2>
              </div>
              <button className="pill pill-secondary" onClick={closeTaskModal} type="button">
                Close
              </button>
            </div>

            <form className="board-task-form" onSubmit={handleCreateTaskSubmit}>
              <div className="board-task-form-grid">
                <label className="field board-task-form-span-2">
                  <span>Title</span>
                  <input
                    required
                    value={taskFormState.title}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        title: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Assigned to</span>
                  <select
                    required
                    value={taskFormState.assignedUserId}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        assignedUserId: event.target.value
                      }))
                    }
                  >
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Due time</span>
                  <input
                    required
                    type="time"
                    value={taskFormState.dueTime}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        dueTime: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Workflow area</span>
                  <select
                    value={taskFormState.workflowArea}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        workflowArea: event.target.value as WorkflowArea
                      }))
                    }
                  >
                    {workflowAreaOptions.map((workflowArea) => (
                      <option key={workflowArea} value={workflowArea}>
                        {formatBoardEnumLabel(workflowArea)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Status</span>
                  <select
                    value={taskFormState.status}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        status: event.target.value as TaskStatus
                      }))
                    }
                  >
                    {taskStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatBoardEnumLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field board-task-form-span-2">
                  <span>Description</span>
                  <textarea
                    value={taskFormState.description}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        description: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Vehicle reference</span>
                  <input
                    value={taskFormState.vehicleReference}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        vehicleReference: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Customer reference</span>
                  <input
                    value={taskFormState.customerReference}
                    onChange={(event) =>
                      setTaskFormState((currentState) => ({
                        ...currentState,
                        customerReference: event.target.value
                      }))
                    }
                  />
                </label>

                {needsBlockerReason ? (
                  <label className="field board-task-form-span-2">
                    <span>Blocker reason</span>
                    <input
                      required
                      value={taskFormState.blockerReason}
                      onChange={(event) =>
                        setTaskFormState((currentState) => ({
                          ...currentState,
                          blockerReason: event.target.value
                        }))
                      }
                    />
                    <small className="field-hint">
                      Blocked tasks require a reason before they can be created.
                    </small>
                  </label>
                ) : null}
              </div>

              <label className="board-inline-checkbox">
                <input
                  checked={taskFormState.requiresManagerApproval}
                  type="checkbox"
                  onChange={(event) =>
                    setTaskFormState((currentState) => ({
                      ...currentState,
                      requiresManagerApproval: event.target.checked
                    }))
                  }
                />
                <span>Requires manager approval before completion</span>
              </label>

              <div className="board-modal-actions">
                <button className="pill pill-secondary" onClick={closeTaskModal} type="button">
                  Cancel
                </button>
                <button
                  className="pill pill-primary"
                  disabled={!canCreateTask || isTaskPending}
                  type="submit"
                >
                  {isTaskPending ? "Creating..." : "Create task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
