import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskCollaboratorDatabase = Pick<PrismaClient, "task" | "taskCollaborator" | "user" | "$transaction">;

const collaboratorSelect = {
  userId: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, isActive: true } },
  addedByUser: { select: { id: true, name: true } }
} satisfies Prisma.TaskCollaboratorSelect;

export type TaskCollaboratorRecord = Prisma.TaskCollaboratorGetPayload<{ select: typeof collaboratorSelect }>;
export type TaskCollaboratorTaskRecord = { id: string; boardDayId: string; title: string; assignedUserId: string };

export type TaskCollaboratorRepository = {
  findTaskById(taskId: string): Promise<TaskCollaboratorTaskRecord | null>;
  findActiveUsersByIds(userIds: string[]): Promise<Array<{ id: string; name: string }>>;
  listForTask(taskId: string): Promise<TaskCollaboratorRecord[]>;
  replace(taskId: string, collaboratorIds: string[], addedByUserId: string): Promise<TaskCollaboratorRecord[]>;
};

export function createTaskCollaboratorRepository(database: TaskCollaboratorDatabase = prisma): TaskCollaboratorRepository {
  return {
    findTaskById(taskId) {
      return database.task.findUnique({ where: { id: taskId }, select: { id: true, boardDayId: true, title: true, assignedUserId: true } });
    },
    findActiveUsersByIds(userIds) {
      return database.user.findMany({ where: { id: { in: userIds }, isActive: true }, select: { id: true, name: true } });
    },
    listForTask(taskId) {
      return database.taskCollaborator.findMany({ where: { taskId }, orderBy: [{ createdAt: "asc" }, { userId: "asc" }], select: collaboratorSelect });
    },
    async replace(taskId, collaboratorIds, addedByUserId) {
      await database.$transaction(async (transaction) => {
        await transaction.taskCollaborator.deleteMany({ where: { taskId, userId: { notIn: collaboratorIds } } });
        if (collaboratorIds.length) {
          await transaction.taskCollaborator.createMany({
            data: collaboratorIds.map((userId) => ({ taskId, userId, addedByUserId })),
            skipDuplicates: true
          });
        }
      });
      return database.taskCollaborator.findMany({ where: { taskId }, orderBy: [{ createdAt: "asc" }, { userId: "asc" }], select: collaboratorSelect });
    }
  };
}
