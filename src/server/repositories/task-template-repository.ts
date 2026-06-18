import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type {
  NormalizedTaskTemplateCreateInput,
  NormalizedTaskTemplateUpdateInput
} from "@/server/validation/task-template";

type TaskTemplateDatabase = Pick<PrismaClient, "taskTemplate" | "role" | "duty">;

const taskTemplateInclude = {
  role: {
    select: {
      id: true,
      name: true
    }
  },
  duty: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.TaskTemplateInclude;

export type TaskTemplateRecord = Prisma.TaskTemplateGetPayload<{
  include: typeof taskTemplateInclude;
}>;

export function createTaskTemplateRepository(database: TaskTemplateDatabase = prisma) {
  return {
    async listTaskTemplates(options: { includeInactive?: boolean } = {}): Promise<TaskTemplateRecord[]> {
      return database.taskTemplate.findMany({
        where: options.includeInactive ? undefined : { isActive: true },
        include: taskTemplateInclude,
        orderBy: [{ workflowArea: "asc" }, { title: "asc" }, { createdAt: "asc" }]
      });
    },

    async findRoleById(roleId: string) {
      return database.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
          name: true
        }
      });
    },

    async findDutyById(dutyId: string) {
      return database.duty.findUnique({
        where: { id: dutyId },
        select: {
          id: true,
          name: true
        }
      });
    },

    async createTaskTemplate(input: NormalizedTaskTemplateCreateInput): Promise<TaskTemplateRecord> {
      return database.taskTemplate.create({
        data: input,
        include: taskTemplateInclude
      });
    },

    async updateTaskTemplate(
      id: string,
      input: NormalizedTaskTemplateUpdateInput
    ): Promise<TaskTemplateRecord | null> {
      try {
        return await database.taskTemplate.update({
          where: { id },
          data: input,
          include: taskTemplateInclude
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          return null;
        }

        throw error;
      }
    }
  };
}
