import { ActivityEventType, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { TaskAssignmentMode } from "@/server/validation/task-assignment";

type Database = Pick<PrismaClient, "task" | "user" | "activityEvent" | "$transaction">;
const select = { id: true, boardDayId: true, assignedUserId: true, recommendedUserId: true, updatedAt: true } satisfies Prisma.TaskSelect;
export type TaskAssignmentRecord = Prisma.TaskGetPayload<{ select: typeof select }>;

export type TaskAssignmentRepository = {
  findTaskById(id: string): Promise<TaskAssignmentRecord | null>;
  isActiveUser(id: string): Promise<boolean>;
  assignWithActivity(id: string, actorUserId: string, assignedUserId: string, mode: TaskAssignmentMode, reason?: string): Promise<TaskAssignmentRecord>;
};

export function createTaskAssignmentRepository(database: Database = prisma): TaskAssignmentRepository {
  return {
    findTaskById: (id) => database.task.findUnique({ where: { id }, select }),
    async isActiveUser(id) {
      return Boolean(await database.user.findFirst({ where: { id, isActive: true }, select: { id: true } }));
    },
    assignWithActivity(id, actorUserId, assignedUserId, mode, reason) {
      return database.$transaction(async (tx) => {
        const previous = await tx.task.findUniqueOrThrow({ where: { id }, select });
        const task = await tx.task.update({ where: { id }, data: { assignedUserId }, select });
        await tx.activityEvent.create({
          data: {
            boardDayId: task.boardDayId,
            actorUserId,
            taskId: id,
            eventType: previous.assignedUserId === assignedUserId ? ActivityEventType.TASK_ASSIGNED : ActivityEventType.ASSIGNMENT_CHANGED,
            message: previous.assignedUserId === assignedUserId ? "Task assignment confirmed" : "Task assignment changed",
            metadata: { previousAssignedUserId: previous.assignedUserId, assignedUserId, recommendedUserId: task.recommendedUserId, mode, reason: reason ?? null }
          }
        });
        return task;
      });
    }
  };
}
