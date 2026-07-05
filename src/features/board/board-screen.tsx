"use client";

import { useEffect, useRef, useState } from "react";

import { EmptyStateCard, ErrorStateCard, LoadingStateCard } from "@/components/ui/state-card";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import type { ActivityFeedEvent } from "@/server/services/activity-feed";
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
type ActivityApiPayload = { date: string; events: ActivityFeedEvent[]; error?: string };
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
  return Boolean(
    filters.metricFilter ||
      filters.status ||
      filters.assigneeId ||
      filters.workflowArea ||
      filters.searchText.trim()
  );
}

function createMetrics(board: BoardReadModel): Metric[] {
  const active = board.taskCount - statusCount(board, "COMPLETED");

  return [
    {
      label: "Active Today",
      value: active,
      detail: `${board.taskCount} total tasks`,
      tone: "blue",
      icon: "active",
      metricKey: "active"
    },
    {
      label: "Stuck",
      value: statusCount(board, "BLOCKED") + statusCount(board, "WAITING_ON_PARTS"),
      detail: "Needs attention",
      tone: "red",
      icon: "stuck",
      metricKey: "stuck"
    },
    {
      label: "Needs Manager",
      value: statusCount(board, "WAITING_ON_APPROVAL") + statusCount(board, "READY_FOR_REVIEW"),
      detail: "Approvals & reviews",
      tone: "orange",
      icon: "manager",
      metricKey: "needs_manager"
    },
    {
      label: "Ready for Review",
      value: statusCount(board, "READY_FOR_REVIEW"),
      detail: "Manager action",
      tone: "purple",
      icon: "review",
      metricKey: "ready_for_review"
    },
    {
      label: "Completed Today",
      value: statusCount(board, "COMPLETED"),
      detail: "Finished work",
      tone: "green",
      icon: "done",
      metricKey: "completed"
    }
  ];
}

function getLiveStatusTone(isRefreshing: boolean) {
  return isRefreshing ? "status-badge status-badge-muted" : "status-badge status-badge-success";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [groupMode, setGroupMode] = useState<BoardGroupMode>("assignee");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);
  const [activityEvents, setActivityEvents] = useState<ActivityFeedEvent[]>([]);
  const loadStateRef = useRef<BoardLoadState>(loadState);
  const refreshModeRef = useRef<"blocking" | "silent">("blocking");
  const boardPrimaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadStateRef.current = loadState;
  }, [loadState]);

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
          setIsRefreshing(false);
          if (refreshModeRef.current === "silent" && loadStateRef.current.status === "ready") {
            return;
          }
          setLoadState({
            status: "empty",
            date: payload.date,
            message: payload.error ?? `No board exists for ${payload.date} yet.`
          });
          return;
        }

        if (!response.ok || !payload?.board) {
          setIsRefreshing(false);
          if (refreshModeRef.current === "silent" && loadStateRef.current.status === "ready") {
            return;
          }
          setLoadState({
            status: "error",
            date: selectedBoardDate,
            message: payload?.error ?? "Unable to load the board right now."
          });
          return;
        }

        setIsRefreshing(false);
        refreshModeRef.current = "blocking";
        setLoadState({ status: "ready", date: payload.date, board: payload.board });
      } catch (error) {
        if (!controller.signal.aborted) {
          setIsRefreshing(false);
          if (refreshModeRef.current === "silent" && loadStateRef.current.status === "ready") {
            return;
          }
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadActivity() {
      try {
        const response = await fetch(`/api/activity?date=${encodeURIComponent(selectedBoardDate)}`, {
          signal: controller.signal
        });
        const payload = (await response.json().catch(() => null)) as ActivityApiPayload | null;

        if (controller.signal.aborted || !response.ok || !payload) {
          return;
        }

        setActivityEvents(payload.events);
      } catch {
        if (!controller.signal.aborted) {
          setActivityEvents([]);
        }
      }
    }

    void loadActivity();

    return () => controller.abort();
  }, [reloadCount, selectedBoardDate]);

  const board = loadState.status === "ready" ? loadState.board : null;
  const presentation = board ? getBoardPresentation(board.tasks, groupMode, filters) : null;
  const isFiltered = hasActiveBoardFilters(filters);

  function requestBoardReload(mode: "blocking" | "silent" = "silent") {
    let shouldReload = false;
    refreshModeRef.current = mode;

    setLoadState((currentState) => {
      if (currentState.status === "loading") {
        return currentState;
      }

      shouldReload = true;
      return mode === "blocking" ? { status: "loading", date: selectedBoardDate } : currentState;
    });

    if (shouldReload) {
      setIsRefreshing(mode === "silent");
      setReloadCount((count) => count + 1);
    }
  }

  function setFilter<Key extends keyof BoardFilters>(key: Key, value: BoardFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleMetricSelect(metricKey: Metric["metricKey"]) {
    setGroupMode(metricKey ? "status" : "assignee");
    setFilters((current) => ({
      ...current,
      metricFilter: current.metricFilter === metricKey ? "" : metricKey,
      status: "",
      assigneeId: "",
      workflowArea: "",
      searchText: ""
    }));
    requestAnimationFrame(() => {
      boardPrimaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleAssigneeSelect(assigneeId: string) {
    setGroupMode("assignee");
    setFilters((current) => ({
      ...current,
      assigneeId: current.assigneeId === assigneeId ? "" : assigneeId
    }));
  }

  function handleAttentionSelect(status: string) {
    setGroupMode(status ? "status" : "assignee");
    setFilters((current) => ({
      ...current,
      metricFilter: "",
      status: current.status === status ? "" : status,
      assigneeId: "",
      workflowArea: "",
      searchText: ""
    }));
    requestAnimationFrame(() => {
      boardPrimaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useLiveRefresh(() => {
    requestBoardReload();
  });

  return (
    <section className="dispatch-board-page">
      <BoardHero
        boardDate={loadState.date}
        status={board?.generationStatus}
        toolbar={
          <>
            <span className={getLiveStatusTone(isRefreshing)}>
              {isRefreshing ? "Updating..." : "Live"}
            </span>
            <BoardToolbar
              assignableUsers={assignableUsers}
              boardDate={selectedBoardDate}
              isManager={isManager}
              onBoardDateChange={(date) => {
                setSelectedBoardDate(date);
                refreshModeRef.current = "blocking";
                setIsRefreshing(false);
                setLoadState({ status: "loading", date });
              }}
              onBoardRefreshRequested={requestBoardReload}
            />
          </>
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
          <MetricStrip
            activeMetricKey={filters.metricFilter}
            metrics={createMetrics(board)}
            onMetricSelect={handleMetricSelect}
          />
          <OperationsStrip
            activeAssigneeId={filters.assigneeId}
            onAssigneeSelect={handleAssigneeSelect}
            tasks={board.tasks}
          />
          <div className="board-and-rail">
            <div className="board-primary-column" ref={boardPrimaryRef}>
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
            <OperationalRail
              activeAttentionStatus={filters.status}
              boardDate={loadState.date}
              isManager={isManager}
              onAttentionSelect={handleAttentionSelect}
              recentActivity={activityEvents}
              tasks={board.tasks}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
