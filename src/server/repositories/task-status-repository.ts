import { Prisma, PrismaClient, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskStatusDatabase = Pick<PrismaClient, "task">;

const taskStatusSelect = {
  id: true,
  assignedUserId: true,
  requiresManagerApproval: true,
  status: true,
  blockerReason: true,
  updatedAt: true
} satisfies Prisma.TaskSelect;

export type TaskStatusRecord = Prisma.TaskGetPayload<{
  select: typeof taskStatusSelect;
}>;

export type TaskStatusUpdateData = {
  status: TaskStatus;
  blockerReason?: string;
};

export type TaskStatusRepository = {
  findTaskById(taskId: string): Promise<TaskStatusRecord | null>;
  updateTaskStatus(taskId: string, data: TaskStatusUpdateData): Promise<TaskStatusRecord>;
};

export function createTaskStatusRepository(database: TaskStatusDatabase = prisma): TaskStatusRepository {
  return {
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
          ...(data.blockerReason !== undefined ? { blockerReason: data.blockerReason } : {})
        },
        select: taskStatusSelect
      });
    }
  };
}
