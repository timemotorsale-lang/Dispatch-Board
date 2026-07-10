import { TasksConsoleScreen } from "@/features/tasks/tasks-console-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardReadModelForDate } from "@/server/services/board-read";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type TasksPageProps = {
  searchParams?: Promise<{
    date?: string | string[];
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
  const settings = await getGenerationSettings();
  const todayBoardDate = getBoardDateInTimeZone(new Date(), settings.timezone);
  const { boardDate, errorMessage: dateErrorMessage } = resolveSelectedBoardDate(
    requestedBoardDate,
    todayBoardDate
  );

  let board = null;
  let initialTask = null;
  let screenErrorMessage = dateErrorMessage;
  const assignableUsers = manager ? await listActiveUserSummaries() : [];

  try {
    const boardLookup = await getBoardReadModelForDate(user, boardDate);

    board = boardLookup.board;

    if (board?.tasks[0]) {
      initialTask = await getTaskReadModelById(user, board.tasks[0].id);
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
      isManager={manager}
      todayBoardDate={todayBoardDate}
    />
  );
}

