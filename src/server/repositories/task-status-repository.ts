import { Prisma, PrismaClient, TaskStatus } from "@prisma/client";

import { syncDispatchTaskStatus } from "@/server/dispatch/activity";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone } from "@/server/validation/board-date";
import { prisma } from "@/server/db/client";

type TaskStatusDatabase = Pick<PrismaClient, "task"> & Partial<Pick<PrismaClient, "$transaction">>;

const taskStatusSelect = {
  id: true,
  boardDayId: true,
  title: true,
  assignedUserId: true,
  ownerUserId: true,
  requiresManagerApproval: true,
  status: true,
  workflowArea: true,
  dueAt: true,
  blockerReason: true,
  executionAssurance: true,
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
      kind: true,
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
  workflowArea: string;
  dueAt?: Date;
  blockerReason: string | null;
  executionAssurance?: Prisma.JsonValue | null;
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
  checklistItems?: Array<{ key: string | null; kind: string; label: string; isRequired: boolean; completed: boolean }>;
  concernLink?: {
    dependsOnStepCodes: Prisma.JsonValue;
    concernCase: { taskLinks: Array<{ stepCode: string; task: { status: TaskStatus } }> };
  } | null;
  boardDayId?: string;
  title?: string;
};

export type TaskStatusUpdateData = {
  status: TaskStatus;
  blockerReason?: string | null;
  executionAssurance?: Prisma.InputJsonValue;
  updateFieldValues?: Prisma.InputJsonValue;
  readyForReviewAt?: Date | null;
  completedAt?: Date | null;
  reviewedByUserId?: string | null;
};

export type TaskStatusRepository = {
  commitStatusChange?(taskId: string, data: TaskStatusUpdateData, context: { actorUserId: string; expectedUpdatedAt: Date; previousStatus: string; previousBlockerReason: string | null }): Promise<TaskStatusLookupRecord>;
  supportsActivityEvents?: boolean;
  findTaskById(taskId: string): Promise<TaskStatusLookupRecord | null>;
  updateTaskStatus(taskId: string, data: TaskStatusUpdateData): Promise<TaskStatusLookupRecord>;
};

export function createTaskStatusRepository(database: TaskStatusDatabase = prisma): TaskStatusRepository {
  return {
    supportsActivityEvents: true,
    commitStatusChange: database.$transaction ? async (taskId, data, context) => {
      const settings = await getGenerationSettings(), now = new Date();
      return database.$transaction!(async tx => {
        const changed = await tx.task.updateMany({ where: { id: taskId, updatedAt: context.expectedUpdatedAt }, data });
        if (changed.count !== 1) throw new Error("This task changed. Reload before updating its status.");
        const result = await tx.task.findUniqueOrThrow({ where: { id: taskId }, select: taskStatusSelect });
        if (context.previousStatus !== result.status || context.previousBlockerReason !== result.blockerReason) {
          await syncDispatchTaskStatus(tx, result, context.actorUserId, getBoardDateInTimeZone(now, settings.timezone), context.previousStatus, now);
        }
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } : undefined,
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
          ...(data.executionAssurance !== undefined ? { executionAssurance: data.executionAssurance } : {}),
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
