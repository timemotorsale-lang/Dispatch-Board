import { ActivityEventType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskCommentDatabase = Pick<PrismaClient, "activityEvent" | "task" | "taskComment">;

const taskCommentTaskSelect = {
  id: true,
  boardDayId: true,
  assignedUserId: true,
  requiresManagerApproval: true
} satisfies Prisma.TaskSelect;

const taskCommentSelect = {
  id: true,
  taskId: true,
  authorUserId: true,
  body: true,
  createdAt: true,
  authorUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.TaskCommentSelect;

export type TaskCommentTaskRecord = Prisma.TaskGetPayload<{
  select: typeof taskCommentTaskSelect;
}>;

export type TaskCommentRecord = Prisma.TaskCommentGetPayload<{
  select: typeof taskCommentSelect;
}>;

export type TaskCommentRepository = {
  createActivityEvent(input: {
    actorUserId: string | null;
    boardDayId: string;
    eventType: ActivityEventType;
    message: string;
    metadata: Prisma.InputJsonValue;
    taskId: string | null;
  }): Promise<void>;
  findTaskById(taskId: string): Promise<TaskCommentTaskRecord | null>;
  listCommentsForTask(taskId: string): Promise<TaskCommentRecord[]>;
  createComment(taskId: string, authorUserId: string, body: string): Promise<TaskCommentRecord>;
};

export function createTaskCommentRepository(
  database: TaskCommentDatabase = prisma
): TaskCommentRepository {
  return {
    async createActivityEvent(input) {
      await database.activityEvent.create({
        data: input
      });
    },

    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskCommentTaskSelect
      });
    },

    async listCommentsForTask(taskId) {
      return database.taskComment.findMany({
        where: {
          taskId
        },
        orderBy: {
          createdAt: "asc"
        },
        select: taskCommentSelect
      });
    },

    async createComment(taskId, authorUserId, body) {
      return database.taskComment.create({
        data: {
          taskId,
          authorUserId,
          body
        },
        select: taskCommentSelect
      });
    }
  };
}
