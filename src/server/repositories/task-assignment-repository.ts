<<<<<<< HEAD
import { Prisma, PrismaClient, TaskSourceType } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskAssignmentDatabase = Pick<PrismaClient, "task" | "user">;
=======
import { ActivityEventType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskAssignmentDatabase = Pick<PrismaClient, "activityEvent" | "task" | "user">;
>>>>>>> main

const taskAssignmentUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true
} satisfies Prisma.UserSelect;

const taskAssignmentSelect = {
  id: true,
<<<<<<< HEAD
  title: true,
=======
>>>>>>> main
  boardDayId: true,
  assignedUserId: true,
  recommendedUserId: true,
  recommendationReasonCode: true,
<<<<<<< HEAD
  recommendationExplanation: true,
  sourceTemplateId: true,
  sourceType: true,
=======
  recommendationReasonText: true,
  recommendationReviewNeeded: true,
  sourceTemplateId: true,
  title: true,
>>>>>>> main
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

<<<<<<< HEAD
const generatedTaskConflictSelect = {
  id: true
} satisfies Prisma.TaskSelect;

=======
>>>>>>> main
export type TaskAssignmentUserRecord = Prisma.UserGetPayload<{
  select: typeof taskAssignmentUserSelect;
}>;

export type TaskAssignmentRecord = Prisma.TaskGetPayload<{
  select: typeof taskAssignmentSelect;
}>;

<<<<<<< HEAD
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
=======
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
>>>>>>> main
  updateTaskAssignment(taskId: string, assignedUserId: string): Promise<TaskAssignmentRecord>;
};

export function createTaskAssignmentRepository(
  database: TaskAssignmentDatabase = prisma
): TaskAssignmentRepository {
  return {
<<<<<<< HEAD
    supportsActivityEvents: true,
=======
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

>>>>>>> main
    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskAssignmentSelect
      });
    },

<<<<<<< HEAD
    async findAssignableUserById(userId) {
=======
    async findUserById(userId) {
>>>>>>> main
      return database.user.findUnique({
        where: {
          id: userId
        },
        select: taskAssignmentUserSelect
      });
    },

<<<<<<< HEAD
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

=======
>>>>>>> main
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
