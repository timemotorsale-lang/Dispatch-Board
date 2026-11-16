import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getDashboard } from "@/features/collections/server/dashboard-service";
import { getQueue } from "@/features/collections/server/account-service";
import { afterImportCommitted } from "@/features/collections/server/after-import";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { loadTemplate } from "@/features/collections/server/messaging-service";
import { getSettingsPage, saveSettings, templateAction } from "@/features/collections/server/settings-service";
import { chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections dashboard and settings (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: chicagoToday() });
    await afterImportCommitted(ctx.owner, await commitCollectionsImport(ctx.owner, preview.runId));
  });

  it("shows tiles, buckets, promises, trends and activity", async () => {
    const data = await getDashboard(ctx.owner);
    expect(data.tiles.totalAccounts).toBeGreaterThan(20);
    expect(data.tiles.pastDueAccounts).toBeGreaterThan(0);
    expect(data.tiles.lastImportAt).toBeTruthy();
    expect(data.buckets.reduce((s, b) => s + b.count, 0)).toBe(data.tiles.totalAccounts);
    expect(data.trends.length).toBe(1);
    expect(data.promises.map(p => p.days)).toEqual([30, 90]);
    // The dashboard tile and the queue tab count insurance problems the same way.
    expect(data.tiles.insuranceProblems).toBe((await getQueue(ctx.owner, { tab: "INSURANCE" })).totalRows);
  });

  it("saves settings with history, refuses stale edits, and recalculates buckets", async () => {
    const page = await getSettingsPage(ctx.owner);
    const values = structuredClone(page.settings);
    values.dealership.phone = "612-555-0100";
    values.graceDays = 2;
    const saved = await saveSettings(ctx.owner, { values, version: page.version, reason: "Test change" });
    expect(saved.version).toBe(page.version + 1);
    await expect(saveSettings(ctx.owner, { values, version: page.version })).rejects.toThrow(/Someone else/);
    const history = await prisma.collectionsSettingHistory.findFirstOrThrow({ where: { organizationId: ctx.organizationId, version: saved.version } });
    expect(history.reason).toBe("Test change");
    // FAKE-1012 is 3 days past due: grace is now 2 days, so it moves out of the grace bucket.
    const account = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1012" } });
    expect(account.bucket).toBe("LATE_6_14");
    const bad = structuredClone(values); bad.thresholds.repoReview = 3;
    await expect(saveSettings(ctx.owner, { values: bad, version: saved.version })).rejects.toThrow(/must go up/);
  });

  it("is admin only", async () => {
    const collector: AuthenticatedUser = { ...ctx.owner, roles: ["Collections"] };
    process.env.COLLECTIONS_MODULE = "LIVE";
    try {
      await expect(getSettingsPage(collector)).rejects.toThrow();
    } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; }
  });

  it("template edits are drafts until approved; the approved version keeps being used meanwhile", async () => {
    const before = await prisma.$transaction(tx => loadTemplate(tx, ctx.organizationId, "PAST_DUE_DAY1", "SMS", "EN"));
    await templateAction(ctx.owner, { action: "SAVE_TEMPLATE", key: "PAST_DUE_DAY1", channel: "SMS", language: "EN", body: "Hi {firstName}, your payment is past due. Call {dealershipPhone}. Reply STOP to opt out." });
    const during = await prisma.$transaction(tx => loadTemplate(tx, ctx.organizationId, "PAST_DUE_DAY1", "SMS", "EN"));
    expect(during.template?.id).toBe(before.template?.id);
    const draft = await prisma.messageTemplate.findFirstOrThrow({ where: { organizationId: ctx.organizationId, key: "PAST_DUE_DAY1", channel: "SMS", language: "EN" }, orderBy: { version: "desc" } });
    expect(draft.status).toBe("DRAFT");
    await templateAction(ctx.owner, { action: "APPROVE_TEMPLATE", templateId: draft.id });
    const after = await prisma.$transaction(tx => loadTemplate(tx, ctx.organizationId, "PAST_DUE_DAY1", "SMS", "EN"));
    expect(after.template?.body).toMatch(/your payment is past due/);
  });

  it("translations need a fluent speaker's review before approval", async () => {
    const spanish = await prisma.messageTemplate.findFirstOrThrow({ where: { organizationId: ctx.organizationId, key: "DUE_SOON", channel: "SMS", language: "ES" }, orderBy: { version: "desc" } });
    await expect(templateAction(ctx.owner, { action: "APPROVE_TEMPLATE", templateId: spanish.id })).rejects.toThrow(/fluent/);
    await templateAction(ctx.owner, { action: "APPROVE_TEMPLATE", templateId: spanish.id, fluentReviewed: true });
    const used = await prisma.$transaction(tx => loadTemplate(tx, ctx.organizationId, "DUE_SOON", "SMS", "ES"));
    expect(used).toMatchObject({ fallback: false });
    expect(used.template?.status).toBe("APPROVED");
  });
});
