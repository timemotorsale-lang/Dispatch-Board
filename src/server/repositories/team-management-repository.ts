import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type {
  NormalizedManagedDutyCreateInput,
  NormalizedManagedDutyUpdateInput,
  NormalizedManagedRoleCreateInput,
  NormalizedManagedRoleUpdateInput,
  NormalizedTeamMemberUpdateInput,
  NormalizedTeamMemberCreateInput
} from "@/server/validation/team-management";

type TeamManagementDatabase = Pick<PrismaClient, "$transaction" | "user" | "role" | "duty" | "roleDuty">;

const managedUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  userRoles: {
    select: {
      role: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  userDuties: {
    select: {
      duty: {
        select: {
          id: true,
          name: true
        }
      }
    }
  }
} satisfies Prisma.UserSelect;

export type ManagedUserRecord = Prisma.UserGetPayload<{
  select: typeof managedUserSelect;
}>;

const managedRoleSelect = {
  id: true,
  name: true,
  description: true,
  roleDuties: {
    select: {
      duty: {
        select: {
          id: true,
          name: true
        }
      }
    }
  }
} satisfies Prisma.RoleSelect;

export type ManagedRoleRecord = Prisma.RoleGetPayload<{
  select: typeof managedRoleSelect;
}>;

const managedDutySelect = {
  id: true,
  name: true,
  workflowArea: true,
  description: true
} satisfies Prisma.DutySelect;

export type ManagedDutyRecord = Prisma.DutyGetPayload<{
  select: typeof managedDutySelect;
}>;

export function createTeamManagementRepository(database: TeamManagementDatabase = prisma) {
  return {
    async listUsers(): Promise<ManagedUserRecord[]> {
      return database.user.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }, { email: "asc" }],
        select: managedUserSelect
      });
    },

    async listRoles(): Promise<ManagedRoleRecord[]> {
      return database.role.findMany({
        orderBy: [{ name: "asc" }],
        select: managedRoleSelect
      });
    },

    async listDuties(): Promise<ManagedDutyRecord[]> {
      return database.duty.findMany({
        orderBy: [{ name: "asc" }],
        select: managedDutySelect
      });
    },

    async findRolesByIds(roleIds: string[]) {
      return database.role.findMany({
        where: {
          id: {
            in: roleIds
          }
        },
        select: {
          id: true,
          name: true
        }
      });
    },

    async findDutiesByIds(dutyIds: string[]) {
      return database.duty.findMany({
        where: {
          id: {
            in: dutyIds
          }
        },
        select: {
          id: true,
          name: true
        }
      });
    },

    async createUser(
      input: Omit<NormalizedTeamMemberCreateInput, "password"> & {
        passwordHash: string;
      }
    ): Promise<ManagedUserRecord> {
      try {
        return await database.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: input.passwordHash,
            isActive: input.isActive,
            userRoles: {
              create: input.roleIds.map((roleId) => ({
                roleId
              }))
            },
            userDuties: {
              create: input.dutyIds.map((dutyId) => ({
                dutyId
              }))
            }
          },
          select: managedUserSelect
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("A user with that email already exists.");
        }

        throw error;
      }
    },

    async updateUser(id: string, input: NormalizedTeamMemberUpdateInput): Promise<ManagedUserRecord | null> {
      try {
        return await database.user.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.email !== undefined ? { email: input.email } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            ...(input.roleIds
              ? {
                  userRoles: {
                    deleteMany: {},
                    create: input.roleIds.map((roleId) => ({ roleId }))
                  }
                }
              : {}),
            ...(input.dutyIds
              ? {
                  userDuties: {
                    deleteMany: {},
                    create: input.dutyIds.map((dutyId) => ({ dutyId }))
                  }
                }
              : {})
          },
          select: managedUserSelect
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          return null;
        }

        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("A user with that email already exists.");
        }

        throw error;
      }
    },

    async createRole(input: NormalizedManagedRoleCreateInput): Promise<ManagedRoleRecord> {
      try {
        return await database.role.create({
          data: {
            name: input.name,
            description: input.description,
            roleDuties: {
              create: input.dutyIds.map((dutyId) => ({
                dutyId
              }))
            }
          },
          select: managedRoleSelect
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("A role with that name already exists.");
        }

        throw error;
      }
    },

    async updateRole(id: string, input: NormalizedManagedRoleUpdateInput): Promise<ManagedRoleRecord | null> {
      try {
        return await database.role.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.dutyIds
              ? {
                  roleDuties: {
                    deleteMany: {},
                    create: input.dutyIds.map((dutyId) => ({ dutyId }))
                  }
                }
              : {})
          },
          select: managedRoleSelect
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          return null;
        }

        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("A role with that name already exists.");
        }

        throw error;
      }
    },

    async createDuty(input: NormalizedManagedDutyCreateInput): Promise<ManagedDutyRecord> {
      try {
        return await database.duty.create({
          data: {
            name: input.name,
            workflowArea: input.workflowArea,
            description: input.description
          },
          select: managedDutySelect
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("A duty with that name already exists.");
        }

        throw error;
      }
    },

    async updateDuty(id: string, input: NormalizedManagedDutyUpdateInput): Promise<ManagedDutyRecord | null> {
      try {
        return await database.duty.update({
          where: { id },
          data: input,
          select: managedDutySelect
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          return null;
        }

        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("A duty with that name already exists.");
        }

        throw error;
      }
    }
  };
}
