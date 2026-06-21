import { ActivityEventType, Prisma, PrismaClient, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskStatusDatabase = Pick<PrismaClient, "task" | "activityEvent" | "$transaction">;

const taskStatusSelect = {
  id: true,
  boardDayId: true,
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

export type TaskStatusUpdateData = {
  status: TaskStatus;
  blockerReason?: string;
  readyForReviewAt?: Date | null;
  completedAt?: Date | null;
  reviewedByUserId?: string | null;
};

export type TaskStatusRepository = {
  findTaskById(taskId: string): Promise<TaskStatusRecord | null>;
  updateTaskStatusWithActivityEvents(taskId: string, actorUserId: string, data: TaskStatusUpdateData): Promise<TaskStatusRecord>;
};

function specificEventType(status: TaskStatus) {
  const eventTypes: Partial<Record<TaskStatus, ActivityEventType>> = {
    BLOCKED: ActivityEventType.TASK_BLOCKED,
    WAITING_ON_PARTS: ActivityEventType.TASK_WAITING_ON_PARTS,
    WAITING_ON_APPROVAL: ActivityEventType.TASK_WAITING_ON_APPROVAL,
    READY_FOR_REVIEW: ActivityEventType.TASK_READY_FOR_REVIEW,
    COMPLETED: ActivityEventType.TASK_COMPLETED
  };
  return eventTypes[status];
}

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

    async updateTaskStatusWithActivityEvents(taskId, actorUserId, data) {
      return database.$transaction(async (transaction) => {
        const previous = await transaction.task.findUniqueOrThrow({ where: { id: taskId }, select: taskStatusSelect });
        const task = await transaction.task.update({
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
        const metadata = {
          previousStatus: previous.status,
          newStatus: task.status,
          blockerReason: task.status === TaskStatus.BLOCKED ? task.blockerReason : null,
          readyForReviewAt: task.readyForReviewAt?.toISOString() ?? null,
          completedAt: task.completedAt?.toISOString() ?? null,
          reviewedByUserId: task.reviewedByUserId
        };
        await transaction.activityEvent.create({ data: { boardDayId: task.boardDayId, actorUserId, taskId, eventType: ActivityEventType.STATUS_CHANGED, message: `Status changed from ${previous.status} to ${task.status}`, metadata } });
        const lifecycleType = specificEventType(task.status);
        if (lifecycleType) {
          await transaction.activityEvent.create({ data: { boardDayId: task.boardDayId, actorUserId, taskId, eventType: lifecycleType, message: task.status === TaskStatus.READY_FOR_REVIEW ? "Task marked Ready for Review" : task.status === TaskStatus.COMPLETED ? "Task completed" : `Task marked ${task.status}`, metadata } });
        }
        if (task.status === TaskStatus.COMPLETED && task.requiresManagerApproval) {
          await transaction.activityEvent.create({ data: { boardDayId: task.boardDayId, actorUserId, taskId, eventType: ActivityEventType.MANAGER_APPROVED_COMPLETION, message: "Manager approved task completion", metadata } });
        }
        return task;
      });
    }
  };
}
