import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/client";

import { applyPlaybook, parsePlaybookRules, standardPlaybook } from "../domain/playbook";
import { parseCollectionsSettings, type CollectionsSettings } from "../domain/settings";

type Db = Prisma.TransactionClient;

/** Settings without the playbook (what the Settings screen edits). */
export async function loadBaseSettings(organizationId: string, db: Db = prisma): Promise<CollectionsSettings> {
  const row = await db.collectionsSetting.findUnique({ where: { organizationId }, select: { values: true } });
  return parseCollectionsSettings(row?.values);
}

/**
 * Settings as every automation uses them: the saved settings with the active playbook's
 * review days, message timing and task switches on top (spec 22.1).
 */
export async function loadCollectionsSettings(organizationId: string, db: Db = prisma): Promise<CollectionsSettings> {
  const base = await loadBaseSettings(organizationId, db);
  const active = await db.collectionsPlaybook.findFirst({ where: { organizationId, isActive: true }, orderBy: { version: "desc" }, select: { rules: true } });
  return active ? applyPlaybook(base, parsePlaybookRules(active.rules, standardPlaybook(base))) : base;
}
