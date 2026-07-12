import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

const executionSelect = {
  id: true,
  boardDayId: true,
  title: true,
  assignedUserId: true,
  status: true,
  blockerReason: true,
  requiresManagerApproval: true,
  acceptedAt: true,
  acceptedByUserId: true,
  completionOverrideAt: true,
  completionOverrideByUserId: true,
  completionOverrideReason: true,
  templateSnapshot: true,
  updateFieldValues: true,
  checklistItems: {
    select: { key: true, label: true, isRequired: true, completed: true }
  },
  concernLink: {
    select: {
      dependsOnStepCodes: true,
      concernCase: {
        select: {
          taskLinks: { select: { stepCode: true, task: { select: { status: true } } } }
        }
      }
    }
  }
} as const;

export type TaskExecutionRecord = Prisma.TaskGetPayload<{ select: typeof executionSelect }>;

export type TaskExecutionRepository = {
  findTask(taskId: string): Promise<TaskExecutionRecord | null>;
  acceptTask(taskId: string, userId: string, acceptedAt: Date): Promise<TaskExecutionRecord>;
  overrideCompletion(taskId: string, userId: string, reason: string, overriddenAt: Date): Promise<TaskExecutionRecord>;
};

export function createTaskExecutionRepository(
  database: Pick<PrismaClient, "task"> = prisma
): TaskExecutionRepository {
  return {
    findTask: (taskId) => database.task.findUnique({ where: { id: taskId }, select: executionSelect }),
    acceptTask: (taskId, userId, acceptedAt) => database.task.update({
      where: { id: taskId },
      data: { acceptedAt, acceptedByUserId: userId },
      select: executionSelect
    }),
    overrideCompletion: (taskId, userId, reason, overriddenAt) => database.task.update({
      where: { id: taskId },
      data: {
        completionOverrideAt: overriddenAt,
        completionOverrideByUserId: userId,
        completionOverrideReason: reason
      },
      select: executionSelect
    })
  };
}
