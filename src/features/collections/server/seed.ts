/**
 * Idempotent Collections seed: default settings and starter message templates.
 * Running it twice creates nothing twice and never overwrites your edits:
 * - settings are created only if the organization has none yet;
 * - a template is created only if no version exists for that key/channel/language.
 */
import type { Prisma, PrismaClient } from "@prisma/client";

import { buildSeedTemplates } from "../domain/default-templates";
import { standardPlaybook } from "../domain/playbook";
import { DEFAULT_COLLECTIONS_SETTINGS, parseCollectionsSettings } from "../domain/settings";

type Db = PrismaClient | Prisma.TransactionClient;

export async function seedCollectionsForOrganization(db: Db, organizationId: string) {
  let settingsCreated = 0;
  let templatesCreated = 0;
  const existing = await db.collectionsSetting.findUnique({ where: { organizationId }, select: { id: true } });
  if (!existing) {
    const values = DEFAULT_COLLECTIONS_SETTINGS as unknown as Prisma.InputJsonValue;
    await db.collectionsSetting.create({ data: { organizationId, version: 1, values } });
    await db.collectionsSettingHistory.create({ data: { organizationId, version: 1, values, reason: "Default settings created by collections:seed" } });
    settingsCreated = 1;
  }
  for (const template of buildSeedTemplates()) {
    const found = await db.messageTemplate.findFirst({
      where: { organizationId, key: template.key, channel: template.channel, language: template.language },
      select: { id: true }
    });
    if (found) continue;
    await db.messageTemplate.create({
      data: {
        organizationId,
        key: template.key,
        channel: template.channel,
        language: template.language,
        version: 1,
        subject: template.subject ?? null,
        body: template.body,
        status: template.status,
        reviewNote: template.reviewNote ?? null,
        approvedAt: template.status === "APPROVED" ? new Date() : null
      }
    });
    templatesCreated += 1;
  }
  // The "Standard" playbook is today's rules (spec 22.1); created once, never overwritten.
  let playbookCreated = 0;
  if (!(await db.collectionsPlaybook.findFirst({ where: { organizationId }, select: { id: true } }))) {
    const current = await db.collectionsSetting.findUnique({ where: { organizationId }, select: { values: true } });
    await db.collectionsPlaybook.create({ data: { organizationId, version: 1, name: "Standard", rules: standardPlaybook(parseCollectionsSettings(current?.values)) as unknown as Prisma.InputJsonValue, isActive: true, activatedAt: new Date(), reason: "Standard playbook created from the default rules" } });
    playbookCreated = 1;
  }
  return { organizationId, settingsCreated, templatesCreated, playbookCreated };
}
