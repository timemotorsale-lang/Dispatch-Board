import { ActivityEventType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskCommentDatabase = Pick<PrismaClient, "task" | "taskComment" | "activityEvent" | "$transaction">;

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
  findTaskById(taskId: string): Promise<TaskCommentTaskRecord | null>;
  listCommentsForTask(taskId: string): Promise<TaskCommentRecord[]>;
  createCommentWithActivityEvent(taskId: string, authorUserId: string, body: string): Promise<TaskCommentRecord>;
};

export function createTaskCommentRepository(
  database: TaskCommentDatabase = prisma
): TaskCommentRepository {
  return {
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

    async createCommentWithActivityEvent(taskId, authorUserId, body) {
      return database.$transaction(async (transaction) => {
        const task = await transaction.task.findUniqueOrThrow({ where: { id: taskId }, select: { boardDayId: true } });
        const comment = await transaction.taskComment.create({
        data: {
          taskId,
          authorUserId,
          body
        },
        select: taskCommentSelect
        });
        await transaction.activityEvent.create({ data: { boardDayId: task.boardDayId, actorUserId: authorUserId, taskId, eventType: ActivityEventType.COMMENT_ADDED, message: "Comment added", metadata: { commentId: comment.id, authorUserId, preview: body.slice(0, 120) } } });
        return comment;
      });
    }
  };
}
