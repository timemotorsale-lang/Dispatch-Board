import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/client";

import { parseCollectionsSettings, type CollectionsSettings } from "../domain/settings";

type Db = Prisma.TransactionClient;

export async function loadCollectionsSettings(organizationId: string, db: Db = prisma): Promise<CollectionsSettings> {
  const row = await db.collectionsSetting.findUnique({ where: { organizationId }, select: { values: true } });
  return parseCollectionsSettings(row?.values);
}
