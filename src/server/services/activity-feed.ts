import type { AuthenticatedUser } from "@/server/auth/store";
import { assertCanViewBoard } from "@/server/services/board-read";
import {
  createActivityEventRepository,
  type ActivityEventRepository
} from "@/server/repositories/activity-event-repository";
import { getGenerationSettings, type AppSettingsRepository } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type Dependencies = { repository?: ActivityEventRepository };
type TodayDependencies = Dependencies & { appSettingsRepository?: AppSettingsRepository; now?: () => Date };

export async function getActivityFeedForDate(user: AuthenticatedUser | null, date: string, dependencies: Dependencies = {}) {
  assertCanViewBoard(user);
  const normalizedDate = normalizeBoardDate(date);
  const repository = dependencies.repository ?? createActivityEventRepository();
  const boardDay = await repository.findBoardDayByDate(normalizedDate);
  if (!boardDay) return { date: normalizedDate, boardDayId: null, events: [] };

  const records = await repository.listActivityEventsForBoardDay(boardDay.id);
  return {
    date: normalizedDate,
    boardDayId: boardDay.id,
    events: records.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
      actor: event.actorUser,
      task: event.task,
      metadata: event.metadata
    }))
  };
}

export async function getActivityFeedForToday(user: AuthenticatedUser | null, dependencies: TodayDependencies = {}) {
  assertCanViewBoard(user);
  const settings = await getGenerationSettings(dependencies.appSettingsRepository);
  const date = getBoardDateInTimeZone((dependencies.now ?? (() => new Date()))(), settings.timezone);
  return getActivityFeedForDate(user, date, dependencies);
}
