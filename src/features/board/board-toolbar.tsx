"use client";

import { TaskStatus, WorkflowArea } from "@prisma/client";
import { useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronRight, ShieldCheck, X } from "lucide-react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import type { BoardReadLatestGeneration } from "@/server/services/board-read";
import type {
  BoardGenerationPreview,
  BoardGenerationPreviewItem,
  BoardGenerationPreviewTier
} from "@/server/services/generation-tasks";
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
  onGenerateBoard(selectedCandidateKeys: string[]): void;
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

const previewTierDetails: Array<{
  tier: BoardGenerationPreviewTier;
  label: string;
  description: string;
}> = [
  {
    tier: "MUST_TODAY",
    label: "Must do today",
    description: "Critical work stays selected even when normal capacity is full."
  },
  {
    tier: "SHOULD_TODAY",
    label: "Should do today",
    description: "Important work selected while the team has capacity."
  },
  {
    tier: "UPCOMING",
    label: "Upcoming",
    description: "Visible for planning and selected only when focus capacity remains."
  },
  {
    tier: "MONITOR",
    label: "Monitor only",
    description: "Tracked without adding noise to today's active board."
  }
];

function formatPreviewDueTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

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
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [taskFeedback, setTaskFeedback] = useState<BoardGenerationActionFeedback>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isGenerationPreviewOpen, setIsGenerationPreviewOpen] = useState(false);
  const [generationPreview, setGenerationPreview] = useState<BoardGenerationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<Set<string>>(new Set());
  const [taskFormState, setTaskFormState] = useState<TaskFormState>(() =>
    createInitialTaskFormState(assignableUsers)
  );
  const generationHealth = getGenerationHealthMessage(generationStatus, latestGeneration, isManager);

  function handleDateChange(nextBoardDate: string) {
    if (!nextBoardDate) {
      return;
    }

    setTaskFeedback(null);
    setGenerationPreview(null);
    setIsGenerationPreviewOpen(false);
    onBoardDateChange(nextBoardDate);
    router.replace(buildBoardUrl(nextBoardDate, boardView));
  }

  function openGenerationPreview() {
    setPreviewError(null);
    setIsGenerationPreviewOpen(true);

    startPreviewTransition(async () => {
      const response = await fetch(
        `/api/board/generate?boardDate=${encodeURIComponent(boardDate)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json().catch(() => null)) as
        | (BoardGenerationPreview & { error?: string })
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("items" in payload)) {
        setGenerationPreview(null);
        setPreviewError(payload?.error ?? "Unable to prepare today's work review.");
        return;
      }

      setGenerationPreview(payload);
      setSelectedCandidateKeys(
        new Set(payload.items.filter((item) => item.recommended).map((item) => item.candidateKey))
      );
    });
  }

  function closeGenerationPreview() {
    if (isGeneratePending) return;
    setIsGenerationPreviewOpen(false);
    setPreviewError(null);
  }

  function togglePreviewItem(item: BoardGenerationPreviewItem) {
    setSelectedCandidateKeys((current) => {
      const next = new Set(current);
      if (next.has(item.candidateKey)) next.delete(item.candidateKey);
      else next.add(item.candidateKey);
      return next;
    });
  }

  function restoreRecommendedSelection() {
    if (!generationPreview) return;
    setSelectedCandidateKeys(
      new Set(
        generationPreview.items
          .filter((item) => item.recommended)
          .map((item) => item.candidateKey)
      )
    );
  }

  function publishSelectedWork() {
    if (selectedCandidateKeys.size === 0) return;
    onGenerateBoard([...selectedCandidateKeys]);
    setIsGenerationPreviewOpen(false);
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

  const isPending = isGeneratePending || isTaskPending || isPreviewPending;
  const needsBlockerReason = taskFormState.status === TaskStatus.BLOCKED;
  const canCreateTask = Boolean(
    taskFormState.title.trim() &&
      taskFormState.assignedUserId &&
      taskFormState.dueTime &&
      (!needsBlockerReason || taskFormState.blockerReason.trim())
  );
  const selectedItems = generationPreview?.items.filter((item) =>
    selectedCandidateKeys.has(item.candidateKey)
  ) ?? [];
  const selectedCountsByPerson = selectedItems.reduce<Map<string, number>>((counts, item) => {
    counts.set(item.assignedUserId, (counts.get(item.assignedUserId) ?? 0) + 1);
    return counts;
  }, new Map());
  const overloadedPeople = generationPreview
    ? [...selectedCountsByPerson.entries()].filter(
        ([, count]) => count > generationPreview.perPersonFocusLimit
      ).length
    : 0;
  const isAboveTeamFocus = generationPreview
    ? selectedCandidateKeys.size > generationPreview.teamFocusLimit
    : false;

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
                disabled={isGeneratePending || isPreviewPending}
                onClick={openGenerationPreview}
                type="button"
              >
                {isGeneratePending
                  ? "Publishing..."
                  : isPreviewPending
                    ? "Preparing review..."
                    : latestGeneration?.status === "failed"
                      ? "Review & Retry"
                      : "Review Today's Work"}
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

      {isManager && isGenerationPreviewOpen ? (
        <div className="board-intake-backdrop" role="presentation">
          <section
            aria-labelledby="board-intake-title"
            aria-modal="true"
            className="board-intake-drawer"
            role="dialog"
          >
            <header className="board-intake-header">
              <div className="board-intake-heading">
                <span className="board-intake-heading-icon"><ShieldCheck aria-hidden="true" /></span>
                <div>
                  <span>Daily work intake</span>
                  <h2 id="board-intake-title">Review today&apos;s work</h2>
                  <p>Choose what becomes active work for {boardDate}. Everything else stays visible for planning.</p>
                </div>
              </div>
              <button
                aria-label="Close daily work review"
                className="board-intake-close"
                disabled={isGeneratePending}
                onClick={closeGenerationPreview}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <main className="board-intake-content">
              {isPreviewPending ? (
                <div className="board-intake-loading" role="status">
                  <span className="board-intake-spinner" />
                  <strong>Reviewing duties, duplicates, and team capacity...</strong>
                  <p>No tasks are being created during this review.</p>
                </div>
              ) : previewError ? (
                <div className="notice notice-danger board-intake-error" role="alert">
                  <strong>Could not prepare the review.</strong>
                  <p>{previewError}</p>
                  <button className="pill pill-secondary" onClick={openGenerationPreview} type="button">
                    Try again
                  </button>
                </div>
              ) : generationPreview ? (
                <>
                  <section className="board-intake-summary" aria-label="Work intake summary">
                    <div><span>Detected</span><strong>{generationPreview.totalCandidates}</strong><small>all conditions</small></div>
                    <div className="focus"><span>Selected</span><strong>{selectedCandidateKeys.size}</strong><small>active today</small></div>
                    <div><span>Deferred</span><strong>{generationPreview.publishableCandidateCount - selectedCandidateKeys.size}</strong><small>still tracked</small></div>
                    <div><span>Already covered</span><strong>{generationPreview.existingTaskCount}</strong><small>duplicates avoided</small></div>
                  </section>

                  <section className={isAboveTeamFocus || overloadedPeople ? "board-intake-capacity warning" : "board-intake-capacity"}>
                    {isAboveTeamFocus || overloadedPeople ? <AlertTriangle aria-hidden="true" /> : <Check aria-hidden="true" />}
                    <div>
                      <strong>
                        {isAboveTeamFocus || overloadedPeople
                          ? "Selection exceeds the recommended focus load"
                          : "Selection fits the recommended focus load"}
                      </strong>
                      <p>
                        Team target: {generationPreview.teamFocusLimit} active items; staff target: {generationPreview.perPersonFocusLimit} each.
                        {overloadedPeople ? ` ${overloadedPeople} staff member${overloadedPeople === 1 ? " is" : "s are"} above target.` : ""}
                      </p>
                    </div>
                    <button onClick={restoreRecommendedSelection} type="button">Restore recommendation</button>
                  </section>

                  <div className="board-intake-tiers">
                    {previewTierDetails.map((tierDetail) => {
                      const tierItems = generationPreview.items.filter(
                        (item) => item.tier === tierDetail.tier
                      );
                      if (!tierItems.length) return null;

                      const selectedInTier = tierItems.filter((item) =>
                        selectedCandidateKeys.has(item.candidateKey)
                      ).length;

                      return (
                        <section className={`board-intake-tier tier-${tierDetail.tier.toLowerCase().replaceAll("_", "-")}`} key={tierDetail.tier}>
                          <header>
                            <div>
                              <span>{tierDetail.label}</span>
                              <p>{tierDetail.description}</p>
                            </div>
                            <strong>{selectedInTier}/{tierItems.length} selected</strong>
                          </header>
                          <div className="board-intake-list">
                            {tierItems.map((item) => {
                              const isSelected = selectedCandidateKeys.has(item.candidateKey);
                              const personLoad = selectedCountsByPerson.get(item.assignedUserId) ?? 0;
                              return (
                                <label className={isSelected ? "board-intake-item selected" : "board-intake-item"} key={item.candidateKey}>
                                  <input
                                    checked={isSelected}
                                    onChange={() => togglePreviewItem(item)}
                                    type="checkbox"
                                  />
                                  <span className="board-intake-check"><Check aria-hidden="true" /></span>
                                  <span className="board-intake-item-copy">
                                    <strong>{item.title}</strong>
                                    <small>{formatBoardEnumLabel(item.workflowArea)} · {formatBoardEnumLabel(item.priority)} · due {formatPreviewDueTime(item.dueAt)}</small>
                                  </span>
                                  <span className={personLoad > generationPreview.perPersonFocusLimit ? "board-intake-owner over" : "board-intake-owner"}>
                                    <b>{item.assignedUserName}</b>
                                    <small>{personLoad}/{generationPreview.perPersonFocusLimit} selected</small>
                                  </span>
                                  <ChevronRight aria-hidden="true" className="board-intake-row-chevron" />
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </main>

            <footer className="board-intake-footer">
              <div>
                <strong>{selectedCandidateKeys.size} tasks ready to publish</strong>
                <small>Publishing creates only the selected work items.</small>
              </div>
              <span>
                <button className="pill pill-secondary" onClick={closeGenerationPreview} type="button">Cancel</button>
                <button
                  className="pill pill-action"
                  disabled={!generationPreview || selectedCandidateKeys.size === 0 || isGeneratePending}
                  onClick={publishSelectedWork}
                  type="button"
                >
                  {isGeneratePending ? "Publishing..." : `Publish ${selectedCandidateKeys.size} to board`}
                </button>
              </span>
            </footer>
          </section>
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
