import { Prisma, PrismaClient, TaskSourceType } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskAssignmentDatabase = Pick<PrismaClient, "task" | "user">;

const taskAssignmentUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true
} satisfies Prisma.UserSelect;

const taskAssignmentSelect = {
  id: true,
  title: true,
  boardDayId: true,
  assignedUserId: true,
  ownerUserId: true,
  ownerUser: { select: { id: true, name: true, email: true } },
  recommendedUserId: true,
  recommendationReasonCode: true,
  recommendationExplanation: true,
  sourceTemplateId: true,
  sourceType: true,
  updatedAt: true,
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

const generatedTaskConflictSelect = {
  id: true
} satisfies Prisma.TaskSelect;

export type TaskAssignmentUserRecord = Prisma.UserGetPayload<{
  select: typeof taskAssignmentUserSelect;
}>;

export type TaskAssignmentRecord = Prisma.TaskGetPayload<{
  select: typeof taskAssignmentSelect;
}>;

export type TaskAssignmentConflictRecord = Prisma.TaskGetPayload<{
  select: typeof generatedTaskConflictSelect;
}>;

export type TaskAssignmentRepository = {
  supportsActivityEvents?: boolean;
  findTaskById(taskId: string): Promise<TaskAssignmentRecord | null>;
  findAssignableUserById(userId: string): Promise<TaskAssignmentUserRecord | null>;
  findGeneratedAssignmentConflict(input: {
    boardDayId: string;
    sourceTemplateId: string;
    assignedUserId: string;
    excludeTaskId: string;
  }): Promise<TaskAssignmentConflictRecord | null>;
  updateTaskAssignment(taskId: string, assignedUserId: string): Promise<TaskAssignmentRecord>;
};

export function createTaskAssignmentRepository(
  database: TaskAssignmentDatabase = prisma
): TaskAssignmentRepository {
  return {
    supportsActivityEvents: true,
    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskAssignmentSelect
      });
    },

    async findAssignableUserById(userId) {
      return database.user.findUnique({
        where: {
          id: userId
        },
        select: taskAssignmentUserSelect
      });
    },

    async findGeneratedAssignmentConflict(input) {
      return database.task.findFirst({
        where: {
          boardDayId: input.boardDayId,
          sourceTemplateId: input.sourceTemplateId,
          assignedUserId: input.assignedUserId,
          sourceType: TaskSourceType.TEMPLATE,
          NOT: {
            id: input.excludeTaskId
          }
        },
        select: generatedTaskConflictSelect
      });
    },

    async updateTaskAssignment(taskId, assignedUserId) {
      return database.task.update({
        where: {
          id: taskId
        },
        data: {
          assignedUserId
        },
        select: taskAssignmentSelect
      });
    }
  };
}
