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
  templateSnapshot: true,
  updateFieldValues: true,
  readyForReviewAt: true,
  completedAt: true,
  reviewedByUserId: true,
  acceptedAt: true,
  acceptedByUserId: true,
  completionOverrideAt: true,
  completionOverrideByUserId: true,
  completionOverrideReason: true,
  checklistItems: {
    select: {
      key: true,
      label: true,
      isRequired: true,
      completed: true
    }
  },
  concernLink: {
    select: {
      dependsOnStepCodes: true,
      concernCase: {
        select: {
          taskLinks: {
            select: {
              stepCode: true,
              task: { select: { status: true } }
            }
          }
        }
      }
    }
  },
  updatedAt: true
} as const;

export type TaskStatusRecord = Prisma.TaskGetPayload<{
  select: typeof taskStatusSelect;
}>;

export type TaskStatusLookupRecord = {
  id: string;
  assignedUserId: string;
  requiresManagerApproval: boolean;
  status: TaskStatus;
  blockerReason: string | null;
  templateSnapshot?: Prisma.JsonValue | null;
  updateFieldValues?: Prisma.JsonValue | null;
  readyForReviewAt: Date | null;
  completedAt: Date | null;
  reviewedByUserId: string | null;
  acceptedAt?: Date | null;
  acceptedByUserId?: string | null;
  completionOverrideAt?: Date | null;
  completionOverrideByUserId?: string | null;
  completionOverrideReason?: string | null;
  updatedAt: Date;
  checklistItems?: Array<{ key: string | null; label: string; isRequired: boolean; completed: boolean }>;
  concernLink?: {
    dependsOnStepCodes: Prisma.JsonValue;
    concernCase: { taskLinks: Array<{ stepCode: string; task: { status: TaskStatus } }> };
  } | null;
  boardDayId?: string;
  title?: string;
};

export type TaskStatusUpdateData = {
  status: TaskStatus;
  blockerReason?: string;
  updateFieldValues?: Prisma.InputJsonValue;
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
          ...(data.updateFieldValues !== undefined ? { updateFieldValues: data.updateFieldValues } : {}),
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
