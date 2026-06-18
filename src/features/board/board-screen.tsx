"use client";

import { useEffect, useState } from "react";

import { APP_NAME } from "@/app/config";
import { BoardToolbar } from "@/features/board/board-toolbar";
import type { BoardReadModel } from "@/server/services/board-read";

type BoardScreenProps = {
  initialBoardDate: string;
  todayBoardDate: string;
  isManager: boolean;
  initialDateError: string | null;
};

type BoardApiPayload = {
  date: string;
  board: BoardReadModel | null;
  error?: string;
};

type BoardLoadState =
  | {
      status: "loading";
      date: string;
    }
  | {
      status: "ready";
      date: string;
      board: BoardReadModel;
    }
  | {
      status: "empty";
      date: string;
      message: string;
    }
  | {
      status: "error";
      date: string;
      message: string;
    };

function buildBoardEndpoint(boardDate: string, todayBoardDate: string) {
  if (boardDate === todayBoardDate) {
    return "/api/board/today";
  }

  return `/api/board/${encodeURIComponent(boardDate)}`;
}

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDueAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatSourceLabel(value: string) {
  if (value === "TEMPLATE") {
    return "Generated";
  }

  if (value === "MANAGER") {
    return "Manager";
  }

  return "Staff";
}

function getTaskStatusTone(status: string) {
  if (status === "BLOCKED") {
    return "board-status-chip board-status-chip-danger";
  }

  if (status === "WAITING_ON_PARTS" || status === "WAITING_ON_APPROVAL") {
    return "board-status-chip board-status-chip-warning";
  }

  if (status === "READY_FOR_REVIEW") {
    return "board-status-chip board-status-chip-review";
  }

  if (status === "COMPLETED") {
    return "board-status-chip board-status-chip-success";
  }

  return "board-status-chip board-status-chip-default";
}

function getGenerationStatusTone(generationStatus: string | null) {
  if (generationStatus === "FAILED") {
    return "status-badge status-badge-danger";
  }

  if (generationStatus === "GENERATED") {
    return "status-badge status-badge-success";
  }

  return "status-badge status-badge-muted";
}

function createLoadingState(boardDate: string): BoardLoadState {
  return {
    status: "loading",
    date: boardDate
  };
}

function getCompletedCount(board: BoardReadModel) {
  return board.statusCounts.COMPLETED ?? 0;
}

function getAttentionCount(board: BoardReadModel) {
  return (
    (board.statusCounts.BLOCKED ?? 0) +
    (board.statusCounts.WAITING_ON_APPROVAL ?? 0) +
    (board.statusCounts.READY_FOR_REVIEW ?? 0)
  );
}

export function BoardScreen({
  initialBoardDate,
  todayBoardDate,
  isManager,
  initialDateError
}: BoardScreenProps) {
  const [selectedBoardDate, setSelectedBoardDate] = useState(initialBoardDate);
  const [loadState, setLoadState] = useState<BoardLoadState>(createLoadingState(initialBoardDate));
  const [reloadCount, setReloadCount] = useState(0);

  function handleBoardDateChange(nextBoardDate: string) {
    setSelectedBoardDate(nextBoardDate);
    setLoadState(createLoadingState(nextBoardDate));
  }

  function handleBoardRefreshRequested() {
    setLoadState(createLoadingState(selectedBoardDate));
    setReloadCount((currentCount) => currentCount + 1);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadBoard() {
      try {
        const response = await fetch(buildBoardEndpoint(selectedBoardDate, todayBoardDate), {
          method: "GET",
          signal: controller.signal
        });
        const payload = (await response.json().catch(() => null)) as BoardApiPayload | null;

        if (controller.signal.aborted) {
          return;
        }

        if (response.status === 404 && payload) {
          setLoadState({
            status: "empty",
            date: payload.date,
            message: payload.error ?? `No board exists for ${payload.date} yet.`
          });
          return;
        }

        if (!response.ok || !payload?.board) {
          setLoadState({
            status: "error",
            date: selectedBoardDate,
            message: payload?.error ?? "Unable to load the board right now."
          });
          return;
        }

        setLoadState({
          status: "ready",
          date: payload.date,
          board: payload.board
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState({
          status: "error",
          date: selectedBoardDate,
          message: error instanceof Error ? error.message : "Unable to load the board right now."
        });
      }
    }

    void loadBoard();

    return () => {
      controller.abort();
    };
  }, [reloadCount, selectedBoardDate, todayBoardDate]);

  const resolvedDate = loadState.date;
  const board = loadState.status === "ready" ? loadState.board : null;

  return (
    <section className="page-stack board-page">
      <div className="panel-card board-hero">
        <div className="board-hero-copy">
          <span className="eyebrow">Dispatch board</span>
          <h1>{APP_NAME}</h1>
          <p>
            View the live board for today or another date, scan the team&apos;s generated work,
            and keep the day readable without jumping across screens.
          </p>
        </div>
        <BoardToolbar
          boardDate={selectedBoardDate}
          isManager={isManager}
          onBoardDateChange={handleBoardDateChange}
          onBoardRefreshRequested={handleBoardRefreshRequested}
        />
      </div>

      {initialDateError ? (
        <div className="notice notice-danger" role="alert">
          <p>{initialDateError}</p>
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className="notice notice-danger" role="alert">
          <p>{loadState.message}</p>
        </div>
      ) : null}

      <div className="panel-grid board-summary-grid">
        <article className="panel-card board-stat-card">
          <strong>Selected date</strong>
          <h2>{formatBoardDateLabel(resolvedDate)}</h2>
          <p className="board-stat-card-copy">
            {loadState.status === "loading"
              ? "Loading the selected board."
              : board
                ? "A generated board exists for this date."
                : "No generated board exists for this date yet."}
          </p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Total tasks</strong>
          <h2>{board?.taskCount ?? "—"}</h2>
          <p className="board-stat-card-copy">All visible work on the selected board date.</p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Generated tasks</strong>
          <h2>{board?.sourceCounts.template ?? "—"}</h2>
          <p className="board-stat-card-copy">Work created by the shared daily generation flow.</p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Needs attention</strong>
          <h2>{board ? getAttentionCount(board) : "—"}</h2>
          <p className="board-stat-card-copy">
            Blocked, waiting, and review-ready work that needs a closer look.
          </p>
        </article>
      </div>

      <div className="board-content-grid">
        <article className="panel-card board-table-card">
          <div className="board-section-heading">
            <div>
              <strong>Board tasks</strong>
              <h2>Tasks for {formatBoardDateLabel(resolvedDate)}</h2>
            </div>
            <p>
              Titles, assignees, due times, statuses, workflow areas, and key references stay in
              view so the team can scan the day quickly.
            </p>
          </div>

          {loadState.status === "loading" ? (
            <div className="notice board-inline-state" role="status">
              <p>Loading board data for {formatBoardDateLabel(resolvedDate)}.</p>
            </div>
          ) : null}

          {loadState.status === "empty" ? (
            <div className="notice board-empty-state" role="status">
              <p>
                {loadState.message}{" "}
                {isManager
                  ? "Generate the board when you are ready to create daily work."
                  : "A manager can generate the board when it is ready."}
              </p>
            </div>
          ) : null}

          {loadState.status === "ready" ? (
            loadState.board.tasks.length > 0 ? (
              <div className="board-table">
                <div className="board-table-row board-table-row-head">
                  <span>Task</span>
                  <span>Assigned</span>
                  <span>Due</span>
                  <span>Status</span>
                  <span>Workflow</span>
                </div>
                {loadState.board.tasks.map((task) => (
                  <div className="board-table-row" key={task.id}>
                    <div className="board-task-cell" data-label="Task">
                      <strong>{task.title}</strong>
                      <div className="board-chip-row">
                        <span className="board-chip">{formatSourceLabel(task.sourceType)}</span>
                        {task.requiresManagerApproval ? (
                          <span className="board-chip">Manager review</span>
                        ) : null}
                        {task.recommendedUser ? (
                          <span className="board-chip">Suggested: {task.recommendedUser.name}</span>
                        ) : null}
                      </div>
                      {task.description ? <small>{task.description}</small> : null}
                      {task.vehicleReference || task.customerReference ? (
                        <small className="board-reference-list">
                          {task.vehicleReference ? `Vehicle: ${task.vehicleReference}` : null}
                          {task.vehicleReference && task.customerReference ? " • " : null}
                          {task.customerReference ? `Customer: ${task.customerReference}` : null}
                        </small>
                      ) : null}
                      {task.blockerReason ? (
                        <small className="board-task-alert">Blocked: {task.blockerReason}</small>
                      ) : null}
                    </div>

                    <span className="board-assignee-cell" data-label="Assigned">
                      <strong>{task.assignedUser.name}</strong>
                      {task.assignedUser.email ? (
                        <small className="board-assignee-meta">{task.assignedUser.email}</small>
                      ) : null}
                    </span>

                    <span data-label="Due">{formatDueAt(task.dueAt)}</span>

                    <span data-label="Status">
                      <span className={getTaskStatusTone(task.status)}>{formatEnumLabel(task.status)}</span>
                    </span>

                    <span data-label="Workflow">{formatEnumLabel(task.workflowArea)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice board-empty-state" role="status">
                <p>This board exists, but it does not have any tasks yet.</p>
              </div>
            )
          ) : null}
        </article>

        <aside className="board-panel-stack">
          <section className="panel-card board-status-card">
            <div className="board-section-heading">
              <div>
                <strong>Board status</strong>
                <h2>Daily snapshot</h2>
              </div>
              <p>Compact context for the selected board date.</p>
            </div>

            {board ? (
              <div className="board-status-stack">
                <div className="board-status-topline">
                  <span className={getGenerationStatusTone(board.generationStatus)}>
                    {formatEnumLabel(board.generationStatus)}
                  </span>
                  <span className="board-status-meta">{board.taskCount} tasks visible</span>
                </div>

                <p className="board-status-copy">
                  {board.generatedAt
                    ? `Last generated ${formatDateTime(board.generatedAt)}.`
                    : "This board has not recorded a generated timestamp yet."}
                </p>

                <dl className="board-status-list">
                  <div>
                    <dt>Generated</dt>
                    <dd>{board.sourceCounts.template}</dd>
                  </div>
                  <div>
                    <dt>Manual</dt>
                    <dd>{board.sourceCounts.manager + board.sourceCounts.staff}</dd>
                  </div>
                  <div>
                    <dt>Completed</dt>
                    <dd>{getCompletedCount(board)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="notice board-inline-state" role="status">
                <p>
                  {loadState.status === "loading"
                    ? "Loading board status."
                    : "Board status will appear here once the selected date has a board."}
                </p>
              </div>
            )}
          </section>

          <section className="panel-card board-rail-card">
            <div className="board-section-heading">
              <div>
                <strong>Today&apos;s activity feed</strong>
                <h2>Placeholder rail</h2>
              </div>
              <p>Reserved visual space so the board layout stays stable as activity work lands.</p>
            </div>

            <ul className="board-activity-list">
              <li className="board-activity-item">
                <span className="board-activity-dot" />
                <div>
                  <strong>Static for now</strong>
                  <p>This rail is intentionally non-functional in this slice.</p>
                </div>
              </li>
              <li className="board-activity-item">
                <span className="board-activity-dot" />
                <div>
                  <strong>Primary focus</strong>
                  <p>The real work here is accurate board loading, validation, and visibility.</p>
                </div>
              </li>
              <li className="board-activity-item">
                <span className="board-activity-dot" />
                <div>
                  <strong>Layout continuity</strong>
                  <p>The right rail remains in place without implying live activity exists yet.</p>
                </div>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
