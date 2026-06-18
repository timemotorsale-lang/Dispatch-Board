import { APP_NAME } from "@/app/config";
import { BoardToolbar } from "@/features/board/board-toolbar";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import {
  getLatestGenerationStatusForDate,
  type LatestGenerationStatus
} from "@/server/services/board-generation";
import { getBoardOverviewForDate } from "@/server/services/board-overview";
import { normalizeBoardDate } from "@/server/validation/board-date";

type BoardPageProps = {
  searchParams?: Promise<{
    date?: string | string[];
  }>;
};

function getDatePart(parts: Intl.DateTimeFormatPart[], type: "year" | "month" | "day") {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function getTodayBoardDate(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(new Date());

  return `${getDatePart(parts, "year")}-${getDatePart(parts, "month")}-${getDatePart(parts, "day")}`;
}

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function formatAttemptedAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function formatDueAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function formatWorkflowArea(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatTaskStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatSourceType(value: string) {
  if (value === "TEMPLATE") {
    return "Generated";
  }

  if (value === "MANAGER") {
    return "Manager";
  }

  return "Staff";
}

function getStatusTone(status: LatestGenerationStatus["status"]) {
  if (status === "failed") {
    return "status-badge status-badge-danger";
  }

  if (status === "success") {
    return "status-badge status-badge-success";
  }

  return "status-badge status-badge-muted";
}

function resolveSelectedBoardDate(
  rawBoardDate: string | undefined,
  fallbackBoardDate: string
): { boardDate: string; errorMessage: string | null } {
  if (!rawBoardDate) {
    return {
      boardDate: fallbackBoardDate,
      errorMessage: null
    };
  }

  try {
    return {
      boardDate: normalizeBoardDate(rawBoardDate),
      errorMessage: null
    };
  } catch {
    return {
      boardDate: fallbackBoardDate,
      errorMessage: "The requested board date was invalid, so the board has been reset to today."
    };
  }
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const user = await requireCurrentUser();
  const manager = isManager(user);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedBoardDate = Array.isArray(resolvedSearchParams?.date)
    ? resolvedSearchParams?.date[0]
    : resolvedSearchParams?.date;
  const settings = await getGenerationSettings();
  const todayBoardDate = getTodayBoardDate(settings.timezone);
  const { boardDate, errorMessage } = resolveSelectedBoardDate(requestedBoardDate, todayBoardDate);
  const [boardOverview, latestGeneration] = await Promise.all([
    getBoardOverviewForDate(boardDate),
    manager ? getLatestGenerationStatusForDate(boardDate) : Promise.resolve(null)
  ]);

  return (
    <section className="page-stack board-page">
      <div className="panel-card board-hero">
        <div className="board-hero-copy">
          <span className="eyebrow">Dispatch board</span>
          <h1>{APP_NAME}</h1>
          <p>
            Review the current board date, see the newest task snapshot, and safely retry daily
            generation when a manager needs to refresh the board.
          </p>
        </div>
        <BoardToolbar initialBoardDate={boardDate} isManager={manager} key={boardDate} />
      </div>

      {errorMessage ? (
        <div className="notice notice-danger" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="panel-grid board-summary-grid">
        <article className="panel-card board-stat-card">
          <strong>Selected date</strong>
          <h2>{formatBoardDateLabel(boardOverview.boardDate)}</h2>
          <p>
            {boardOverview.boardDayId
              ? "A board already exists for this date."
              : "No board has been generated for this date yet."}
          </p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Total tasks</strong>
          <h2>{boardOverview.taskCounts.total}</h2>
          <p>Generated and manual work currently on the selected board date.</p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Generated tasks</strong>
          <h2>{boardOverview.taskCounts.generated}</h2>
          <p>Tasks created through the shared daily generation flow.</p>
        </article>

        <article className="panel-card board-stat-card">
          <strong>Manual tasks</strong>
          <h2>{boardOverview.taskCounts.manual}</h2>
          <p>Manager and staff tasks preserved alongside generated work.</p>
        </article>
      </div>

      <div className="board-content-grid">
        <article className="panel-card board-table-card">
          <div className="board-section-heading">
            <div>
              <strong>Board snapshot</strong>
              <h2>Tasks for {formatBoardDateLabel(boardOverview.boardDate)}</h2>
            </div>
            <p>
              Refreshes automatically after a successful manual generation so new tasks appear
              without a full page reload.
            </p>
          </div>

          {boardOverview.tasks.length > 0 ? (
            <div className="board-table">
              <div className="board-table-row board-table-row-head">
                <span>Task</span>
                <span>Assignee</span>
                <span>Due</span>
                <span>Status</span>
                <span>Source</span>
              </div>
              {boardOverview.tasks.map((task) => (
                <div className="board-table-row" key={task.id}>
                  <div className="board-task-cell" data-label="Task">
                    <strong>{task.title}</strong>
                    <small>{formatWorkflowArea(task.workflowArea)}</small>
                  </div>
                  <span data-label="Assignee">{task.assignedUser.name}</span>
                  <span data-label="Due">{formatDueAt(task.dueAt)}</span>
                  <span data-label="Status">{formatTaskStatus(task.status)}</span>
                  <span data-label="Source">{formatSourceType(task.sourceType)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice board-empty-state">
              <p>
                No tasks are on this board date yet. {manager ? "Use Generate Board to create the missing daily work." : "A manager can generate the board when it is ready."}
              </p>
            </div>
          )}
        </article>

        {manager ? (
          <aside className="panel-card board-status-card">
            <div className="board-section-heading">
              <div>
                <strong>Latest generation</strong>
                <h2>Run status</h2>
              </div>
              <p>Compact manager-facing feedback for the selected date.</p>
            </div>

            {latestGeneration ? (
              <div className="board-status-stack">
                <div className="board-status-topline">
                  <span className={getStatusTone(latestGeneration.status)}>
                    {latestGeneration.status === "success"
                      ? "Succeeded"
                      : latestGeneration.status === "failed"
                        ? "Failed"
                        : "Running"}
                  </span>
                  <span className="board-status-meta">
                    {latestGeneration.triggeredBy === "manual" ? "Manual" : "Scheduled"}
                  </span>
                </div>

                <p className="board-status-copy">
                  Last attempted {formatAttemptedAt(latestGeneration.attemptedAt)} for{" "}
                  {formatBoardDateLabel(latestGeneration.boardDate)}.
                </p>

                {latestGeneration.summary ? (
                  <div className="notice board-status-summary">
                    <p>{latestGeneration.summary}</p>
                  </div>
                ) : null}

                <dl className="board-status-list">
                  <div>
                    <dt>Created</dt>
                    <dd>{latestGeneration.createdTaskCount ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Skipped</dt>
                    <dd>{latestGeneration.skippedExistingTaskCount ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Existing</dt>
                    <dd>{latestGeneration.alreadyExistingTaskCount ?? "—"}</dd>
                  </div>
                </dl>

                {latestGeneration.status === "failed" && latestGeneration.errorMessage ? (
                  <div className="notice notice-danger" role="alert">
                    <p>
                      <strong>Board may not be current.</strong> {latestGeneration.errorMessage}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="notice">
                <p>No generation attempts have been recorded for this board date yet.</p>
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
