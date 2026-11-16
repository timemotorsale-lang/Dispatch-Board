import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import { accountAction, bulkAccountAction, getAccountDetail, getQueue, listAccounts } from "@/features/collections/server/account-service";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections accounts and queue (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  let collector: typeof ctx.owner;
  const id = async (external: string) => (await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: external } })).id;

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    collector = { ...ctx.owner, id: `${ctx.owner.id}-collector`, name: "Test Collector", email: `${ctx.owner.id}-c@example.test`, roles: ["Collections"] };
    await prisma.user.create({ data: { id: collector.id, name: collector.name, email: collector.email, passwordHash: "isolated-test-only" } });
    await prisma.userLocationAccess.create({ data: { userId: collector.id, locationId: ctx.locationId, validFrom: new Date("2020-01-01") } });
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "Active Accounts 11-15-2026.csv", bytes: fixtureBytes("active-accounts.sample.csv") });
    await commitCollectionsImport(ctx.owner, preview.runId);
    // LIVE so the collector role is visible; REVIEW mode would (correctly) hide it from non-admins.
    process.env.COLLECTIONS_MODULE = "LIVE";
  });

  it("builds the queue in the right order with tab counts", async () => {
    const queue = await getQueue(ctx.owner, { tab: "PAST_DUE" });
    expect(queue.rows.length).toBeGreaterThan(10);
    const dpd = queue.rows.map(r => r.daysPastDue);
    expect([...dpd].sort((a, b) => b - a)).toEqual(dpd);
    expect(queue.counts.REPO).toBeGreaterThan(0);
    expect(queue.counts.NEEDS_REVIEW).toBe(30);
  });

  it("logs a contact and updates last contact", async () => {
    const accountId = await id("FAKE-1013");
    await accountAction(ctx.owner, accountId, { action: "LOG_CONTACT", channel: "CALL_OUT", outcome: "LEFT_MESSAGE", notes: "Left voicemail" });
    const detail = await getAccountDetail(ctx.owner, accountId);
    expect(detail.account.lastContactAt).not.toBeNull();
    expect(detail.timeline.some(t => t.kind === "contact")).toBe(true);
  });

  it("bankruptcy freezes the account and needs a document to clear", async () => {
    const accountId = await id("FAKE-1020");
    await accountAction(collector, accountId, { action: "SET_FLAG", type: "BANKRUPTCY", reason: "Customer called and said they filed" });
    expect((await prisma.collectionAccount.findUniqueOrThrow({ where: { id: accountId } })).status).toBe("BANKRUPTCY_FROZEN");
    const queue = await getQueue(ctx.owner, { tab: "PAST_DUE" });
    expect(queue.rows.some(r => r.id === accountId)).toBe(false);
    expect((await getQueue(ctx.owner, { tab: "FLAGGED" })).rows.some(r => r.id === accountId)).toBe(true);
    const flag = await prisma.collectionFlag.findFirstOrThrow({ where: { accountId, type: "BANKRUPTCY", clearedAt: null } });
    await expect(accountAction(collector, accountId, { action: "CLEAR_FLAG", flagId: flag.id, reason: "Attorney says it is dismissed" })).rejects.toThrow(/permission/);
    await expect(accountAction(ctx.owner, accountId, { action: "CLEAR_FLAG", flagId: flag.id, reason: "Attorney says it is dismissed" })).rejects.toThrow(/document/);
  });

  it("changes type with a reason and requires admin", async () => {
    const accountId = await id("FAKE-1003");
    await expect(accountAction(collector, accountId, { action: "CHANGE_TYPE", accountType: "BHPH", reason: "Real BHPH deal" })).rejects.toThrow(/permission/);
    await accountAction(ctx.owner, accountId, { action: "CHANGE_TYPE", accountType: "BHPH", reason: "Real BHPH deal" });
    expect((await prisma.collectionAccount.findUniqueOrThrow({ where: { id: accountId } })).accountType).toBe("BHPH");
    expect(await prisma.collectionAccountEvent.count({ where: { accountId, type: "TYPE_CHANGE" } })).toBe(1);
  });

  it("bulk-changes the type", async () => {
    const ids = [await id("FAKE-1004"), await id("FAKE-1005")];
    const result = await bulkAccountAction(ctx.owner, { action: "CHANGE_TYPE", accountIds: ids, accountType: "BHPH", reason: "Batch fix" });
    expect(result.changed).toBe(2);
    const list = await listAccounts(ctx.owner, { type: "BHPH" });
    expect(list.total).toBeGreaterThanOrEqual(3);
  });

  it("edits contact details and validates the phone", async () => {
    const accountId = await id("FAKE-1006");
    await expect(accountAction(ctx.owner, accountId, { action: "EDIT_CONTACT", primaryPhone: "123" })).rejects.toThrow(/10-digit/);
    await accountAction(ctx.owner, accountId, { action: "EDIT_CONTACT", primaryPhone: "(612) 555-0123", preferredLanguage: "ES", gpsDisclosedInContract: "YES" });
    const account = await prisma.collectionAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(account.primaryPhone).toBe("+16125550123");
    expect(account.preferredLanguage).toBe("ES");
    expect(account.gpsDisclosedInContract).toBe(true);
    const found = await getQueue(ctx.owner, { tab: "NEEDS_REVIEW", q: "555-0123" });
    expect(found.rows.map(r => r.id)).toEqual([accountId]);
  });

  it("hides accounts from other companies", async () => {
    const other = await createCollectionsTestOrg();
    process.env.COLLECTIONS_MODULE = "LIVE";
    await expect(getAccountDetail(other.owner, await id("FAKE-1001"))).rejects.toThrow(/isn't available/);
  });

  it("collectors see only their accounts when the setting says so", async () => {
    await prisma.collectionsSetting.upsert({ where: { organizationId: ctx.organizationId }, update: { values: { collectorVisibility: "ASSIGNED_ONLY" } }, create: { organizationId: ctx.organizationId, values: { collectorVisibility: "ASSIGNED_ONLY" } } });
    const list = await listAccounts(collector, {});
    expect(list.total).toBe(0);
    await bulkAccountAction(ctx.owner, { action: "ASSIGN_COLLECTOR", accountIds: [await id("FAKE-1007")], userId: collector.id });
    expect((await listAccounts(collector, {})).total).toBe(1);
  });
});
