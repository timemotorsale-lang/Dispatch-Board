import { ActivityEventType, Prisma, PrismaClient, type BoardDay } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskCreateDatabase = Pick<PrismaClient, "activityEvent" | "boardDay" | "task" | "user">;

const taskCreateAssigneeSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true
} satisfies Prisma.UserSelect;

const createdTaskSelect = {
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
  }
} satisfies Prisma.TaskSelect;

export type TaskCreateAssignedUserRecord = Prisma.UserGetPayload<{
  select: typeof taskCreateAssigneeSelect;
}>;

export type CreatedTaskRecord = Prisma.TaskGetPayload<{
  select: typeof createdTaskSelect;
}>;

export type CreateTaskRecordInput = {
  assignedUserId: string;
  blockerReason?: string;
  boardDayId: string;
  completedAt?: Date | null;
  createdByUserId: string;
  customerReference?: string;
  description: string;
  dueAt: Date;
  readyForReviewAt?: Date | null;
  requiresManagerApproval: boolean;
  reviewedByUserId?: string | null;
  status: CreatedTaskRecord["status"];
  title: string;
  vehicleReference?: string;
  workflowArea: CreatedTaskRecord["workflowArea"];
};

export type TaskCreateRepository = {
<<<<<<< HEAD
  supportsActivityEvents?: boolean;
=======
  createActivityEvent(input: {
    actorUserId: string | null;
    boardDayId: string;
    eventType: ActivityEventType;
    message: string;
    metadata: Prisma.InputJsonValue;
    taskId: string | null;
  }): Promise<void>;
>>>>>>> main
  createTask(input: CreateTaskRecordInput): Promise<CreatedTaskRecord>;
  findAssignedUserById(userId: string): Promise<TaskCreateAssignedUserRecord | null>;
  getOrCreateBoardDay(boardDate: string): Promise<BoardDay>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createTaskCreateRepository(
  database: TaskCreateDatabase = prisma
): TaskCreateRepository {
  return {
<<<<<<< HEAD
    supportsActivityEvents: true,
=======
    async createActivityEvent(input) {
      await database.activityEvent.create({
        data: input
      });
    },

>>>>>>> main
    async createTask(input) {
      return database.task.create({
        data: {
          assignedUserId: input.assignedUserId,
          ...(input.blockerReason ? { blockerReason: input.blockerReason } : {}),
          boardDayId: input.boardDayId,
          ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
          createdByUserId: input.createdByUserId,
          ...(input.customerReference ? { customerReference: input.customerReference } : {}),
          description: input.description,
          dueAt: input.dueAt,
          ...(input.readyForReviewAt !== undefined ? { readyForReviewAt: input.readyForReviewAt } : {}),
          requiresManagerApproval: input.requiresManagerApproval,
          ...(input.reviewedByUserId !== undefined
            ? { reviewedByUserId: input.reviewedByUserId }
            : {}),
          sourceType: "MANAGER",
          status: input.status,
          title: input.title,
          ...(input.vehicleReference ? { vehicleReference: input.vehicleReference } : {}),
          workflowArea: input.workflowArea
        },
        select: createdTaskSelect
      });
    },

    async findAssignedUserById(userId) {
      return database.user.findUnique({
        where: {
          id: userId
        },
        select: taskCreateAssigneeSelect
      });
    },

    async getOrCreateBoardDay(boardDate) {
      return database.boardDay.upsert({
        where: {
          date: toBoardDateValue(boardDate)
        },
        update: {},
        create: {
          date: toBoardDateValue(boardDate)
        }
      });
    }
  };
}
