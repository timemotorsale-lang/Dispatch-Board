import { Prisma, PrismaClient, TaskSourceType } from "@prisma/client";

import { prisma } from "@/server/db/client";

type BoardOverviewDatabase = Pick<PrismaClient, "boardDay" | "task">;

const boardDaySelect = {
  id: true,
  date: true
} satisfies Prisma.BoardDaySelect;

const taskPreviewSelect = {
  id: true,
  title: true,
  dueAt: true,
  status: true,
  sourceType: true,
  workflowArea: true,
  assignedUser: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.TaskSelect;

export type BoardDaySummaryRecord = Prisma.BoardDayGetPayload<{
  select: typeof boardDaySelect;
}>;

export type BoardTaskPreviewRecord = Prisma.TaskGetPayload<{
  select: typeof taskPreviewSelect;
}>;

export type BoardTaskCountsRecord = {
  total: number;
  generated: number;
  manual: number;
};

export type BoardOverviewRepository = {
  findBoardDayByDate(boardDate: string): Promise<BoardDaySummaryRecord | null>;
  getTaskCounts(boardDayId: string): Promise<BoardTaskCountsRecord>;
  listTaskPreviews(boardDayId: string, limit: number): Promise<BoardTaskPreviewRecord[]>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createBoardOverviewRepository(
  database: BoardOverviewDatabase = prisma
): BoardOverviewRepository {
  return {
    async findBoardDayByDate(boardDate) {
      return database.boardDay.findUnique({
        where: {
          date: toBoardDateValue(boardDate)
        },
        select: boardDaySelect
      });
    },

    async getTaskCounts(boardDayId) {
      const [total, generated, manual] = await Promise.all([
        database.task.count({
          where: {
            boardDayId
          }
        }),
        database.task.count({
          where: {
            boardDayId,
            sourceType: TaskSourceType.TEMPLATE
          }
        }),
        database.task.count({
          where: {
            boardDayId,
            sourceType: {
              in: [TaskSourceType.MANAGER, TaskSourceType.STAFF]
            }
          }
        })
      ]);

      return {
        total,
        generated,
        manual
      };
    },

    async listTaskPreviews(boardDayId, limit) {
      return database.task.findMany({
        where: {
          boardDayId
        },
        select: taskPreviewSelect,
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        take: limit
      });
    }
  };
}
