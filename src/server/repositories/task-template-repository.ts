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
        data: {
          ...input,
          requiredUpdateFields: input.requiredUpdateFields as Prisma.InputJsonValue,
          checklistItems: input.checklistItems as Prisma.InputJsonValue,
          completionCriteria: input.completionCriteria as Prisma.InputJsonValue,
          defaultStatusRules: input.defaultStatusRules as Prisma.InputJsonValue,
          approvalRules: input.approvalRules as Prisma.InputJsonValue,
          taskCardDisplayHints: input.taskCardDisplayHints as Prisma.InputJsonValue
        },
        include: taskTemplateInclude
      });
    },

    async updateTaskTemplate(
      id: string,
      input: NormalizedTaskTemplateUpdateInput
    ): Promise<TaskTemplateRecord | null> {
      try {
        const data: Prisma.TaskTemplateUpdateInput = {
          ...input,
          ...(input.requiredUpdateFields
            ? {
                requiredUpdateFields: input.requiredUpdateFields as Prisma.InputJsonValue
              }
            : {}),
          ...(input.checklistItems
            ? {
                checklistItems: input.checklistItems as Prisma.InputJsonValue
              }
            : {}),
          ...(input.completionCriteria
            ? {
                completionCriteria: input.completionCriteria as Prisma.InputJsonValue
              }
            : {}),
          ...(input.defaultStatusRules
            ? {
                defaultStatusRules: input.defaultStatusRules as Prisma.InputJsonValue
              }
            : {}),
          ...(input.approvalRules
            ? {
                approvalRules: input.approvalRules as Prisma.InputJsonValue
              }
            : {}),
          ...(input.taskCardDisplayHints
            ? {
                taskCardDisplayHints: input.taskCardDisplayHints as Prisma.InputJsonValue
              }
            : {})
        };

        return await database.taskTemplate.update({
          where: { id },
          data,
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
