import { TodayActionCenter } from "@/features/today/today-action-center";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getMyTasksViewModelForToday } from "@/server/services/my-tasks";

export default async function TodayPage() {
  const user = await requireCurrentUser();
  const today = await getMyTasksViewModelForToday(user);

  return (
    <TodayActionCenter
      boardDate={today.date}
      boardExists={today.boardExists}
      fullBoardHref={`/board?date=${encodeURIComponent(today.date)}`}
      generatedAt={today.generatedAt}
      generationStatus={today.generationStatus}
      nowIso={new Date().toISOString()}
      tasks={today.tasks}
      userName={user.name}
    />
  );
}
