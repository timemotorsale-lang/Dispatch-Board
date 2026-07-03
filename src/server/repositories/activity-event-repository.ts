<<<<<<< HEAD
import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type ActivityEventDatabase = Pick<PrismaClient, "activityEvent" | "boardDay">;

const activityEventSelect = {
  id: true,
  eventType: true,
  message: true,
  metadata: true,
  createdAt: true,
  actorUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  task: {
    select: {
      id: true,
      title: true
    }
  },
  boardDay: {
    select: {
      id: true,
      date: true
    }
  }
=======
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
>>>>>>> main
} satisfies Prisma.ActivityEventSelect;

export type ActivityEventRecord = Prisma.ActivityEventGetPayload<{
  select: typeof activityEventSelect;
}>;

<<<<<<< HEAD
export type ActivityEventCreateInput = {
  boardDayId: string;
  actorUserId?: string | null;
  taskId?: string | null;
  eventType: string;
=======
export type CreateActivityEventInput = {
  boardDayId: string;
  actorUserId?: string | null;
  taskId?: string | null;
  eventType: ActivityEventType;
>>>>>>> main
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export type ActivityEventRepository = {
<<<<<<< HEAD
  createActivityEvent(input: ActivityEventCreateInput): Promise<ActivityEventRecord>;
  findBoardDayByDate(boardDate: string): Promise<{ id: string; date: Date } | null>;
  listActivityEventsForBoardDay(boardDayId: string, limit?: number): Promise<ActivityEventRecord[]>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

=======
  createActivityEvent(input: CreateActivityEventInput): Promise<ActivityEventRecord>;
};

>>>>>>> main
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
<<<<<<< HEAD
    },

    async findBoardDayByDate(boardDate) {
      return database.boardDay.findUnique({
        where: {
          date: toBoardDateValue(boardDate)
        },
        select: {
          id: true,
          date: true
        }
      });
    },

    async listActivityEventsForBoardDay(boardDayId, limit = 50) {
      return database.activityEvent.findMany({
        where: {
          boardDayId
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        select: activityEventSelect
      });
=======
>>>>>>> main
    }
  };
}
