import { Prisma, PrismaClient, type BoardDay, TaskSourceType, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db/client";

type GenerationTasksDatabase = Pick<PrismaClient, "boardDay" | "task">;

const generatedTaskIdentitySelect = {
  id: true,
  sourceTemplateId: true,
  assignedUserId: true
} satisfies Prisma.TaskSelect;

const createdGeneratedTaskSelect = {
  id: true,
  title: true,
  assignedUserId: true,
  recommendedUserId: true,
  dueAt: true,
  sourceTemplateId: true,
  sourceDutyId: true,
  workflowArea: true
} satisfies Prisma.TaskSelect;

export type BoardDayRecord = BoardDay;

export type ExistingGeneratedTaskRecord = Prisma.TaskGetPayload<{
  select: typeof generatedTaskIdentitySelect;
}>;

export type CreatedGeneratedTaskRecord = Prisma.TaskGetPayload<{
  select: typeof createdGeneratedTaskSelect;
}>;

export type CreateGeneratedTaskInput = {
  boardDayId: string;
  title: string;
  description: string;
  assignedUserId: string;
  recommendedUserId: string | null;
  dueAt: Date;
  createdByUserId: string | null;
  requiresManagerApproval: boolean;
  sourceTemplateId: string;
  sourceDutyId: string | null;
  workflowArea: CreatedGeneratedTaskRecord["workflowArea"];
};

export type GenerationTasksRepository = {
  getOrCreateBoardDay(boardDate: string): Promise<BoardDayRecord>;
  listExistingGeneratedTasks(boardDayId: string): Promise<ExistingGeneratedTaskRecord[]>;
  createGeneratedTask(input: CreateGeneratedTaskInput): Promise<CreatedGeneratedTaskRecord | null>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createGenerationTasksRepository(
  database: GenerationTasksDatabase = prisma
): GenerationTasksRepository {
  return {
    async getOrCreateBoardDay(boardDate) {
      return database.boardDay.upsert({
        where: {
          date: toBoardDateValue(boardDate)
        },
        update: {},
        create: {
          date: toBoardDateValue(boardDate)
        }
      });
    },

    async listExistingGeneratedTasks(boardDayId) {
      return database.task.findMany({
        where: {
          boardDayId,
          sourceType: TaskSourceType.TEMPLATE
        },
        select: generatedTaskIdentitySelect,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      });
    },

    async createGeneratedTask(input) {
      try {
        return await database.task.create({
          data: {
            boardDayId: input.boardDayId,
            title: input.title,
            description: input.description,
            assignedUserId: input.assignedUserId,
            recommendedUserId: input.recommendedUserId,
            status: TaskStatus.NOT_STARTED,
            dueAt: input.dueAt,
            createdByUserId: input.createdByUserId,
            requiresManagerApproval: input.requiresManagerApproval,
            sourceType: TaskSourceType.TEMPLATE,
            sourceTemplateId: input.sourceTemplateId,
            sourceDutyId: input.sourceDutyId,
            workflowArea: input.workflowArea
          },
          select: createdGeneratedTaskSelect
        });
      } catch (error) {
        // Treat concurrent inserts for the same generated-task identity as an idempotent skip.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return null;
        }

        throw error;
      }
    }
  };
}
