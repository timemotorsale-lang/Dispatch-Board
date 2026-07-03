import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskCommentDatabase = Pick<PrismaClient, "task" | "taskComment">;

const taskCommentTaskSelect = {
  id: true,
  boardDayId: true,
  title: true,
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

export type TaskCommentTaskLookupRecord = {
  id: string;
  assignedUserId: string;
  requiresManagerApproval: boolean;
  boardDayId?: string;
  title?: string;
};

export type TaskCommentRecord = Prisma.TaskCommentGetPayload<{
  select: typeof taskCommentSelect;
}>;

export type TaskCommentRepository = {
  supportsActivityEvents?: boolean;
  findTaskById(taskId: string): Promise<TaskCommentTaskLookupRecord | null>;
  listCommentsForTask(taskId: string): Promise<TaskCommentRecord[]>;
  createComment(taskId: string, authorUserId: string, body: string): Promise<TaskCommentRecord>;
};

export function createTaskCommentRepository(
  database: TaskCommentDatabase = prisma
): TaskCommentRepository {
  return {
    supportsActivityEvents: true,
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
