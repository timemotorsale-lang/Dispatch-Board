import { Prisma, PrismaClient, type TaskChecklistItemKind } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskChecklistDatabase = Pick<PrismaClient, "task" | "taskChecklistItem">;

const taskChecklistTaskSelect = {
  id: true,
  boardDayId: true,
  title: true,
  assignedUserId: true,
  requiresManagerApproval: true
} satisfies Prisma.TaskSelect;

const taskChecklistItemSelect = {
  id: true,
  taskId: true,
  kind: true,
  label: true,
  completed: true,
  sortOrder: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.TaskChecklistItemSelect;

export type TaskChecklistTaskRecord = Prisma.TaskGetPayload<{
  select: typeof taskChecklistTaskSelect;
}>;

export type TaskChecklistItemRecord = Prisma.TaskChecklistItemGetPayload<{
  select: typeof taskChecklistItemSelect;
}>;

export type TaskChecklistTaskLookupRecord = {
  id: string;
  boardDayId: string;
  title: string;
  assignedUserId: string;
  requiresManagerApproval: boolean;
};

export type TaskChecklistCreateInput = {
  kind: TaskChecklistItemKind;
  label: string;
  completed?: boolean;
};

export type TaskChecklistUpdateInput = {
  completed: boolean;
};

export type TaskChecklistRepository = {
  supportsActivityEvents?: boolean;
  findTaskById(taskId: string): Promise<TaskChecklistTaskLookupRecord | null>;
  listItemsForTask(taskId: string, kind?: TaskChecklistItemKind): Promise<TaskChecklistItemRecord[]>;
  findItemById(taskId: string, itemId: string): Promise<TaskChecklistItemRecord | null>;
  createItem(taskId: string, input: TaskChecklistCreateInput): Promise<TaskChecklistItemRecord>;
  updateItem(taskId: string, itemId: string, input: TaskChecklistUpdateInput): Promise<TaskChecklistItemRecord>;
};

export function createTaskChecklistRepository(
  database: TaskChecklistDatabase = prisma
): TaskChecklistRepository {
  return {
    supportsActivityEvents: true,
    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskChecklistTaskSelect
      });
    },

    async listItemsForTask(taskId, kind) {
      return database.taskChecklistItem.findMany({
        where: {
          taskId,
          ...(kind ? { kind } : {})
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "asc"
          }
        ],
        select: taskChecklistItemSelect
      });
    },

    async findItemById(taskId, itemId) {
      return database.taskChecklistItem.findFirst({
        where: {
          id: itemId,
          taskId
        },
        select: taskChecklistItemSelect
      });
    },

    async createItem(taskId, input) {
      const maxSortOrder = await database.taskChecklistItem.aggregate({
        where: {
          taskId,
          kind: input.kind
        },
        _max: {
          sortOrder: true
        }
      });

      return database.taskChecklistItem.create({
        data: {
          taskId,
          kind: input.kind,
          label: input.label,
          completed: input.completed ?? false,
          completedAt: input.completed ? new Date() : null,
          sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1
        },
        select: taskChecklistItemSelect
      });
    },

    async updateItem(taskId, itemId, input) {
      return database.taskChecklistItem.update({
        where: {
          id: itemId
        },
        data: {
          completed: input.completed,
          completedAt: input.completed ? new Date() : null
        },
        select: taskChecklistItemSelect
      });
    }
  };
}
