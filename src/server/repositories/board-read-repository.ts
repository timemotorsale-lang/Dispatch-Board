import { Prisma, PrismaClient, TaskStatus } from "@prisma/client";

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
  priority: true,
  dueAt: true,
  updatedAt: true,
  workflowArea: true,
  sourceType: true,
  requiresManagerApproval: true,
  isClaimable: true,
  templateSnapshot: true,
  updateFieldValues: true,
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
  ownerUser: { select: { id: true, name: true, email: true } },
  collaborators: {
    select: {
      userId: true,
      collaborationScope: true,
      capacityRequested: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  },
  recommendedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  recommendationReasonCode: true,
  recommendationExplanation: true
} as const;

export type BoardReadBoardDayRecord = Prisma.BoardDayGetPayload<{
  select: typeof boardDaySelect;
}>;

export type BoardReadTaskRecord = Prisma.TaskGetPayload<{
  select: typeof boardTaskSelect;
}>;

export type BoardReadRepository = {
  findBoardDayByDate(boardDate: string): Promise<BoardReadBoardDayRecord | null>;
  listOpenPriorityTasks(): Promise<BoardReadTaskRecord[]>;
  listTasksForBoardDay(boardDayId: string): Promise<BoardReadTaskRecord[]>;
  listTasksForOperationsConsole?(boardDayId: string | null): Promise<BoardReadTaskRecord[]>;
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
    },

    async listTasksForOperationsConsole(boardDayId) {
      return database.task.findMany({
        where: {
          OR: [
            { status: { not: TaskStatus.COMPLETED } },
            ...(boardDayId ? [{ boardDayId, status: TaskStatus.COMPLETED }] : [])
          ]
        },
        select: boardTaskSelect,
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }, { id: "asc" }]
      });
    },

    async listOpenPriorityTasks() {
      return database.task.findMany({
        where: {
          status: { not: TaskStatus.COMPLETED }
        },
        select: boardTaskSelect,
        orderBy: [{ dueAt: "asc" }, { priority: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        take: 80
      });
    }
  };
}
