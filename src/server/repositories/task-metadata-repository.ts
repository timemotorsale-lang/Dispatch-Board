import { Prisma, PrismaClient, type WorkflowArea } from "@prisma/client";

import { prisma } from "@/server/db/client";

type TaskMetadataDatabase = Pick<PrismaClient, "task">;

const taskMetadataSelect = {
  id: true,
  boardDayId: true,
  title: true,
  assignedUserId: true,
  requiresManagerApproval: true,
  description: true,
  dueAt: true,
  vehicleReference: true,
  customerReference: true,
  workflowArea: true,
  updatedAt: true
} satisfies Prisma.TaskSelect;

export type TaskMetadataRecord = Prisma.TaskGetPayload<{
  select: typeof taskMetadataSelect;
}>;

export type TaskMetadataLookupRecord = {
  id: string;
  boardDayId: string;
  title: string;
  assignedUserId: string;
  requiresManagerApproval: boolean;
  description: string;
  dueAt: Date;
  vehicleReference: string | null;
  customerReference: string | null;
  workflowArea: string;
  updatedAt: Date;
};

export type TaskMetadataUpdateData = {
  description?: string;
  dueAt?: Date;
  vehicleReference?: string | null;
  customerReference?: string | null;
  workflowArea?: WorkflowArea;
};

export type TaskMetadataRepository = {
  supportsActivityEvents?: boolean;
  findTaskById(taskId: string): Promise<TaskMetadataLookupRecord | null>;
  updateTaskMetadata(taskId: string, data: TaskMetadataUpdateData): Promise<TaskMetadataLookupRecord>;
};

export function createTaskMetadataRepository(
  database: TaskMetadataDatabase = prisma
): TaskMetadataRepository {
  return {
    supportsActivityEvents: true,
    async findTaskById(taskId) {
      return database.task.findUnique({
        where: {
          id: taskId
        },
        select: taskMetadataSelect
      });
    },

    async updateTaskMetadata(taskId, data) {
      return database.task.update({
        where: {
          id: taskId
        },
        data: {
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
          ...(data.vehicleReference !== undefined
            ? { vehicleReference: data.vehicleReference }
            : {}),
          ...(data.customerReference !== undefined
            ? { customerReference: data.customerReference }
            : {}),
          ...(data.workflowArea !== undefined ? { workflowArea: data.workflowArea } : {})
        },
        select: taskMetadataSelect
      });
    }
  };
}
