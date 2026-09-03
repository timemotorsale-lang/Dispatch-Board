import { TasksConsoleLoader } from "@/features/tasks/tasks-console-loader";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getTaskOperationsReadModelForDate } from "@/server/services/board-read";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listTaskSavedViews, type TaskSavedViewModel } from "@/server/services/task-saved-views";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type MyTasksPageProps = {
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

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
      errorMessage: "The requested My Tasks date was invalid, so the console has been reset to today."
    };
  }
}

export default async function MyTasksPage({ searchParams }: MyTasksPageProps) {
  const [user, resolvedSearchParams, settings] = await Promise.all([
    requireCurrentUser(),
    searchParams,
    getGenerationSettings()
  ]);
  const manager = isManager(user);
  const todayBoardDate = getBoardDateInTimeZone(new Date(), settings.timezone);
  const { boardDate, errorMessage: dateErrorMessage } = resolveSelectedBoardDate(
    readParam(resolvedSearchParams?.date),
    todayBoardDate
  );

  let board = null;
  let initialTask = null;
  let initialSavedViews: TaskSavedViewModel[] = [];
  let screenErrorMessage = dateErrorMessage;
  let assignableUsers: Awaited<ReturnType<typeof listActiveUserSummaries>> = [];

  try {
    const [resolvedAssignableUsers, resolvedSavedViews, boardLookup] = await Promise.all([
      manager ? listActiveUserSummaries() : Promise.resolve([]),
      listTaskSavedViews(user),
      getTaskOperationsReadModelForDate(user, boardDate)
    ]);

    assignableUsers = resolvedAssignableUsers;
    initialSavedViews = resolvedSavedViews;
    board = boardLookup.board;

    const requestedTaskId = readParam(resolvedSearchParams?.task);
    const userTask =
      board?.tasks.find((task) => task.id === requestedTaskId) ??
      board?.tasks.find((task) => task.assignedUser?.id === user.id && task.status !== "COMPLETED") ??
      board?.tasks[0];

    if (userTask) {
      initialTask = await getTaskReadModelById(user, userTask.id);
    }
  } catch (error) {
    screenErrorMessage =
      error instanceof Error ? error.message : "Unable to load My Tasks right now.";
  }

  return (
    <TasksConsoleLoader
      assignableUsers={assignableUsers}
      board={board}
      boardDate={boardDate}
      consoleBaseHref="/my-tasks"
      currentUserId={user.id}
      errorMessage={screenErrorMessage}
      initialTask={initialTask}
      initialSavedViews={initialSavedViews}
      initialQuickCreateOpen={manager && readParam(resolvedSearchParams?.create) === "1"}
      initialConcernIntakeOpen={manager && readParam(resolvedSearchParams?.concern) === "1"}
      initialDepartmentFilter={readParam(resolvedSearchParams?.department)}
      initialGroupBy={readParam(resolvedSearchParams?.group)}
      initialPage={Number.parseInt(readParam(resolvedSearchParams?.page) ?? "1", 10) || 1}
      initialQueueFilter={readParam(resolvedSearchParams?.queue) ?? "MY_TASKS"}
      initialView={readParam(resolvedSearchParams?.view)}
      isManager={manager}
      todayBoardDate={todayBoardDate}
    />
  );
}
