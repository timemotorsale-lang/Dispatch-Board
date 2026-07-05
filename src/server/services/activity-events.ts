import { Prisma } from "@prisma/client";

import {
  createActivityEventRepository,
  type ActivityEventRecord,
  type ActivityEventRepository
} from "@/server/repositories/activity-event-repository";

export const ActivityEventType = {
  DAILY_BOARD_GENERATED: "DAILY_BOARD_GENERATED",
  TASK_CREATED: "TASK_CREATED",
  STATUS_CHANGED: "STATUS_CHANGED"
} as const;

export type ActivityEventType = (typeof ActivityEventType)[keyof typeof ActivityEventType];

export type ActivityEventModel = {
  id: string;
  boardDayId: string;
  actorUserId: string | null;
  taskId: string | null;
  eventType: ActivityEventType;
  message: string;
  metadata: Prisma.JsonValue;
  createdAt: string;
};

export type CreateActivityEventInput = {
  boardDayId: string;
  actorUserId?: string | null;
  taskId?: string | null;
  eventType: ActivityEventType;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

function normalizeRequiredString(value: string, message: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

function toActivityEventModel(event: ActivityEventRecord): ActivityEventModel {
  return {
    id: event.id,
    boardDayId: event.boardDayId,
    actorUserId: event.actorUserId,
    taskId: event.taskId,
    eventType: event.eventType as ActivityEventType,
    message: event.message,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString()
  };
}

export async function createActivityEvent(
  input: CreateActivityEventInput,
  repository: ActivityEventRepository = createActivityEventRepository()
) {
  const event = await repository.createActivityEvent({
    boardDayId: normalizeRequiredString(input.boardDayId, "Board day id is required."),
    actorUserId: input.actorUserId?.trim() || null,
    taskId: input.taskId?.trim() || null,
    eventType: input.eventType,
    message: normalizeRequiredString(input.message, "Activity event message is required."),
    metadata: input.metadata ?? {}
  });

  return toActivityEventModel(event);
}
