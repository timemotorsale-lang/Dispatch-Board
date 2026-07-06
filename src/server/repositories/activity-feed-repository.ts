import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type ActivityFeedDatabase = Pick<PrismaClient, "activityEvent" | "appointmentHistoryEvent" | "boardDay">;

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

const activityFeedAppointmentHistoryEventSelect = {
  id: true,
  eventType: true,
  message: true,
  metadata: true,
  occurredAt: true,
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
  },
  appointment: {
    select: {
      id: true,
      appointmentNumber: true,
      title: true,
      bookingStatus: true
    }
  }
} satisfies Prisma.AppointmentHistoryEventSelect;

export type ActivityFeedBoardDayRecord = Prisma.BoardDayGetPayload<{
  select: typeof activityFeedBoardDaySelect;
}>;

export type ActivityFeedEventRecord = Prisma.ActivityEventGetPayload<{
  select: typeof activityFeedEventSelect;
}>;

export type ActivityFeedAppointmentHistoryEventRecord =
  Prisma.AppointmentHistoryEventGetPayload<{
    select: typeof activityFeedAppointmentHistoryEventSelect;
  }>;

export type ActivityFeedRepository = {
  findBoardDayByDate(boardDate: string): Promise<ActivityFeedBoardDayRecord | null>;
  listActivityEventsForBoardDay(boardDayId: string): Promise<ActivityFeedEventRecord[]>;
  listAppointmentHistoryEventsForBoardDate(
    boardDate: string
  ): Promise<ActivityFeedAppointmentHistoryEventRecord[]>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

function getBoardDateRange(boardDate: string) {
  const startsAt = toBoardDateValue(boardDate);
  const endsAt = new Date(startsAt);

  endsAt.setUTCDate(endsAt.getUTCDate() + 1);

  return { startsAt, endsAt };
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
    },

    async listAppointmentHistoryEventsForBoardDate(boardDate) {
      const { startsAt, endsAt } = getBoardDateRange(boardDate);

      return database.appointmentHistoryEvent.findMany({
        where: {
          occurredAt: {
            gte: startsAt,
            lt: endsAt
          }
        },
        select: activityFeedAppointmentHistoryEventSelect,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }]
      });
    }
  };
}
