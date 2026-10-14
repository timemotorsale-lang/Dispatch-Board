import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

const staffDayInclude = {
  user: { select: { id: true, name: true, email: true } },
  dutyItems: { orderBy: [{ sortOrder: "asc" as const }, { label: "asc" as const }] }
} satisfies Prisma.StaffDayInclude;

const generationUserInclude = {
  userDuties: { include: { duty: true } },
  userRoles: { include: { role: { include: { roleDuties: { include: { duty: true } } } } } }
} satisfies Prisma.UserInclude;

export type StaffDayRecord = Prisma.StaffDayGetPayload<{ include: typeof staffDayInclude }>;
export type StaffDayGenerationUser = Prisma.UserGetPayload<{ include: typeof generationUserInclude }>;
export type StaffDayDutySnapshot = {
  description: string | null;
  label: string;
  required: boolean;
  sortOrder: number;
  sourceDutyId: string;
  sourceKey: string;
  sourceRoleId: string | null;
  sourceType: "DIRECT" | "ROLE";
  workflowArea: string;
};

export type StaffDayRepository = {
  findBoardDay(boardDate: string): Promise<{ id: string } | null>;
  findForUser(boardDate: string, userId: string): Promise<StaffDayRecord | null>;
  listForBoardDate(boardDate: string): Promise<StaffDayRecord[]>;
  listActiveUsers(): Promise<StaffDayGenerationUser[]>;
  upsertPlan(input: { boardDayId: string; duties: StaffDayDutySnapshot[]; userId: string }): Promise<StaffDayRecord>;
  startDay(input: { blockerCode: string | null; blockerNote: string | null; staffDayId: string; startedAt: Date }): Promise<StaffDayRecord>;
  findDutyItem(itemId: string): Promise<(Prisma.StaffDayDutyItemGetPayload<{ include: { staffDay: true } }>) | null>;
  updateDutyItem(input: { completed: boolean; completedAt: Date | null; completedByUserId: string | null; itemId: string }): Promise<void>;
};

function dateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createStaffDayRepository(database: PrismaClient = prisma): StaffDayRepository {
  return {
    async findBoardDay(boardDate) {
      return database.boardDay.findUnique({ where: { date: dateValue(boardDate) }, select: { id: true } });
    },
    async findForUser(boardDate, userId) {
      return database.staffDay.findFirst({
        where: { boardDay: { date: dateValue(boardDate) }, userId },
        include: staffDayInclude
      });
    },
    async listForBoardDate(boardDate) {
      return database.staffDay.findMany({
        where: { boardDay: { date: dateValue(boardDate) } },
        include: staffDayInclude,
        orderBy: [{ user: { name: "asc" } }, { id: "asc" }]
      });
    },
    async listActiveUsers() {
      return database.user.findMany({
        where: { isActive: true },
        include: generationUserInclude,
        orderBy: [{ name: "asc" }, { id: "asc" }]
      });
    },
    async upsertPlan(input) {
      const staffDay = await database.staffDay.upsert({
        where: { boardDayId_userId: { boardDayId: input.boardDayId, userId: input.userId } },
        update: {},
        create: { boardDayId: input.boardDayId, userId: input.userId }
      });

      if (input.duties.length) {
        await database.staffDayDutyItem.createMany({
          data: input.duties.map((duty) => ({ ...duty, staffDayId: staffDay.id })),
          skipDuplicates: true
        });
      }

      return database.staffDay.findUniqueOrThrow({ where: { id: staffDay.id }, include: staffDayInclude });
    },
    async startDay(input) {
      return database.staffDay.update({
        where: { id: input.staffDayId },
        data: {
          status: "ACTIVE",
          startAcknowledgedAt: input.startedAt,
          startingBlockerCode: input.blockerCode,
          startingBlockerNote: input.blockerNote
        },
        include: staffDayInclude
      });
    },
    async findDutyItem(itemId) {
      return database.staffDayDutyItem.findUnique({ where: { id: itemId }, include: { staffDay: true } });
    },
    async updateDutyItem(input) {
      await database.staffDayDutyItem.update({
        where: { id: input.itemId },
        data: {
          completed: input.completed,
          completedAt: input.completedAt,
          completedByUserId: input.completedByUserId
        }
      });
    }
  };
}
