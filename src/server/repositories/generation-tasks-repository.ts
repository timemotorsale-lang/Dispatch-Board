import {
  GenerationRunStatus,
  Prisma,
  PrismaClient,
  TaskSourceType,
  TaskStatus,
  type BoardDay,
  type GenerationRun,
  type GenerationTriggerType
} from "@prisma/client";

import { prisma } from "@/server/db/client";

type GenerationTasksDatabase = Pick<PrismaClient, "boardDay" | "generationRun" | "task">;

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
  recommendationReasonCode: true,
  recommendationExplanation: true,
  dueAt: true,
  priority: true,
  sourceTemplateId: true,
  templateSnapshot: true,
  sourceDutyId: true,
  workflowArea: true
} satisfies Prisma.TaskSelect;

export type BoardDayRecord = BoardDay;
export type GenerationRunRecord = GenerationRun;

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
  recommendationReasonCode: string | null;
  recommendationExplanation: string | null;
  dueAt: Date;
  priority: CreatedGeneratedTaskRecord["priority"];
  createdByUserId: string | null;
  requiresManagerApproval: boolean;
  sourceTemplateId: string;
  templateSnapshot: Prisma.InputJsonValue;
  sourceDutyId: string | null;
  workflowArea: CreatedGeneratedTaskRecord["workflowArea"];
};

export type StartGenerationRunInput = {
  boardDate: string;
  startedAt: Date;
  triggeredBy: GenerationTriggerType;
  triggeredByUserId: string | null;
  summary: Prisma.InputJsonValue;
};

export type CompleteGenerationRunInput = {
  id: string;
  finishedAt: Date;
  summary: Prisma.InputJsonValue;
};

export type FailGenerationRunInput = {
  id: string;
  finishedAt: Date;
  summary: Prisma.InputJsonValue;
  errorMessage: string;
};

export type GenerationTasksRepository = {
  supportsActivityEvents?: boolean;
  getOrCreateBoardDay(boardDate: string): Promise<BoardDayRecord>;
  markBoardDayGenerationStarted(boardDayId: string): Promise<BoardDayRecord>;
  markBoardDayGenerationSucceeded(input: {
    boardDayId: string;
    generatedAt: Date;
    generatedByUserId: string | null;
  }): Promise<BoardDayRecord>;
  markBoardDayGenerationFailed(boardDayId: string): Promise<BoardDayRecord>;
  listExistingGeneratedTasks(boardDayId: string): Promise<ExistingGeneratedTaskRecord[]>;
  countManualTasks(boardDayId: string): Promise<number>;
  createGeneratedTask(input: CreateGeneratedTaskInput): Promise<CreatedGeneratedTaskRecord | null>;
  startGenerationRun(input: StartGenerationRunInput): Promise<GenerationRunRecord>;
  completeGenerationRun(input: CompleteGenerationRunInput): Promise<GenerationRunRecord>;
  failGenerationRun(input: FailGenerationRunInput): Promise<GenerationRunRecord>;
  listGenerationRunsForDate(boardDate: string): Promise<GenerationRunRecord[]>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createGenerationTasksRepository(
  database: GenerationTasksDatabase = prisma
): GenerationTasksRepository {
  return {
    supportsActivityEvents: true,
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

    async markBoardDayGenerationStarted(boardDayId) {
      return database.boardDay.update({
        where: {
          id: boardDayId
        },
        data: {
          generationStatus: "IN_PROGRESS"
        }
      });
    },

    async markBoardDayGenerationSucceeded(input) {
      return database.boardDay.update({
        where: {
          id: input.boardDayId
        },
        data: {
          generationStatus: "GENERATED",
          generatedAt: input.generatedAt,
          generatedByUserId: input.generatedByUserId
        }
      });
    },

    async markBoardDayGenerationFailed(boardDayId) {
      return database.boardDay.update({
        where: {
          id: boardDayId
        },
        data: {
          generationStatus: "FAILED"
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

    async countManualTasks(boardDayId) {
      return database.task.count({
        where: {
          boardDayId,
          sourceType: {
            in: [TaskSourceType.MANAGER, TaskSourceType.STAFF, TaskSourceType.CONCERN]
          }
        }
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
            recommendationReasonCode: input.recommendationReasonCode,
            recommendationExplanation: input.recommendationExplanation,
            status: TaskStatus.NOT_STARTED,
            priority: input.priority,
            dueAt: input.dueAt,
            createdByUserId: input.createdByUserId,
            requiresManagerApproval: input.requiresManagerApproval,
            sourceType: TaskSourceType.TEMPLATE,
            sourceTemplateId: input.sourceTemplateId,
            templateSnapshot: input.templateSnapshot,
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
    },

    async startGenerationRun(input) {
      return database.generationRun.create({
        data: {
          boardDate: toBoardDateValue(input.boardDate),
          startedAt: input.startedAt,
          status: GenerationRunStatus.RUNNING,
          triggeredBy: input.triggeredBy,
          triggeredByUserId: input.triggeredByUserId,
          summary: input.summary
        }
      });
    },

    async completeGenerationRun(input) {
      return database.generationRun.update({
        where: {
          id: input.id
        },
        data: {
          finishedAt: input.finishedAt,
          status: GenerationRunStatus.SUCCEEDED,
          summary: input.summary,
          errorMessage: null
        }
      });
    },

    async failGenerationRun(input) {
      return database.generationRun.update({
        where: {
          id: input.id
        },
        data: {
          finishedAt: input.finishedAt,
          status: GenerationRunStatus.FAILED,
          summary: input.summary,
          errorMessage: input.errorMessage
        }
      });
    },

    async listGenerationRunsForDate(boardDate) {
      return database.generationRun.findMany({
        where: {
          boardDate: toBoardDateValue(boardDate)
        },
        orderBy: [{ startedAt: "desc" }, { id: "desc" }]
      });
    }
  };
}
