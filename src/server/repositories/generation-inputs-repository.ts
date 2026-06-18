import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type GenerationInputsDatabase = Pick<PrismaClient, "taskTemplate" | "user">;

const generationUserInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          roleDuties: {
            include: {
              duty: true
            }
          }
        }
      }
    }
  },
  userDuties: {
    include: {
      duty: true
    }
  }
} satisfies Prisma.UserInclude;

const generationTemplateInclude = {
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

export type GenerationUserRecord = Prisma.UserGetPayload<{
  include: typeof generationUserInclude;
}>;

export type GenerationTemplateRecord = Prisma.TaskTemplateGetPayload<{
  include: typeof generationTemplateInclude;
}>;

export type GenerationTemplateQuery = {
  roleIds: string[];
  dutyIds: string[];
};

export type GenerationInputsRepository = {
  listUsersForGeneration(): Promise<GenerationUserRecord[]>;
  listTemplatesForGeneration(query: GenerationTemplateQuery): Promise<GenerationTemplateRecord[]>;
};

function uniqueIds(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function createGenerationInputsRepository(
  database: GenerationInputsDatabase = prisma
): GenerationInputsRepository {
  return {
    async listUsersForGeneration() {
      return database.user.findMany({
        where: { isActive: true },
        include: generationUserInclude,
        orderBy: [{ name: "asc" }, { email: "asc" }, { createdAt: "asc" }, { id: "asc" }]
      });
    },

    async listTemplatesForGeneration(query) {
      const roleIds = uniqueIds(query.roleIds);
      const dutyIds = uniqueIds(query.dutyIds);

      if (roleIds.length === 0 && dutyIds.length === 0) {
        return [];
      }

      const filters: Prisma.TaskTemplateWhereInput[] = [];

      if (roleIds.length > 0) {
        filters.push({
          roleId: {
            in: roleIds
          }
        });
      }

      if (dutyIds.length > 0) {
        filters.push({
          dutyId: {
            in: dutyIds
          }
        });
      }

      return database.taskTemplate.findMany({
        where: {
          isActive: true,
          OR: filters
        },
        include: generationTemplateInclude,
        orderBy: [{ workflowArea: "asc" }, { title: "asc" }, { createdAt: "asc" }, { id: "asc" }]
      });
    }
  };
}
