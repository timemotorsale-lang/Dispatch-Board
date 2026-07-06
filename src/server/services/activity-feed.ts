import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canViewFullBoard } from "@/server/policies/access";
import {
  createActivityEventRepository,
  type ActivityEventRepository,
  type ActivityEventRecord
} from "@/server/repositories/activity-event-repository";
import {
  createActivityFeedRepository,
  type ActivityFeedAppointmentHistoryEventRecord,
  type ActivityFeedEventRecord,
  type ActivityFeedRepository
} from "@/server/repositories/activity-feed-repository";
import {
  getGenerationSettings,
  type AppSettingsRepository
} from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

export type ActivityFeedEvent = {
  id: string;
  boardDate: string;
  eventType: string;
  message: string;
  metadata: Prisma.JsonValue;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email?: string;
  } | null;
  task: {
    id: string;
    title: string;
    status?: string;
    workflowArea?: string;
  } | null;
  appointment?: {
    id: string;
    appointmentNumber: string;
    title: string;
    bookingStatus: string;
  } | null;
};

type ActivityFeedDependencies = {
  repository?: ActivityFeedRepository;
};

type ActivityFeedTodayDependencies = ActivityFeedDependencies & {
  appSettingsRepository?: AppSettingsRepository;
  now?: () => Date;
};

type ActivityTaskFeedDependencies = {
  repository?: ActivityEventRepository;
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

function toActorSummary(event: ActivityFeedEventRecord | ActivityEventRecord) {
  return event.actorUser
    ? {
        id: event.actorUser.id,
        name: event.actorUser.name,
        email: event.actorUser.email || undefined
      }
    : null;
}

function toBoardActivityFeedEvent(
  event: ActivityFeedEventRecord,
  boardDate: string
): ActivityFeedEvent {
  return {
    id: event.id,
    boardDate,
    eventType: event.eventType,
    message: event.message,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
    actor: toActorSummary(event),
    task: event.task
      ? {
          id: event.task.id,
          title: event.task.title,
          status: event.task.status,
          workflowArea: event.task.workflowArea
        }
      : null
  };
}

function toAppointmentHistoryActivityFeedEvent(
  event: ActivityFeedAppointmentHistoryEventRecord,
  boardDate: string
): ActivityFeedEvent {
  return {
    id: `appointment-history-${event.id}`,
    boardDate,
    eventType: `APPOINTMENT_${event.eventType}`,
    message: event.message,
    metadata: event.metadata,
    createdAt: event.occurredAt.toISOString(),
    actor: toActorSummary(event),
    task: event.task
      ? {
          id: event.task.id,
          title: event.task.title,
          status: event.task.status,
          workflowArea: event.task.workflowArea
        }
      : null,
    appointment: {
      id: event.appointment.id,
      appointmentNumber: event.appointment.appointmentNumber,
      title: event.appointment.title,
      bookingStatus: event.appointment.bookingStatus
    }
  };
}

function toTaskActivityFeedEvent(event: ActivityEventRecord): ActivityFeedEvent {
  return {
    id: event.id,
    boardDate: event.boardDay.date.toISOString().slice(0, 10),
    eventType: event.eventType,
    message: event.message,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
    actor: toActorSummary(event),
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
  const repository = dependencies.repository ?? createActivityFeedRepository();
  const boardDay = await repository.findBoardDayByDate(normalizedBoardDate);

  if (!boardDay) {
    return {
      date: normalizedBoardDate,
      boardDayId: null,
      events: []
    };
  }

  const [boardEvents, appointmentEvents] = await Promise.all([
    repository.listActivityEventsForBoardDay(boardDay.id),
    repository.listAppointmentHistoryEventsForBoardDate(normalizedBoardDate)
  ]);
  const events = [
    ...boardEvents.map((event) => toBoardActivityFeedEvent(event, normalizedBoardDate)),
    ...appointmentEvents.map((event) =>
      toAppointmentHistoryActivityFeedEvent(event, normalizedBoardDate)
    )
  ].sort((left, right) => {
    const byDate = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

    return byDate !== 0 ? byDate : right.id.localeCompare(left.id);
  });

  return {
    date: normalizedBoardDate,
    boardDayId: boardDay.id,
    events
  };
}

export async function listActivityFeedEventsForToday(
  user: AuthenticatedUser | null,
  dependencies: ActivityFeedTodayDependencies = {}
) {
  assertCanViewActivity(user);

  const settings = await getGenerationSettings(dependencies.appSettingsRepository);
  const now = dependencies.now ?? (() => new Date());
  const boardDate = getBoardDateInTimeZone(now(), settings.timezone);

  return listActivityFeedEventsForDate(user, boardDate, dependencies);
}

export async function listActivityFeedEventsForTask(
  user: AuthenticatedUser | null,
  taskId: string,
  dependencies: ActivityTaskFeedDependencies = {}
) {
  assertCanViewActivity(user);

  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  const repository = dependencies.repository ?? createActivityEventRepository();
  const events = await repository.listActivityEventsForTask(normalizedTaskId);

  return events.map(toTaskActivityFeedEvent);
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
