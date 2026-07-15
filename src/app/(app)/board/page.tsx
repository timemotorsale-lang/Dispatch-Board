import { BoardScreen } from "@/features/board/board-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type BoardPageProps = {
  searchParams?: Promise<{
    date?: string | string[];
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
  const requestedView = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams?.view[0]
    : resolvedSearchParams?.view;
  const settings = await getGenerationSettings();
  const todayBoardDate = getBoardDateInTimeZone(new Date(), settings.timezone);
  const { boardDate, errorMessage } = resolveSelectedBoardDate(requestedBoardDate, todayBoardDate);
  const assignableUsers = manager ? await listActiveUserSummaries() : [];

  return (
    <BoardScreen
      assignableUsers={assignableUsers}
      initialBoardDate={boardDate}
      initialDateError={errorMessage}
      initialView={requestedView === "live" ? "live" : "overview"}
      isManager={manager}
      key={boardDate}
      todayBoardDate={todayBoardDate}
    />
  );
}
