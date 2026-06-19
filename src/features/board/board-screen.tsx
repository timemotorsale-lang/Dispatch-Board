"use client";

import { useEffect, useState } from "react";

import { APP_NAME } from "@/app/config";
import {
  DEFAULT_BOARD_FILTERS,
  formatBoardEnumLabel,
  getBoardPresentation,
  type BoardFilters,
  type BoardGroupMode
} from "@/features/board/board-grouping";
import { BoardToolbar } from "@/features/board/board-toolbar";
import type { BoardReadModel, BoardReadTask } from "@/server/services/board-read";

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

const GROUP_MODE_OPTIONS: Array<{
  value: BoardGroupMode;
  label: string;
  detail: string;
}> = [
  {
    value: "assignee",
    label: "Group by assignee",
    detail: "See the day by owner."
  },
  {
    value: "status",
    label: "Group by status",
    detail: "Cluster work by progress."
  },
  {
    value: "workflowArea",
    label: "Group by workflow area",
    detail: "Scan by department."
  }
];

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

type TaskWithOptionalAssignee = Omit<BoardReadTask, "assignedUser"> & {
  assignedUser: BoardReadTask["assignedUser"] | null;
};

function getTaskCountByStatus(tasks: Array<Pick<BoardReadTask, "status">>, status: string) {
  return tasks.reduce((count, task) => count + (task.status === status ? 1 : 0), 0);
}

function getAttentionCount(tasks: Array<Pick<BoardReadTask, "status">>) {
  return (
    getTaskCountByStatus(tasks, "BLOCKED") +
    getTaskCountByStatus(tasks, "WAITING_ON_PARTS") +
    getTaskCountByStatus(tasks, "WAITING_ON_APPROVAL") +
    getTaskCountByStatus(tasks, "READY_FOR_REVIEW")
  );
}

function getNeedsManagerCount(tasks: Array<Pick<BoardReadTask, "status">>) {
  return (
    getTaskCountByStatus(tasks, "WAITING_ON_APPROVAL") +
    getTaskCountByStatus(tasks, "READY_FOR_REVIEW")
  );
}

function getCompletedCount(tasks: Array<Pick<BoardReadTask, "status">>) {
  return getTaskCountByStatus(tasks, "COMPLETED");
}

function getActiveCount(tasks: Array<Pick<BoardReadTask, "status">>) {
  return tasks.length - getCompletedCount(tasks);
}

function getVisibleCountCopy(visibleCount: number, totalCount: number) {
  if (visibleCount === totalCount) {
    return `${visibleCount} tasks in view`;
  }

  return `${visibleCount} of ${totalCount} tasks in view`;
}

function getQuickStatusFilters(board: BoardReadModel) {
  return [
    {
      value: "",
      label: `All (${board.taskCount})`
    },
    {
      value: "BLOCKED",
      label: `Blocked (${board.statusCounts.BLOCKED ?? 0})`
    },
    {
      value: "WAITING_ON_APPROVAL",
      label: `Waiting on Approval (${board.statusCounts.WAITING_ON_APPROVAL ?? 0})`
    },
    {
      value: "READY_FOR_REVIEW",
      label: `Ready for Review (${board.statusCounts.READY_FOR_REVIEW ?? 0})`
    },
    {
      value: "COMPLETED",
      label: `Completed (${board.statusCounts.COMPLETED ?? 0})`
    }
  ];
}

type BoardTaskCardProps = {
  task: TaskWithOptionalAssignee;
};

function BoardTaskCard({ task }: BoardTaskCardProps) {
  return (
    <article className="board-task-card">
      <div className="board-task-topline">
        <div className="board-task-copy">
          <h3>{task.title}</h3>
          {task.description ? <p>{task.description}</p> : null}
        </div>
        <span className={getTaskStatusTone(task.status)}>{formatBoardEnumLabel(task.status)}</span>
      </div>

      <div className="board-task-meta-grid">
        <div>
          <span>Assigned</span>
          <strong>{task.assignedUser?.name ?? "Unassigned"}</strong>
          {task.assignedUser?.email ? <small>{task.assignedUser.email}</small> : null}
        </div>
        <div>
          <span>Due</span>
          <strong>{formatDueAt(task.dueAt)}</strong>
        </div>
        <div>
          <span>Workflow</span>
          <strong>{formatBoardEnumLabel(task.workflowArea)}</strong>
        </div>
      </div>

      <div className="board-chip-row">
        <span className="board-chip">{formatSourceLabel(task.sourceType)}</span>
        {task.requiresManagerApproval ? <span className="board-chip">Manager review</span> : null}
        {task.recommendedUser ? (
          <span className="board-chip">Suggested: {task.recommendedUser.name}</span>
        ) : null}
      </div>

      {task.vehicleReference || task.customerReference ? (
        <p className="board-task-reference">
          {task.vehicleReference ? `Vehicle: ${task.vehicleReference}` : null}
          {task.vehicleReference && task.customerReference ? " | " : null}
          {task.customerReference ? `Customer: ${task.customerReference}` : null}
        </p>
      ) : null}

      {task.blockerReason ? (
        <p className="board-task-alert">Blocked: {task.blockerReason}</p>
      ) : null}
    </article>
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
  const [groupMode, setGroupMode] = useState<BoardGroupMode>("assignee");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);

  function handleBoardDateChange(nextBoardDate: string) {
    setSelectedBoardDate(nextBoardDate);
    setLoadState(createLoadingState(nextBoardDate));
  }

  function handleBoardRefreshRequested() {
    setLoadState(createLoadingState(selectedBoardDate));
    setReloadCount((currentCount) => currentCount + 1);
  }

  function handleFilterChange<Key extends keyof BoardFilters>(key: Key, value: BoardFilters[Key]) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value
    }));
  }

  function handleClearFilters() {
    setFilters(DEFAULT_BOARD_FILTERS);
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
  const presentation = board ? getBoardPresentation(board.tasks, groupMode, filters) : null;
  const visibleTasks = presentation?.filteredTasks ?? [];
  const hasActiveFilters = Boolean(
    filters.status || filters.assigneeId || filters.workflowArea || filters.searchText.trim()
  );
  const quickStatusFilters = board ? getQuickStatusFilters(board) : [];

  return (
    <section className="page-stack board-page">
      <div className="panel-card board-hero board-hero-shell">
        <div className="board-hero-copy">
          <span className="eyebrow">Dispatch board</span>
          <h1>{APP_NAME}</h1>
          <p>One board. Everyone in the loop. Group the work, narrow the day, and keep every matching task in view.</p>
          <div className="board-hero-meta">
            <span className="board-hero-date">{formatBoardDateLabel(resolvedDate)}</span>
            {board ? (
              <span className={getGenerationStatusTone(board.generationStatus)}>
                {formatBoardEnumLabel(board.generationStatus)}
              </span>
            ) : null}
          </div>
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
          <strong>Active work</strong>
          <h2>{board ? getActiveCount(visibleTasks) : "-"}</h2>
          <p className="board-stat-card-copy">
            {board
              ? `${getVisibleCountCopy(visibleTasks.length, board.taskCount)} for ${formatBoardDateLabel(resolvedDate)}.`
              : "Visible work totals will appear here once the board loads."}
          </p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Stuck</strong>
          <h2>{board ? getTaskCountByStatus(visibleTasks, "BLOCKED") : "-"}</h2>
          <p className="board-stat-card-copy">Blocked tasks stay visible so managers can clear the next bottleneck.</p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Needs manager</strong>
          <h2>{board ? getNeedsManagerCount(visibleTasks) : "-"}</h2>
          <p className="board-stat-card-copy">Approval-ready and approval-waiting work that needs closer review.</p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Completed</strong>
          <h2>{board ? getCompletedCount(visibleTasks) : "-"}</h2>
          <p className="board-stat-card-copy">Finished work remains visible while you switch groupings and filters.</p>
        </article>
      </div>

      {board && board.tasks.length > 0 ? (
        <div className="panel-card board-controls-card">
          <div className="board-controls-heading">
            <div>
              <strong>Board controls</strong>
              <h2>Grouping and filtering</h2>
            </div>
            <p>Switch the board view without losing task visibility. Filters stay active until you clear them.</p>
          </div>

          <div className="board-group-toggle" role="tablist" aria-label="Board grouping">
            {GROUP_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={
                  option.value === groupMode
                    ? "board-segment-button board-segment-button-active"
                    : "board-segment-button"
                }
                aria-selected={option.value === groupMode}
                onClick={() => setGroupMode(option.value)}
                role="tab"
                type="button"
              >
                <span>{option.label}</span>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>

          <div className="board-quick-filters" aria-label="Quick status filters">
            {quickStatusFilters.map((filterOption) => (
              <button
                key={filterOption.label}
                className={
                  filterOption.value === filters.status
                    ? "board-filter-pill board-filter-pill-active"
                    : "board-filter-pill"
                }
                onClick={() => handleFilterChange("status", filterOption.value)}
                type="button"
              >
                {filterOption.label}
              </button>
            ))}
          </div>

          <div className="board-filter-grid">
            <label className="field">
              <span>Status</span>
              <select
                value={filters.status}
                onChange={(event) => handleFilterChange("status", event.target.value)}
              >
                <option value="">All statuses</option>
                {presentation?.filterOptions.statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Assignee</span>
              <select
                value={filters.assigneeId}
                onChange={(event) => handleFilterChange("assigneeId", event.target.value)}
              >
                <option value="">All assignees</option>
                {presentation?.filterOptions.assignees.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Workflow area</span>
              <select
                value={filters.workflowArea}
                onChange={(event) => handleFilterChange("workflowArea", event.target.value)}
              >
                <option value="">All workflow areas</option>
                {presentation?.filterOptions.workflowAreas.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field board-search-field">
              <span>Search</span>
              <input
                placeholder="Search titles, vehicles, customers, or assignees"
                type="search"
                value={filters.searchText}
                onChange={(event) => handleFilterChange("searchText", event.target.value)}
              />
            </label>

            <div className="board-filter-actions">
              <button
                className="pill pill-secondary board-clear-button"
                disabled={!hasActiveFilters}
                onClick={handleClearFilters}
                type="button"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="board-content-grid">
        <article className="panel-card board-main-card">
          <div className="board-section-heading">
            <div>
              <strong>Board tasks</strong>
              <h2>Tasks for {formatBoardDateLabel(resolvedDate)}</h2>
            </div>
            <p>
              {board
                ? `${getVisibleCountCopy(visibleTasks.length, board.taskCount)} grouped by ${GROUP_MODE_OPTIONS.find((option) => option.value === groupMode)?.label.toLowerCase()}.`
                : "Titles, assignees, due times, statuses, workflow areas, and key references stay easy to scan."}
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

          {board && board.tasks.length === 0 ? (
            <div className="notice board-empty-state" role="status">
              <p>This board exists, but it does not have any tasks yet.</p>
            </div>
          ) : null}

          {board && board.tasks.length > 0 && visibleTasks.length === 0 ? (
            <div className="notice board-empty-state" role="status">
              <p>No tasks match these filters. Clear filters to restore full board visibility.</p>
            </div>
          ) : null}

          {presentation && visibleTasks.length > 0 ? (
            <div className="board-group-grid">
              {presentation.groups.map((group) => (
                <section className="board-group-card" key={group.key}>
                  <div className="board-group-header">
                    <div>
                      <h3>{group.label}</h3>
                      <p>{group.taskCount} tasks</p>
                    </div>
                  </div>

                  <div className="board-task-list">
                    {group.tasks.map((task) => (
                      <BoardTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
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
                    {formatBoardEnumLabel(board.generationStatus)}
                  </span>
                  <span className="board-status-meta">{visibleTasks.length} tasks visible</span>
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
                    <dt>Needs attention</dt>
                    <dd>{getAttentionCount(visibleTasks)}</dd>
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
                <strong>Needs attention</strong>
                <h2>Current focus</h2>
              </div>
              <p>Problem spots remain visible while filters narrow the working set.</p>
            </div>

            {board ? (
              <ul className="board-attention-list">
                <li className="board-attention-item">
                  <span>Blocked</span>
                  <strong>{getTaskCountByStatus(visibleTasks, "BLOCKED")}</strong>
                </li>
                <li className="board-attention-item">
                  <span>Waiting on Parts</span>
                  <strong>{getTaskCountByStatus(visibleTasks, "WAITING_ON_PARTS")}</strong>
                </li>
                <li className="board-attention-item">
                  <span>Waiting on Approval</span>
                  <strong>{getTaskCountByStatus(visibleTasks, "WAITING_ON_APPROVAL")}</strong>
                </li>
                <li className="board-attention-item">
                  <span>Ready for Review</span>
                  <strong>{getTaskCountByStatus(visibleTasks, "READY_FOR_REVIEW")}</strong>
                </li>
              </ul>
            ) : (
              <div className="notice board-inline-state" role="status">
                <p>Attention counts will appear here once the board is available.</p>
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
                  <p>The real work here is accurate board loading, grouping, filtering, and visibility.</p>
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
