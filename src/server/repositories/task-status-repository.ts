import { Prisma, PrismaClient, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskStatusDatabase = Pick<PrismaClient, "task">;

const taskStatusSelect = {
  id: true,
  boardDayId: true,
  title: true,
  assignedUserId: true,
  requiresManagerApproval: true,
  status: true,
  blockerReason: true,
  readyForReviewAt: true,
  completedAt: true,
  reviewedByUserId: true,
  updatedAt: true
} satisfies Prisma.TaskSelect;

export type TaskStatusRecord = Prisma.TaskGetPayload<{
  select: typeof taskStatusSelect;
}>;

export type TaskStatusLookupRecord = {
  id: string;
  assignedUserId: string;
  requiresManagerApproval: boolean;
  status: TaskStatus;
  blockerReason: string | null;
  readyForReviewAt: Date | null;
  completedAt: Date | null;
  reviewedByUserId: string | null;
  updatedAt: Date;
  boardDayId?: string;
  title?: string;
};

export type TaskStatusUpdateData = {
  status: TaskStatus;
  blockerReason?: string;
  readyForReviewAt?: Date | null;
  completedAt?: Date | null;
  reviewedByUserId?: string | null;
};

export type TaskStatusRepository = {
  supportsActivityEvents?: boolean;
  findTaskById(taskId: string): Promise<TaskStatusLookupRecord | null>;
  updateTaskStatus(taskId: string, data: TaskStatusUpdateData): Promise<TaskStatusLookupRecord>;
};

export function createTaskStatusRepository(database: TaskStatusDatabase = prisma): TaskStatusRepository {
  return {
    supportsActivityEvents: true,
    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskStatusSelect
      });
    },

    async updateTaskStatus(taskId, data) {
      return database.task.update({
        where: {
          id: taskId
        },
        data: {
          status: data.status,
          ...(data.blockerReason !== undefined ? { blockerReason: data.blockerReason } : {}),
          ...(data.readyForReviewAt !== undefined ? { readyForReviewAt: data.readyForReviewAt } : {}),
          ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
          ...(data.reviewedByUserId !== undefined
            ? { reviewedByUserId: data.reviewedByUserId }
            : {})
        },
        select: taskStatusSelect
      });
    }
  };
}
