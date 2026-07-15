"use client";

import { TaskStatus, WorkflowArea } from "@prisma/client";
import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import type { BoardReadLatestGeneration } from "@/server/services/board-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";

import type { BoardGenerationActionFeedback } from "./board-generation-feedback";
import { formatBoardEnumLabel } from "./board-grouping";
import type { DispatchBoardView } from "./board-dashboard";

type ManualTaskCreateResponse = {
  task: {
    id: string;
    title: string;
  };
};

type BoardToolbarProps = {
  assignableUsers: ActiveUserSummary[];
  boardDate: string;
  boardView: DispatchBoardView;
  generationFeedback: BoardGenerationActionFeedback;
  generationStatus: string | undefined;
  isGeneratePending: boolean;
  isManager: boolean;
  latestGeneration: BoardReadLatestGeneration | null | undefined;
  onBoardDateChange(boardDate: string): void;
  onGenerateBoard(): void;
  onBoardRefreshRequested(): void;
};

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

function toDueAtIso(boardDate: string, dueTime: string) {
  return new Date(`${boardDate}T${dueTime}:00`).toISOString();
}

function buildBoardUrl(boardDate: string, boardView: DispatchBoardView) {
  return `/board?${boardView === "live" ? "view=live&" : ""}date=${encodeURIComponent(boardDate)}`;
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
  boardView,
  generationFeedback,
  generationStatus,
  isGeneratePending,
  isManager,
  latestGeneration,
  onBoardDateChange,
  onGenerateBoard,
  onBoardRefreshRequested
}: BoardToolbarProps) {
  const router = useRouter();
  const [isTaskPending, startTaskTransition] = useTransition();
  const [taskFeedback, setTaskFeedback] = useState<BoardGenerationActionFeedback>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskFormState, setTaskFormState] = useState<TaskFormState>(() =>
    createInitialTaskFormState(assignableUsers)
  );
  const generationHealth = getGenerationHealthMessage(generationStatus, latestGeneration, isManager);

  function handleDateChange(nextBoardDate: string) {
    if (!nextBoardDate) {
      return;
    }

    setTaskFeedback(null);
    onBoardDateChange(nextBoardDate);
    router.replace(buildBoardUrl(nextBoardDate, boardView));
  }

  function resetTaskForm() {
    setTaskFormState(createInitialTaskFormState(assignableUsers));
  }

  function closeTaskModal() {
    setIsCreateTaskOpen(false);
    resetTaskForm();
  }

  function handleCreateTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTaskFeedback(null);

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
        setTaskFeedback({
          tone: "error",
          message: "Task creation failed.",
          detail: payload?.error ?? "Unable to create the task right now."
        });
        return;
      }

      setTaskFeedback({
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
              <Link
                className="pill pill-secondary"
                href={`/tasks/intake?returnTo=${encodeURIComponent(buildBoardUrl(boardDate, boardView))}`}
              >
                Task Intake
              </Link>
              <button
                className="pill pill-action board-generate-button"
                disabled={isGeneratePending}
                onClick={onGenerateBoard}
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

      {generationFeedback ? (
        <div
          className={
            generationFeedback.tone === "error"
              ? "notice notice-danger board-feedback"
              : "notice board-feedback"
          }
          role={generationFeedback.tone === "error" ? "alert" : "status"}
        >
          <p>
            <strong>{generationFeedback.message}</strong>
            {generationFeedback.detail ? ` ${generationFeedback.detail}` : ""}
          </p>
        </div>
      ) : null}

      {!generationFeedback && isGeneratePending ? (
        <div className="notice board-feedback" role="status">
          <p>
            <strong>Generating board...</strong> This can take a moment. Repeated clicks are disabled until the run finishes.
          </p>
        </div>
      ) : null}

      {taskFeedback ? (
        <div
          className={
            taskFeedback.tone === "error"
              ? "notice notice-danger board-feedback"
              : "notice board-feedback"
          }
          role={taskFeedback.tone === "error" ? "alert" : "status"}
        >
          <p>
            <strong>{taskFeedback.message}</strong>
            {taskFeedback.detail ? ` ${taskFeedback.detail}` : ""}
          </p>
        </div>
      ) : null}

      {!taskFeedback && isTaskPending ? (
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
