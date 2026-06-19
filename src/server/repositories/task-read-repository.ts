import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskReadDatabase = Pick<PrismaClient, "task">;

const taskReadSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueAt: true,
  workflowArea: true,
  sourceType: true,
  requiresManagerApproval: true,
  vehicleReference: true,
  customerReference: true,
  blockerReason: true,
  readyForReviewAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  boardDay: {
    select: {
      id: true,
      date: true
    }
  },
  assignedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  recommendedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  reviewedByUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  comments: {
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      taskId: true,
      authorUserId: true,
      body: true,
      createdAt: true,
      authorUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  }
} satisfies Prisma.TaskSelect;

export type TaskReadRecord = Prisma.TaskGetPayload<{
  select: typeof taskReadSelect;
}>;

export type TaskReadRepository = {
  findTaskById(taskId: string): Promise<TaskReadRecord | null>;
};

export function createTaskReadRepository(database: TaskReadDatabase = prisma): TaskReadRepository {
  return {
    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskReadSelect
      });
    }
  };
}
