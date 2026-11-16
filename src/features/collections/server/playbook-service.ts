/**
 * Playbook screen (spec 22.1). Admin only. Saving creates a new version and makes it the
 * active one; older versions are kept and can be restored (restoring also creates a new
 * version, so history is never rewritten).
 */
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { CollectionsError } from "../config/permissions";
import { parsePlaybookRules, playbookByStage, standardPlaybook, validatePlaybook, type PlaybookRules } from "../domain/playbook";
import { collectionsAccess, recordAccountEvent } from "./access";
import { text } from "./account-service";
import { recalculateAccounts } from "./account-state";
import { seedCollectionsForOrganization } from "./seed";
import { loadBaseSettings, loadCollectionsSettings } from "./settings-store";

export async function getPlaybookPage(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "EDIT_SETTINGS");
  await seedCollectionsForOrganization(prisma, access.organizationId);
  const base = await loadBaseSettings(access.organizationId);
  const versions = await prisma.collectionsPlaybook.findMany({ where: { organizationId: access.organizationId }, orderBy: { version: "desc" }, take: 30 });
  const active = versions.find(v => v.isActive) ?? versions[0];
  const rules = parsePlaybookRules(active?.rules, standardPlaybook(base));
  const names = new Map((await prisma.user.findMany({ where: { id: { in: versions.map(v => v.createdByUserId).filter((x): x is string => Boolean(x)) } }, select: { id: true, name: true } })).map(u => [u.id, u.name]));
  return {
    activeVersion: active?.version ?? 0,
    name: active?.name ?? "Standard",
    rules,
    stages: playbookByStage(rules, base.graceDays),
    versions: versions.map(v => ({ version: v.version, name: v.name, isActive: v.isActive, reason: v.reason, createdAt: v.createdAt.toISOString(), createdBy: v.createdByUserId ? names.get(v.createdByUserId) ?? "Former staff" : "System" }))
  };
}

async function activate(access: Awaited<ReturnType<typeof collectionsAccess>>, rules: PlaybookRules, name: string, reason: string, expectedVersion: number) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collections-playbook:${access.organizationId}`}))`;
    const latest = await tx.collectionsPlaybook.findFirst({ where: { organizationId: access.organizationId }, orderBy: { version: "desc" } });
    const active = await tx.collectionsPlaybook.findFirst({ where: { organizationId: access.organizationId, isActive: true } });
    if ((active?.version ?? 0) !== expectedVersion) throw new CollectionsError("Someone else changed the playbook since you opened it. Reload, then try again.", 409);
    const version = (latest?.version ?? 0) + 1;
    await tx.collectionsPlaybook.updateMany({ where: { organizationId: access.organizationId, isActive: true }, data: { isActive: false } });
    await tx.collectionsPlaybook.create({ data: { organizationId: access.organizationId, version, name, rules: rules as unknown as Prisma.InputJsonValue, isActive: true, activatedAt: new Date(), reason, createdByUserId: access.actor.id } });
    await recordAccountEvent(tx, { organizationId: access.organizationId, type: "PLAYBOOK_ACTIVATED", userId: access.actor.id, before: { version: active?.version ?? null, rules: active?.rules ?? null }, after: { version, rules }, reason });
    // New review days can change statuses; tasks follow on the next automation run.
    await recalculateAccounts(tx, access.organizationId, await loadCollectionsSettings(access.organizationId, tx));
    return { ok: true as const, message: `Playbook version ${version} is now active.`, version };
  }, { timeout: 60_000 });
}

export async function playbookAction(actor: AuthenticatedUser | null, input: Record<string, unknown>) {
  const access = await collectionsAccess(actor, "EDIT_SETTINGS");
  const base = await loadBaseSettings(access.organizationId);
  const reason = text(input.reason, 500);
  if (reason.length < 3) throw new CollectionsError("Say briefly what changed and why (it's saved in the history).");
  const expected = Number(input.expectedVersion);
  if (input.action === "SAVE_PLAYBOOK") {
    const rules = parsePlaybookRules(input.rules, standardPlaybook(base));
    const errors = validatePlaybook(rules);
    if (errors.length) throw new CollectionsError(errors.join(" "));
    return activate(access, rules, text(input.name, 80) || "Custom", reason, expected);
  }
  if (input.action === "RESTORE_PLAYBOOK") {
    const old = await prisma.collectionsPlaybook.findFirst({ where: { organizationId: access.organizationId, version: Number(input.version) } });
    if (!old) throw new CollectionsError("That version isn't available.", 404);
    return activate(access, parsePlaybookRules(old.rules, standardPlaybook(base)), old.name, `Restored version ${old.version}: ${reason}`, expected);
  }
  throw new CollectionsError("Unknown playbook action.");
}
