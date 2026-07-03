import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

type UserSummaryDatabase = Pick<PrismaClient, "user">;

const activeUserSummarySelect = {
  id: true,
  name: true,
  email: true,
  userRoles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
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

export type ActiveUserSummaryRecord = Prisma.UserGetPayload<{
  select: typeof activeUserSummarySelect;
}>;

export type UserSummaryRepository = {
  listActiveUsers(): Promise<ActiveUserSummaryRecord[]>;
};

export function createUserSummaryRepository(
  database: UserSummaryDatabase = prisma
): UserSummaryRepository {
  return {
    async listActiveUsers() {
      return database.user.findMany({
        where: {
          isActive: true
        },
        orderBy: [{ name: "asc" }, { email: "asc" }, { id: "asc" }],
        select: activeUserSummarySelect
      });
    }
  };
}
