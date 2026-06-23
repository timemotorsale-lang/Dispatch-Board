"use client";

import { useEffect, useState } from "react";

import { EmptyStateCard, ErrorStateCard, LoadingStateCard } from "@/components/ui/state-card";
import type { BoardReadModel } from "@/server/services/board-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";

import {
  BoardControls,
  BoardHero,
  MetricStrip,
  OperationsStrip,
  OperationalRail,
  TaskBoard,
  formatBoardDate,
  type Metric
} from "./board-dashboard";
import {
  DEFAULT_BOARD_FILTERS,
  getBoardPresentation,
  type BoardFilters,
  type BoardGroupMode
} from "./board-grouping";
import { BoardToolbar } from "./board-toolbar";

type BoardScreenProps = {
  assignableUsers: ActiveUserSummary[];
  initialBoardDate: string;
  todayBoardDate: string;
  isManager: boolean;
  initialDateError: string | null;
};

type BoardApiPayload = { date: string; board: BoardReadModel | null; error?: string };
type BoardLoadState =
  | { status: "loading"; date: string }
  | { status: "ready"; date: string; board: BoardReadModel }
  | { status: "empty" | "error"; date: string; message: string };

function endpoint(date: string, today: string) {
  return date === today ? "/api/board/today" : `/api/board/${encodeURIComponent(date)}`;
}

function statusCount(board: BoardReadModel, status: string) {
  return board.statusCounts[status] ?? 0;
}

function hasActiveBoardFilters(filters: BoardFilters) {
  return Boolean(filters.status || filters.assigneeId || filters.workflowArea || filters.searchText.trim());
}

function createMetrics(board: BoardReadModel): Metric[] {
  const active = board.taskCount - statusCount(board, "COMPLETED");

  return [
    {
      label: "Active Today",
      value: active,
      detail: `${board.taskCount} total tasks`,
      tone: "blue",
      icon: "active"
    },
    {
      label: "Stuck",
      value: statusCount(board, "BLOCKED") + statusCount(board, "WAITING_ON_PARTS"),
      detail: "Needs attention",
      tone: "red",
      icon: "stuck"
    },
    {
      label: "Needs Manager",
      value: statusCount(board, "WAITING_ON_APPROVAL") + statusCount(board, "READY_FOR_REVIEW"),
      detail: "Approvals & reviews",
      tone: "orange",
      icon: "manager"
    },
    {
      label: "Ready for Review",
      value: statusCount(board, "READY_FOR_REVIEW"),
      detail: "Manager action",
      tone: "purple",
      icon: "review"
    },
    {
      label: "Completed Today",
      value: statusCount(board, "COMPLETED"),
      detail: "Finished work",
      tone: "green",
      icon: "done"
    }
  ];
}

export function BoardScreen({
  assignableUsers,
  initialBoardDate,
  todayBoardDate,
  isManager,
  initialDateError
}: BoardScreenProps) {
  const [selectedBoardDate, setSelectedBoardDate] = useState(initialBoardDate);
  const [loadState, setLoadState] = useState<BoardLoadState>({
    status: "loading",
    date: initialBoardDate
  });
  const [reloadCount, setReloadCount] = useState(0);
  const [groupMode, setGroupMode] = useState<BoardGroupMode>("assignee");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(endpoint(selectedBoardDate, todayBoardDate), {
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

        setLoadState({ status: "ready", date: payload.date, board: payload.board });
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadState({
            status: "error",
            date: selectedBoardDate,
            message: error instanceof Error ? error.message : "Unable to load the board right now."
          });
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [reloadCount, selectedBoardDate, todayBoardDate]);

  const board = loadState.status === "ready" ? loadState.board : null;
  const presentation = board ? getBoardPresentation(board.tasks, groupMode, filters) : null;
  const isFiltered = hasActiveBoardFilters(filters);

  function requestBoardReload() {
    setLoadState({ status: "loading", date: selectedBoardDate });
    setReloadCount((count) => count + 1);
  }

  function setFilter<Key extends keyof BoardFilters>(key: Key, value: BoardFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="dispatch-board-page">
      <BoardHero
        boardDate={loadState.date}
        status={board?.generationStatus}
        toolbar={
          <BoardToolbar
            assignableUsers={assignableUsers}
            boardDate={selectedBoardDate}
            isManager={isManager}
            onBoardDateChange={(date) => {
              setSelectedBoardDate(date);
              setLoadState({ status: "loading", date });
            }}
            onBoardRefreshRequested={requestBoardReload}
          />
        }
      />

      {initialDateError ? <div className="board-notice board-notice-danger">{initialDateError}</div> : null}

      {loadState.status === "error" ? (
        <ErrorStateCard
          actions={[{ label: "Try board again", onClick: requestBoardReload }]}
          eyebrow="Board unavailable"
          message={`${loadState.message} ${isManager ? "You can retry this board without leaving the page." : "Refresh the page or try again in a moment."}`}
          title={`Couldn't load ${formatBoardDate(loadState.date)}`}
        />
      ) : null}

      {loadState.status === "loading" ? (
        <LoadingStateCard
          eyebrow="Loading board"
          message={`Preparing the dispatch board for ${formatBoardDate(loadState.date)}.`}
          title="Fetching board data"
        />
      ) : null}

      {loadState.status === "empty" ? (
        <EmptyStateCard
          eyebrow="No board yet"
          message={`${loadState.message} ${isManager ? "Generate the board or create a manual task to begin the day." : "A manager can generate it when the team is ready."}`}
          title={`No board for ${formatBoardDate(loadState.date)}`}
        />
      ) : null}

      {board && presentation ? (
        <>
          <MetricStrip metrics={createMetrics(board)} />
          <OperationsStrip tasks={board.tasks} />
          <div className="board-and-rail">
            <div className="board-primary-column">
              <BoardControls
                board={board}
                filters={filters}
                groupMode={groupMode}
                presentation={presentation}
                onClear={() => setFilters(DEFAULT_BOARD_FILTERS)}
                onFilterChange={setFilter}
                onGroupChange={setGroupMode}
              />
              <TaskBoard
                boardDate={loadState.date}
                isFiltered={isFiltered}
                isManager={isManager}
                presentation={presentation}
                taskCount={board.taskCount}
              />
            </div>
            <OperationalRail tasks={presentation.filteredTasks} />
          </div>
        </>
      ) : null}
    </section>
  );
}
