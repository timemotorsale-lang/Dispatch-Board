import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canViewFullBoard } from "@/server/policies/access";
import {
  createActivityFeedRepository,
  type ActivityFeedEventRecord,
  type ActivityFeedRepository
} from "@/server/repositories/activity-feed-repository";
import {
  getGenerationSettings,
  type AppSettingsRepository
} from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

export type ActivityFeedActor = {
  id: string;
  name: string;
  email: string;
};

export type ActivityFeedTask = {
  id: string;
  title: string;
  status: string;
  workflowArea: string;
};

export type ActivityFeedEvent = {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
  actor: ActivityFeedActor | null;
  task: ActivityFeedTask | null;
  metadata: Prisma.JsonValue;
};

export type ActivityFeedModel = {
  date: string;
  boardDayId: string | null;
  events: ActivityFeedEvent[];
};

type ActivityFeedDependencies = {
  repository?: ActivityFeedRepository;
};

type ActivityFeedTodayDependencies = ActivityFeedDependencies & {
  appSettingsRepository?: AppSettingsRepository;
  now?: () => Date;
};

export function assertCanViewActivityFeed(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canViewFullBoard(user)) {
    throw new Error("Activity feed access required.");
  }

  return user;
}

function toActivityFeedEvent(event: ActivityFeedEventRecord): ActivityFeedEvent {
  return {
    id: event.id,
    eventType: event.eventType,
    message: event.message,
    createdAt: event.createdAt.toISOString(),
    actor: event.actorUser
      ? {
          id: event.actorUser.id,
          name: event.actorUser.name,
          email: event.actorUser.email
        }
      : null,
    task: event.task
      ? {
          id: event.task.id,
          title: event.task.title,
          status: event.task.status,
          workflowArea: event.task.workflowArea
        }
      : null,
    metadata: event.metadata
  };
}

export async function getActivityFeedForDate(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: ActivityFeedDependencies = {}
): Promise<ActivityFeedModel> {
  assertCanViewActivityFeed(user);

  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createActivityFeedRepository();
  const boardDay = await repository.findBoardDayByDate(normalizedBoardDate);

  if (!boardDay) {
    return {
      date: normalizedBoardDate,
      boardDayId: null,
      events: []
    };
  }

  const events = (await repository.listActivityEventsForBoardDay(boardDay.id)).map(
    toActivityFeedEvent
  );

  return {
    date: normalizedBoardDate,
    boardDayId: boardDay.id,
    events
  };
}

export async function getActivityFeedForToday(
  user: AuthenticatedUser | null,
  dependencies: ActivityFeedTodayDependencies = {}
) {
  assertCanViewActivityFeed(user);

  const settings = await getGenerationSettings(dependencies.appSettingsRepository);
  const now = dependencies.now ?? (() => new Date());
  const boardDate = getBoardDateInTimeZone(now(), settings.timezone);

  return getActivityFeedForDate(user, boardDate, dependencies);
}
