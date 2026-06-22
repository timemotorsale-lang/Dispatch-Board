"use client";

import { useEffect, useState } from "react";

import type { BoardReadModel } from "@/server/services/board-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";

import { BoardControls, BoardHero, MetricStrip, OperationsStrip, OperationalRail, TaskBoard, formatBoardDate, type Metric } from "./board-dashboard";
import { DEFAULT_BOARD_FILTERS, getBoardPresentation, type BoardFilters, type BoardGroupMode } from "./board-grouping";
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

function createMetrics(board: BoardReadModel): Metric[] {
  const active = board.taskCount - statusCount(board, "COMPLETED");
  return [
    { label: "Active Today", value: active, detail: `${board.taskCount} total tasks`, tone: "blue", icon: "active" },
    { label: "Stuck", value: statusCount(board, "BLOCKED") + statusCount(board, "WAITING_ON_PARTS"), detail: "Needs attention", tone: "red", icon: "stuck" },
    { label: "Needs Manager", value: statusCount(board, "WAITING_ON_APPROVAL") + statusCount(board, "READY_FOR_REVIEW"), detail: "Approvals & reviews", tone: "orange", icon: "manager" },
    { label: "Ready for Review", value: statusCount(board, "READY_FOR_REVIEW"), detail: "Manager action", tone: "purple", icon: "review" },
    { label: "Completed Today", value: statusCount(board, "COMPLETED"), detail: "Finished work", tone: "green", icon: "done" }
  ];
}

export function BoardScreen({ assignableUsers, initialBoardDate, todayBoardDate, isManager, initialDateError }: BoardScreenProps) {
  const [selectedBoardDate, setSelectedBoardDate] = useState(initialBoardDate);
  const [loadState, setLoadState] = useState<BoardLoadState>({ status: "loading", date: initialBoardDate });
  const [reloadCount, setReloadCount] = useState(0);
  const [groupMode, setGroupMode] = useState<BoardGroupMode>("assignee");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint(selectedBoardDate, todayBoardDate), { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as BoardApiPayload | null;
        if (controller.signal.aborted) return;
        if (response.status === 404 && payload) {
          setLoadState({ status: "empty", date: payload.date, message: payload.error ?? `No board exists for ${payload.date} yet.` });
          return;
        }
        if (!response.ok || !payload?.board) {
          setLoadState({ status: "error", date: selectedBoardDate, message: payload?.error ?? "Unable to load the board right now." });
          return;
        }
        setLoadState({ status: "ready", date: payload.date, board: payload.board });
      } catch (error) {
        if (!controller.signal.aborted) setLoadState({ status: "error", date: selectedBoardDate, message: error instanceof Error ? error.message : "Unable to load the board right now." });
      }
    }
    void load();
    return () => controller.abort();
  }, [reloadCount, selectedBoardDate, todayBoardDate]);

  const board = loadState.status === "ready" ? loadState.board : null;
  const presentation = board ? getBoardPresentation(board.tasks, groupMode, filters) : null;

  function setFilter<Key extends keyof BoardFilters>(key: Key, value: BoardFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return <section className="dispatch-board-page">
    <BoardHero boardDate={loadState.date} status={board?.generationStatus} toolbar={<BoardToolbar assignableUsers={assignableUsers} boardDate={selectedBoardDate} isManager={isManager} onBoardDateChange={(date) => { setSelectedBoardDate(date); setLoadState({ status: "loading", date }); }} onBoardRefreshRequested={() => { setLoadState({ status: "loading", date: selectedBoardDate }); setReloadCount((count) => count + 1); }} />} />
    {initialDateError ? <div className="board-notice board-notice-danger">{initialDateError}</div> : null}
    {loadState.status === "error" ? <div className="board-notice board-notice-danger">{loadState.message}</div> : null}
    {loadState.status === "loading" ? <div className="board-loading"><span /><p>Loading the dispatch board for {formatBoardDate(loadState.date)}…</p></div> : null}
    {loadState.status === "empty" ? <div className="board-empty"><h2>No board for {formatBoardDate(loadState.date)}</h2><p>{loadState.message} {isManager ? "Generate the board or create a manual task to begin." : "A manager can generate it when ready."}</p></div> : null}
    {board && presentation ? <>
      <MetricStrip metrics={createMetrics(board)} />
      <OperationsStrip tasks={board.tasks} />
      <div className="board-and-rail">
        <div className="board-primary-column">
          <BoardControls board={board} filters={filters} groupMode={groupMode} presentation={presentation} onClear={() => setFilters(DEFAULT_BOARD_FILTERS)} onFilterChange={setFilter} onGroupChange={setGroupMode} />
          <TaskBoard boardDate={loadState.date} presentation={presentation} />
        </div>
        <OperationalRail boardDate={loadState.date} isManager={isManager} onReviewChanged={() => { setLoadState({ status: "loading", date: selectedBoardDate }); setReloadCount((count) => count + 1); }} tasks={board.tasks} />
      </div>
    </> : null}
  </section>;
}
