import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskSavedViewDatabase = Pick<PrismaClient, "taskSavedView">;

const taskSavedViewSelect = {
  id: true,
  name: true,
  config: true,
  createdAt: true,
  updatedAt: true,
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.TaskSavedViewSelect;

export type TaskSavedViewRecord = Prisma.TaskSavedViewGetPayload<{
  select: typeof taskSavedViewSelect;
}>;

export type CreateTaskSavedViewRecordInput = {
  config: Prisma.InputJsonValue;
  createdByUserId: string;
  name: string;
};

export type TaskSavedViewRepository = {
  createSavedView(input: CreateTaskSavedViewRecordInput): Promise<TaskSavedViewRecord>;
  deleteSavedView(id: string): Promise<void>;
  listSavedViews(): Promise<TaskSavedViewRecord[]>;
};

export function createTaskSavedViewRepository(
  database: TaskSavedViewDatabase = prisma
): TaskSavedViewRepository {
  return {
    async createSavedView(input) {
      return database.taskSavedView.create({
        data: input,
        select: taskSavedViewSelect
      });
    },

    async deleteSavedView(id) {
      await database.taskSavedView.delete({
        where: {
          id
        }
      });
    },

    async listSavedViews() {
      return database.taskSavedView.findMany({
        orderBy: {
          createdAt: "desc"
        },
        select: taskSavedViewSelect,
        take: 24
      });
    }
  };
}
