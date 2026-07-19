import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";

const select = {
  id: true, name: true, visibility: true, config: true, version: true, createdAt: true, updatedAt: true,
  createdByUser: { select: { id: true, name: true } }
} satisfies Prisma.InventoryConsoleSavedViewSelect;

export type InventoryConsoleSavedViewRecord = Prisma.InventoryConsoleSavedViewGetPayload<{ select: typeof select }>;
export type InventoryConsoleSavedViewRepository = ReturnType<typeof createInventoryConsoleSavedViewRepository>;

export function createInventoryConsoleSavedViewRepository(database: PrismaClient = prisma) {
  return {
    list(organizationId: string, userId: string) {
      return database.inventoryConsoleSavedView.findMany({
        where: { organizationId, OR: [{ createdByUserId: userId }, { visibility: "TEAM" }] },
        orderBy: [{ visibility: "asc" }, { updatedAt: "desc" }], select, take: 50
      });
    },
    find(organizationId: string, id: string, userId: string) {
      return database.inventoryConsoleSavedView.findFirst({
        where: { id, organizationId, OR: [{ createdByUserId: userId }, { visibility: "TEAM" }] }, select
      });
    },
    create(input: { organizationId: string; createdByUserId: string; name: string; visibility: "PERSONAL" | "TEAM"; config: Prisma.InputJsonObject }) {
      return database.inventoryConsoleSavedView.create({ data: input, select });
    },
    async remove(organizationId: string, id: string) {
      await database.inventoryConsoleSavedView.delete({ where: { id, organizationId } });
    }
  };
}
