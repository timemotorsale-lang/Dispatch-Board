import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canViewFullBoard } from "@/server/policies/access";
import {
  createActivityEventRepository,
  type ActivityEventRepository,
  type ActivityEventRecord
} from "@/server/repositories/activity-event-repository";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

export type ActivityFeedEvent = {
  id: string;
  boardDate: string;
  eventType: string;
  message: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email?: string;
  } | null;
  task: {
    id: string;
    title: string;
  } | null;
};

type ActivityFeedDependencies = {
  repository?: ActivityEventRepository;
};

type ActivityFeedTodayDependencies = ActivityFeedDependencies & {
  now?: () => Date;
};

export type RecordBoardActivityInput = {
  boardDayId: string;
  actorUserId?: string | null;
  taskId?: string | null;
  eventType: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

function assertCanViewActivity(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canViewFullBoard(user)) {
    throw new Error("Board access required.");
  }

  return user;
}

function toActivityFeedEvent(event: ActivityEventRecord): ActivityFeedEvent {
  return {
    id: event.id,
    boardDate: event.boardDay.date.toISOString().slice(0, 10),
    eventType: event.eventType,
    message: event.message,
    createdAt: event.createdAt.toISOString(),
    actor: event.actorUser
      ? {
          id: event.actorUser.id,
          name: event.actorUser.name,
          email: event.actorUser.email || undefined
        }
      : null,
    task: event.task
      ? {
          id: event.task.id,
          title: event.task.title
        }
      : null
  };
}

export async function recordBoardActivityEvent(
  input: RecordBoardActivityInput,
  repository: Pick<ActivityEventRepository, "createActivityEvent"> = createActivityEventRepository()
) {
  return repository.createActivityEvent({
    boardDayId: input.boardDayId,
    actorUserId: input.actorUserId ?? null,
    taskId: input.taskId ?? null,
    eventType: input.eventType,
    message: input.message,
    metadata: input.metadata ?? {}
  });
}

export async function listActivityFeedEventsForDate(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: ActivityFeedDependencies = {}
) {
  assertCanViewActivity(user);

  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createActivityEventRepository();
  const boardDay = await repository.findBoardDayByDate(normalizedBoardDate);

  if (!boardDay) {
    return {
      date: normalizedBoardDate,
      events: []
    };
  }

  const events = await repository.listActivityEventsForBoardDay(boardDay.id);

  return {
    date: normalizedBoardDate,
    events: events.map(toActivityFeedEvent)
  };
}

export async function listActivityFeedEventsForToday(
  user: AuthenticatedUser | null,
  dependencies: ActivityFeedTodayDependencies = {}
) {
  assertCanViewActivity(user);

  const settings = await getGenerationSettings();
  const now = dependencies.now ?? (() => new Date());
  const boardDate = getBoardDateInTimeZone(now(), settings.timezone);

  return listActivityFeedEventsForDate(user, boardDate, dependencies);
}

export async function listActivityFeedEventsForTask(
  user: AuthenticatedUser | null,
  taskId: string,
  dependencies: ActivityFeedDependencies = {}
) {
  assertCanViewActivity(user);

  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  const repository = dependencies.repository ?? createActivityEventRepository();
  const events = await repository.listActivityEventsForTask(normalizedTaskId);

  return events.map(toActivityFeedEvent);
}

export async function getActivityFeedForDate(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: ActivityFeedDependencies = {}
) {
  return listActivityFeedEventsForDate(user, boardDate, dependencies);
}

export async function getActivityFeedForToday(
  user: AuthenticatedUser | null,
  dependencies: ActivityFeedTodayDependencies = {}
) {
  return listActivityFeedEventsForToday(user, dependencies);
}
