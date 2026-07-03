import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canViewFullBoard } from "@/server/policies/access";
import {
<<<<<<< HEAD
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
=======
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
>>>>>>> main
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canViewFullBoard(user)) {
<<<<<<< HEAD
    throw new Error("Board access required.");
=======
    throw new Error("Activity feed access required.");
>>>>>>> main
  }

  return user;
}

<<<<<<< HEAD
function toActivityFeedEvent(event: ActivityEventRecord): ActivityFeedEvent {
  return {
    id: event.id,
    boardDate: event.boardDay.date.toISOString().slice(0, 10),
=======
function toActivityFeedEvent(event: ActivityFeedEventRecord): ActivityFeedEvent {
  return {
    id: event.id,
>>>>>>> main
    eventType: event.eventType,
    message: event.message,
    createdAt: event.createdAt.toISOString(),
    actor: event.actorUser
      ? {
          id: event.actorUser.id,
          name: event.actorUser.name,
<<<<<<< HEAD
          email: event.actorUser.email || undefined
=======
          email: event.actorUser.email
>>>>>>> main
        }
      : null,
    task: event.task
      ? {
          id: event.task.id,
<<<<<<< HEAD
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

=======
          title: event.task.title,
          status: event.task.status,
          workflowArea: event.task.workflowArea
        }
      : null,
    metadata: event.metadata
  };
}

>>>>>>> main
export async function getActivityFeedForDate(
  user: AuthenticatedUser | null,
  boardDate: string,
  dependencies: ActivityFeedDependencies = {}
<<<<<<< HEAD
) {
  return listActivityFeedEventsForDate(user, boardDate, dependencies);
=======
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
>>>>>>> main
}

export async function getActivityFeedForToday(
  user: AuthenticatedUser | null,
  dependencies: ActivityFeedTodayDependencies = {}
) {
<<<<<<< HEAD
  return listActivityFeedEventsForToday(user, dependencies);
=======
  assertCanViewActivityFeed(user);

  const settings = await getGenerationSettings(dependencies.appSettingsRepository);
  const now = dependencies.now ?? (() => new Date());
  const boardDate = getBoardDateInTimeZone(now(), settings.timezone);

  return getActivityFeedForDate(user, boardDate, dependencies);
>>>>>>> main
}
