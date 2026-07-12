import { TasksConsoleScreen } from "@/features/tasks/tasks-console-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardReadModelForDate } from "@/server/services/board-read";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listTaskSavedViews, type TaskSavedViewModel } from "@/server/services/task-saved-views";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type TasksPageProps = {
  searchParams?: Promise<{
    create?: string | string[];
    concern?: string | string[];
    date?: string | string[];
    department?: string | string[];
    group?: string | string[];
    page?: string | string[];
    queue?: string | string[];
    task?: string | string[];
    view?: string | string[];
  }>;
};

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
      errorMessage: "The requested task-board date was invalid, so the Tasks console has been reset to today."
    };
  }
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const user = await requireCurrentUser();
  const manager = isManager(user);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedBoardDate = Array.isArray(resolvedSearchParams?.date)
    ? resolvedSearchParams.date[0]
    : resolvedSearchParams?.date;
  const requestedCreate = Array.isArray(resolvedSearchParams?.create)
    ? resolvedSearchParams.create[0]
    : resolvedSearchParams?.create;
  const requestedConcern = Array.isArray(resolvedSearchParams?.concern)
    ? resolvedSearchParams.concern[0]
    : resolvedSearchParams?.concern;
  const readParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const requestedTaskId = readParam(resolvedSearchParams?.task);
  const settings = await getGenerationSettings();
  const todayBoardDate = getBoardDateInTimeZone(new Date(), settings.timezone);
  const { boardDate, errorMessage: dateErrorMessage } = resolveSelectedBoardDate(
    requestedBoardDate,
    todayBoardDate
  );

  let board = null;
  let initialTask = null;
  let initialSavedViews: TaskSavedViewModel[] = [];
  let screenErrorMessage = dateErrorMessage;
  const assignableUsers = manager ? await listActiveUserSummaries() : [];

  try {
    initialSavedViews = await listTaskSavedViews(user);
    const boardLookup = await getBoardReadModelForDate(user, boardDate);

    board = boardLookup.board;

    const selectedTask = board?.tasks.find((task) => task.id === requestedTaskId) ?? board?.tasks[0];
    if (selectedTask) {
      initialTask = await getTaskReadModelById(user, selectedTask.id);
    }
  } catch (error) {
    screenErrorMessage =
      error instanceof Error ? error.message : "Unable to load the Tasks console right now.";
  }

  return (
    <TasksConsoleScreen
      assignableUsers={assignableUsers}
      board={board}
      boardDate={boardDate}
      currentUserId={user.id}
      errorMessage={screenErrorMessage}
      initialTask={initialTask}
      initialSavedViews={initialSavedViews}
      initialQuickCreateOpen={manager && requestedCreate === "1"}
      initialConcernIntakeOpen={manager && requestedConcern === "1"}
      initialDepartmentFilter={readParam(resolvedSearchParams?.department)}
      initialGroupBy={readParam(resolvedSearchParams?.group)}
      initialPage={Number.parseInt(readParam(resolvedSearchParams?.page) ?? "1", 10) || 1}
      initialQueueFilter={readParam(resolvedSearchParams?.queue)}
      initialView={readParam(resolvedSearchParams?.view)}
      isManager={manager}
      todayBoardDate={todayBoardDate}
    />
  );
}

