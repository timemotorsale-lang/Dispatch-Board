import { Prisma, type ActivityEvent, type ActivityEventType, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type ActivityEventDatabase = Pick<PrismaClient, "activityEvent"> | Pick<Prisma.TransactionClient, "activityEvent">;

export type CreateActivityEventInput = {
  boardDayId: string;
  actorUserId?: string | null;
  taskId?: string | null;
  eventType: ActivityEventType;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export type ActivityEventRepository = {
  createActivityEvent(input: CreateActivityEventInput): Promise<ActivityEvent>;
};

export function createActivityEventRepository(
  database: ActivityEventDatabase = prisma
): ActivityEventRepository {
  return {
    async createActivityEvent(input) {
      return database.activityEvent.create({
        data: {
          boardDayId: input.boardDayId,
          actorUserId: input.actorUserId ?? null,
          taskId: input.taskId ?? null,
          eventType: input.eventType,
          message: input.message,
          metadata: input.metadata ?? {}
        }
      });
    }
  };
}

export function createActivityEvent(
  input: CreateActivityEventInput,
  database: ActivityEventDatabase = prisma
) {
  return createActivityEventRepository(database).createActivityEvent(input);
}
