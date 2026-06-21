import { Prisma, type ActivityEvent, type ActivityEventType, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type ActivityEventDatabase =
  | Pick<PrismaClient, "activityEvent" | "boardDay">
  | Pick<Prisma.TransactionClient, "activityEvent" | "boardDay">;

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
  findBoardDayByDate(date: string): Promise<{ id: string } | null>;
  listActivityEventsForBoardDay(boardDayId: string): Promise<ActivityEventReadRecord[]>;
};

export type ActivityEventReadRecord = Prisma.ActivityEventGetPayload<{
  include: {
    actorUser: { select: { id: true; name: true; email: true } };
    task: { select: { id: true; title: true; status: true; workflowArea: true } };
  };
}>;

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
    },
    async findBoardDayByDate(date) {
      return database.boardDay.findUnique({
        where: { date: new Date(`${date}T00:00:00.000Z`) },
        select: { id: true }
      });
    },
    async listActivityEventsForBoardDay(boardDayId) {
      return database.activityEvent.findMany({
        where: { boardDayId },
        include: {
          actorUser: { select: { id: true, name: true, email: true } },
          task: { select: { id: true, title: true, status: true, workflowArea: true } }
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
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
