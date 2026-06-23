import { ActivityEventType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type ActivityEventDatabase = Pick<PrismaClient | Prisma.TransactionClient, "activityEvent">;

const activityEventSelect = {
  id: true,
  boardDayId: true,
  actorUserId: true,
  taskId: true,
  eventType: true,
  message: true,
  metadata: true,
  createdAt: true
} satisfies Prisma.ActivityEventSelect;

export type ActivityEventRecord = Prisma.ActivityEventGetPayload<{
  select: typeof activityEventSelect;
}>;

export type CreateActivityEventInput = {
  boardDayId: string;
  actorUserId?: string | null;
  taskId?: string | null;
  eventType: ActivityEventType;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export type ActivityEventRepository = {
  createActivityEvent(input: CreateActivityEventInput): Promise<ActivityEventRecord>;
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
        },
        select: activityEventSelect
      });
    }
  };
}
