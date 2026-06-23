import { ActivityEventType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskAssignmentDatabase = Pick<PrismaClient, "activityEvent" | "task" | "user">;

const taskAssignmentUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true
} satisfies Prisma.UserSelect;

const taskAssignmentSelect = {
  id: true,
  boardDayId: true,
  assignedUserId: true,
  recommendedUserId: true,
  recommendationReasonCode: true,
  recommendationReasonText: true,
  recommendationReviewNeeded: true,
  sourceTemplateId: true,
  title: true,
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

export type TaskAssignmentUserRecord = Prisma.UserGetPayload<{
  select: typeof taskAssignmentUserSelect;
}>;

export type TaskAssignmentRecord = Prisma.TaskGetPayload<{
  select: typeof taskAssignmentSelect;
}>;

export type TaskAssignmentRepository = {
  createActivityEvent(input: {
    actorUserId: string | null;
    boardDayId: string;
    eventType: ActivityEventType;
    message: string;
    metadata: Prisma.InputJsonValue;
    taskId: string | null;
  }): Promise<void>;
  findTaskByBoardTemplateAndAssignee(input: {
    assignedUserId: string;
    boardDayId: string;
    excludedTaskId: string;
    sourceTemplateId: string;
  }): Promise<{ id: string } | null>;
  findTaskById(taskId: string): Promise<TaskAssignmentRecord | null>;
  findUserById(userId: string): Promise<TaskAssignmentUserRecord | null>;
  updateTaskAssignment(taskId: string, assignedUserId: string): Promise<TaskAssignmentRecord>;
};

export function createTaskAssignmentRepository(
  database: TaskAssignmentDatabase = prisma
): TaskAssignmentRepository {
  return {
    async createActivityEvent(input) {
      await database.activityEvent.create({
        data: input
      });
    },

    async findTaskByBoardTemplateAndAssignee(input) {
      return database.task.findFirst({
        where: {
          assignedUserId: input.assignedUserId,
          boardDayId: input.boardDayId,
          id: {
            not: input.excludedTaskId
          },
          sourceTemplateId: input.sourceTemplateId
        },
        select: {
          id: true
        }
      });
    },

    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskAssignmentSelect
      });
    },

    async findUserById(userId) {
      return database.user.findUnique({
        where: {
          id: userId
        },
        select: taskAssignmentUserSelect
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
