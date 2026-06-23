import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type BoardReadDatabase = Pick<PrismaClient, "boardDay" | "task">;

const boardDaySelect = {
  id: true,
  date: true,
  generationStatus: true,
  generatedAt: true
} satisfies Prisma.BoardDaySelect;

const boardTaskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueAt: true,
  workflowArea: true,
  sourceType: true,
  requiresManagerApproval: true,
  recommendationReasonCode: true,
  recommendationReasonText: true,
  recommendationReviewNeeded: true,
  vehicleReference: true,
  customerReference: true,
  blockerReason: true,
  readyForReviewAt: true,
  completedAt: true,
  assignedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  recommendedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.TaskSelect;

export type BoardReadBoardDayRecord = Prisma.BoardDayGetPayload<{
  select: typeof boardDaySelect;
}>;

export type BoardReadTaskRecord = Prisma.TaskGetPayload<{
  select: typeof boardTaskSelect;
}>;

export type BoardReadRepository = {
  findBoardDayByDate(boardDate: string): Promise<BoardReadBoardDayRecord | null>;
  listTasksForBoardDay(boardDayId: string): Promise<BoardReadTaskRecord[]>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createBoardReadRepository(database: BoardReadDatabase = prisma): BoardReadRepository {
  return {
    async findBoardDayByDate(boardDate) {
      return database.boardDay.findUnique({
        where: {
          date: toBoardDateValue(boardDate)
        },
        select: boardDaySelect
      });
    },

    async listTasksForBoardDay(boardDayId) {
      return database.task.findMany({
        where: {
          boardDayId
        },
        select: boardTaskSelect,
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }, { id: "asc" }]
      });
    }
  };
}
