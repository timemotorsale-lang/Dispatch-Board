import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { NormalizedTeamMemberCreateInput } from "@/server/validation/team-management";

type TeamManagementDatabase = Pick<PrismaClient, "$transaction" | "user" | "role" | "duty">;

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

export function createTeamManagementRepository(database: TeamManagementDatabase = prisma) {
  return {
    async listUsers(): Promise<ManagedUserRecord[]> {
      return database.user.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }, { email: "asc" }],
        select: managedUserSelect
      });
    },

    async listRoles() {
      return database.role.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true
        }
      });
    },

    async listDuties() {
      return database.duty.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          workflowArea: true
        }
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
    }
  };
}
