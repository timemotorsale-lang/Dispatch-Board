import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import { afterImportCommitted } from "@/features/collections/server/after-import";
import { runCollectionsAutomations, runScheduledCollections } from "@/features/collections/server/automations";
import { runAccountAction } from "@/features/collections/server/action-router";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { syncImportReminder } from "@/features/collections/server/task-sync";
import { addDays, chicagoDateTime, chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, csvWith, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections automations and board tasks (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  const today = chicagoToday();
  const accountId = async (external: string) => (await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: external } })).id;
  const openLinks = async (external: string) => prisma.collectionTaskLink.findMany({ where: { organizationId: ctx.organizationId, status: "OPEN", account: { externalAccountId: external } }, include: { task: true } });
  const run = () => runCollectionsAutomations(ctx.organizationId, { trigger: "IMPORT", actorId: ctx.owner.id });

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    const result = await commitCollectionsImport(ctx.owner, preview.runId);
    const automation = await afterImportCommitted(ctx.owner, result);
    expect(automation.ran).toBe(true);
  });

  it("creates one board task per account per reason, on the Collections area", async () => {
    const links = await prisma.collectionTaskLink.findMany({ where: { organizationId: ctx.organizationId, status: "OPEN", accountId: { not: null } }, include: { task: true } });
    expect(links.length).toBeGreaterThanOrEqual(14);
    for (const link of links) {
      expect(link.task.workflowArea).toBe("COLLECTIONS");
      expect(link.task.sourceType).toBe("COLLECTIONS");
      expect(link.task.assignedUserId).toBe(ctx.owner.id);
      expect(link.task.title).not.toMatch(/\$/); // no money amounts on the shared board
    }
    const keys = links.map(l => `${l.accountId}:${l.reason}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect((await openLinks("FAKE-1013")).map(l => l.reason)).toEqual(["DISABLE_REVIEW"]);
    expect((await openLinks("FAKE-1015")).map(l => l.reason)).toEqual(["TWO_WEEK_FOLLOW_UP"]);
    expect((await openLinks("FAKE-1019")).map(l => l.reason)).toEqual(["THIRTY_DAY_REVIEW"]);
    const repo = await openLinks("FAKE-1023");
    expect(repo.map(l => l.reason)).toEqual(["REPO_REVIEW"]);
    expect(repo[0].task.priority).toBe("CRITICAL");
    expect(await openLinks("FAKE-1024")).toEqual([]); // repossessed in DealerCenter
    expect(await openLinks("FAKE-1001")).toEqual([]); // current
  });

  it("is idempotent: running again creates nothing", async () => {
    const before = await prisma.task.count({ where: { collectionTaskLink: { organizationId: ctx.organizationId } } });
    const again = await run();
    expect(again.tasks.createdTotal).toBe(0);
    expect(await prisma.task.count({ where: { collectionTaskLink: { organizationId: ctx.organizationId } } })).toBe(before);
  });

  it("writes the daily metric and posts a summary to the activity feed", async () => {
    const metric = await prisma.collectionsDailyMetric.findFirstOrThrow({ where: { organizationId: ctx.organizationId } });
    expect(metric.totalAccounts).toBe(30);
    expect(metric.pastDueAccounts).toBeGreaterThan(0);
    const summary = await prisma.activityEvent.findFirstOrThrow({ where: { eventType: "COLLECTIONS_SUMMARY", metadata: { path: ["organizationId"], equals: ctx.organizationId } } });
    expect(summary.message).toMatch(/^Collections: /);
  });

  it("respects a task a person completed: it isn't created again", async () => {
    const [link] = await openLinks("FAKE-1014");
    await prisma.task.update({ where: { id: link.taskId }, data: { status: "COMPLETED", completedAt: new Date() } });
    const result = await run();
    expect(result.tasks.completedByStaff).toBe(1);
    expect(result.tasks.createdTotal).toBe(0);
    expect(await openLinks("FAKE-1014")).toEqual([]);
  });

  it("closes a task with a note when a later import shows the account caught up", async () => {
    const [link] = await openLinks("FAKE-1013");
    const [y, m, d] = addDays(today, 1).split("-");
    const bytes = csvWith(rows => rows.map(row => (row[0] === "FAKE-1013" ? row.map((cell, i) => (i === 23 ? "0" : i === 25 ? "$0.00" : cell)) : row)));
    const preview = await previewCollectionsImport(ctx.owner, { fileName: `Active Accounts ${Number(m)}-${Number(d)}-${y}.csv`, bytes });
    await afterImportCommitted(ctx.owner, await commitCollectionsImport(ctx.owner, preview.runId));
    const closed = await prisma.collectionTaskLink.findUniqueOrThrow({ where: { id: link.id }, include: { task: true } });
    expect(closed.status).toBe("CLOSED");
    expect(closed.openKey).toBeNull();
    expect(closed.closeNote).toMatch(/below the disable-review threshold/);
    expect(closed.task.status).toBe("COMPLETED");
    expect(await prisma.activityEvent.count({ where: { taskId: link.taskId, message: { startsWith: "Collections closed this task automatically" } } })).toBe(1);
  });

  it("a bankruptcy flag closes collection tasks and adds only the attorney review", async () => {
    const id = await accountId("FAKE-1020");
    expect((await openLinks("FAKE-1020")).length).toBeGreaterThan(0);
    await runAccountAction(ctx.owner, id, { action: "SET_FLAG", type: "BANKRUPTCY", reason: "Customer reported a Chapter 7 filing" });
    expect((await openLinks("FAKE-1020")).map(l => l.reason)).toEqual(["BANKRUPTCY_ATTORNEY_REVIEW"]);
  });

  it("a new promise closes the broken-promise task", async () => {
    const id = await accountId("FAKE-1017");
    await runAccountAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "100", promisedDate: today });
    await runCollectionsAutomations(ctx.organizationId, { trigger: "IMPORT", actorId: ctx.owner.id, now: chicagoDateTime(addDays(today, 3), "10:00") });
    expect((await openLinks("FAKE-1017")).map(l => l.reason).sort()).toEqual(["BROKEN_PROMISE", "TWO_WEEK_FOLLOW_UP"]);
    await runAccountAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "100", promisedDate: addDays(today, 5) });
    expect((await openLinks("FAKE-1017")).map(l => l.reason)).toEqual(["TWO_WEEK_FOLLOW_UP"]);
  });

  it("creates the import reminder once, and closes it when a file is imported", async () => {
    const other = await createCollectionsTestOrg();
    const role = await prisma.role.upsert({ where: { name: "General Manager" }, update: {}, create: { name: "General Manager" } });
    await prisma.userRole.create({ data: { userId: other.owner.id, roleId: role.id } });
    const reminder = () => prisma.$transaction(tx => syncImportReminder(tx, other.organizationId, { due: true }));
    expect((await reminder()).created).toBe(true);
    expect((await reminder()).created).toBe(false);
    const link = await prisma.collectionTaskLink.findFirstOrThrow({ where: { organizationId: other.organizationId, reason: "IMPORT_REMINDER" }, include: { task: true } });
    expect(link.task.assignedUserId).toBe(other.owner.id);
    const preview = await previewCollectionsImport(other.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    await afterImportCommitted(other.owner, await commitCollectionsImport(other.owner, preview.runId));
    expect((await prisma.collectionTaskLink.findUniqueOrThrow({ where: { id: link.id } })).status).toBe("CLOSED");
  });

  it("the scheduled job does nothing while the module is OFF", async () => {
    const saved = process.env.COLLECTIONS_MODULE;
    process.env.COLLECTIONS_MODULE = "OFF";
    try {
      expect(await runScheduledCollections()).toEqual({ mode: "OFF", ran: [] });
    } finally {
      process.env.COLLECTIONS_MODULE = saved;
    }
  });
});
