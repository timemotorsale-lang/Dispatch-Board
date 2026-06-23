import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type ActivityFeedDatabase = Pick<PrismaClient, "activityEvent" | "boardDay">;

const activityFeedBoardDaySelect = {
  id: true,
  date: true
} satisfies Prisma.BoardDaySelect;

const activityFeedEventSelect = {
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
      title: true,
      status: true,
      workflowArea: true
    }
  }
} satisfies Prisma.ActivityEventSelect;

export type ActivityFeedBoardDayRecord = Prisma.BoardDayGetPayload<{
  select: typeof activityFeedBoardDaySelect;
}>;

export type ActivityFeedEventRecord = Prisma.ActivityEventGetPayload<{
  select: typeof activityFeedEventSelect;
}>;

export type ActivityFeedRepository = {
  findBoardDayByDate(boardDate: string): Promise<ActivityFeedBoardDayRecord | null>;
  listActivityEventsForBoardDay(boardDayId: string): Promise<ActivityFeedEventRecord[]>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createActivityFeedRepository(
  database: ActivityFeedDatabase = prisma
): ActivityFeedRepository {
  return {
    async findBoardDayByDate(boardDate) {
      return database.boardDay.findUnique({
        where: {
          date: toBoardDateValue(boardDate)
        },
        select: activityFeedBoardDaySelect
      });
    },

    async listActivityEventsForBoardDay(boardDayId) {
      return database.activityEvent.findMany({
        where: {
          boardDayId
        },
        select: activityFeedEventSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
      });
    }
  };
}
