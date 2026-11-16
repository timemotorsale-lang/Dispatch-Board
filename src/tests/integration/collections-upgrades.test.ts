import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { afterImportCommitted } from "@/features/collections/server/after-import";
import { runAccountAction } from "@/features/collections/server/action-router";
import { runCollectionsAutomations } from "@/features/collections/server/automations";
import { getKpis } from "@/features/collections/server/dashboard-service";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { handleInboundSms } from "@/features/collections/server/messaging-service";
import { getPlaybookPage, playbookAction } from "@/features/collections/server/playbook-service";
import { getAccountUpgrades } from "@/features/collections/server/upgrades-service";
import { addDays, chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, csvWith, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections Stage 12 upgrades (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  const today = chicagoToday();
  const ids: Record<string, string> = {};
  const act = (external: string, values: Record<string, unknown>, who?: AuthenticatedUser) => runAccountAction(who ?? ctx.owner, ids[external], values) as Promise<{ message: string }>;
  const collector = () => ({ ...ctx.owner, roles: ["Collections"] } as AuthenticatedUser);
  const asCollector = async <T,>(fn: () => Promise<T>) => { process.env.COLLECTIONS_MODULE = "LIVE"; try { return await fn(); } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; } };
  const openReasons = async (external: string) => (await prisma.collectionTaskLink.findMany({ where: { accountId: ids[external], status: "OPEN" } })).map(l => l.reason).sort();
  const run = () => runCollectionsAutomations(ctx.organizationId, { trigger: "IMPORT", actorId: ctx.owner.id });

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    await afterImportCommitted(ctx.owner, await commitCollectionsImport(ctx.owner, preview.runId));
    for (const a of await prisma.collectionAccount.findMany({ where: { organizationId: ctx.organizationId } })) ids[a.externalAccountId] = a.id;
  });

  it("seeds the Standard playbook; a new version moves the review days and closes tasks that no longer apply", async () => {
    const page = await getPlaybookPage(ctx.owner);
    expect(page).toMatchObject({ activeVersion: 1, name: "Standard" });
    expect(await openReasons("FAKE-1013")).toEqual(["DISABLE_REVIEW"]); // 7 days past due
    const rules = structuredClone(page.rules);
    rules.tasks.DISABLE_REVIEW.atDays = 10;
    await expect(playbookAction(ctx.owner, { action: "SAVE_PLAYBOOK", rules, name: "Gentler", reason: "x", expectedVersion: 1 })).rejects.toThrow(/what changed/);
    await playbookAction(ctx.owner, { action: "SAVE_PLAYBOOK", rules, name: "Gentler", reason: "Disable review at 10 days", expectedVersion: 1 });
    await expect(playbookAction(ctx.owner, { action: "SAVE_PLAYBOOK", rules, reason: "Stale edit", expectedVersion: 1 })).rejects.toThrow(/Someone else/);
    await run();
    expect(await openReasons("FAKE-1013")).toEqual([]);
    await playbookAction(ctx.owner, { action: "RESTORE_PLAYBOOK", version: 1, reason: "Back to standard", expectedVersion: 2 });
    expect((await getPlaybookPage(ctx.owner)).versions.map(v => v.version)).toEqual([3, 2, 1]);
  });

  it("scores every account once a day, with factors and a next action", async () => {
    await run(); await run();
    const id = ids["FAKE-1023"]; // 75 days past due
    expect(await prisma.collectionRiskScore.count({ where: { accountId: id } })).toBe(1);
    const account = await prisma.collectionAccount.findUniqueOrThrow({ where: { id } });
    expect(account.riskScore).toBeGreaterThan(20);
    const u = await getAccountUpgrades(ctx.owner, id);
    expect(u.insight?.factors.length).toBeGreaterThan(0);
    expect(u.insight?.next.action).toBeTruthy();
  });

  it("extensions: ineligible requests need an override reason; approval adds a DealerCenter task that the sync leaves alone", async () => {
    await act("FAKE-1014", { action: "RECORD_PROMISE", amount: "50", promisedDate: addDays(today, 3) });
    await asCollector(() => act("FAKE-1014", { action: "REQUEST_EXTENSION", type: "EXTENSION", requestedTerms: "Move one payment to the end", reason: "Hospital stay" }, collector()));
    const request = await prisma.extensionRequest.findFirstOrThrow({ where: { accountId: ids["FAKE-1014"] } });
    expect(request.eligible).toBe(false); // open promise
    await asCollector(async () => { await expect(act("FAKE-1014", { action: "DECIDE_EXTENSION", requestId: request.id, decision: "APPROVE", reason: "Approved" }, collector())).rejects.toThrow(); });
    await expect(act("FAKE-1014", { action: "DECIDE_EXTENSION", requestId: request.id, decision: "APPROVE", reason: "Approved" })).rejects.toThrow(/anyway/);
    await act("FAKE-1014", { action: "DECIDE_EXTENSION", requestId: request.id, decision: "APPROVE", reason: "Good payer", overrideReason: "Promise is for a partial amount only" });
    expect(await openReasons("FAKE-1014")).toContain("POST_IN_DMS");
    await run();
    expect(await openReasons("FAKE-1014")).toContain("POST_IN_DMS");
    await act("FAKE-1014", { action: "MARK_EXTENSION_APPLIED", requestId: request.id });
    expect(await openReasons("FAKE-1014")).not.toContain("POST_IN_DMS");
  });

  it("raises a possible-skip alert that a person confirms (setting the Skip flag) or dismisses", async () => {
    // FAKE-1016 (16 days, never reached) was already flagged by the first import.
    expect((await prisma.collectionSkipAlert.findFirstOrThrow({ where: { accountId: ids["FAKE-1016"], status: "OPEN" } })).reasons).toEqual([expect.stringMatching(/No conversation with the customer in \d+ days/)]);
    // FAKE-1013 (7 days) gets one only once the phone turns out to be disconnected.
    expect(await prisma.collectionSkipAlert.count({ where: { accountId: ids["FAKE-1013"] } })).toBe(0);
    await act("FAKE-1013", { action: "LOG_CONTACT", channel: "CALL_OUT", outcome: "DISCONNECTED", notes: "Number disconnected" });
    await run(); await run();
    const alerts = await prisma.collectionSkipAlert.findMany({ where: { accountId: ids["FAKE-1013"] } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].reasons).toContain("Phone disconnected");
    await act("FAKE-1013", { action: "DISMISS_SKIP", note: "Customer called in from a new number" });
    await act("FAKE-1016", { action: "LOG_SKIP_TRACE", step: "REFERENCES_CALLED", result: "NOTHING", notes: "No answer from references" });
    await act("FAKE-1016", { action: "CONFIRM_SKIP", note: "Moved out, no new number" });
    expect(await prisma.collectionFlag.count({ where: { accountId: ids["FAKE-1016"], type: "SKIP", clearedAt: null } })).toBe(1);
    await run();
    expect(await prisma.collectionSkipAlert.count({ where: { accountId: ids["FAKE-1013"], status: "OPEN" } })).toBe(0); // dismissed stays dismissed
  });

  it("charge-off needs the owner, an override before the day threshold, and tracks recovery", async () => {
    await expect(act("FAKE-1022", { action: "REQUEST_CHARGE_OFF", reason: "No contact for months" })).rejects.toThrow(/charge-off point/);
    await act("FAKE-1022", { action: "REQUEST_CHARGE_OFF", reason: "No contact for months", overrideReason: "Vehicle totaled, no insurance" });
    const co = await prisma.collectionChargeOff.findFirstOrThrow({ where: { accountId: ids["FAKE-1022"] } });
    await act("FAKE-1022", { action: "DECIDE_CHARGE_OFF", chargeOffId: co.id, decision: "APPROVE", reason: "Approved by owner" });
    await act("FAKE-1022", { action: "RECORD_RECOVERY_PAYMENT", chargeOffId: co.id, amount: "100", method: "CASH" });
    expect((await prisma.collectionChargeOff.findUniqueOrThrow({ where: { id: co.id } })).recoveredCents).toBe(10000);
    const kpis = await getKpis(ctx.owner);
    expect(kpis.recoveryPercent).toBeGreaterThan(0);
  });

  it("fees need approval, then are confirmed by a later import (or flagged if never seen)", async () => {
    await asCollector(() => act("FAKE-1019", { action: "ADD_ADJUSTMENT", type: "REPO_FEE", amount: "350", reason: "TLC recovery fee" }, collector()));
    await act("FAKE-1020", { action: "ADD_ADJUSTMENT", type: "GOODWILL_CREDIT", amount: "25", reason: "Billing mix-up" });
    const fee = await prisma.accountAdjustment.findFirstOrThrow({ where: { accountId: ids["FAKE-1019"] } });
    const credit = await prisma.accountAdjustment.findFirstOrThrow({ where: { accountId: ids["FAKE-1020"] } });
    expect(fee.status).toBe("PENDING_APPROVAL");
    for (const [ext, adj] of [["FAKE-1019", fee], ["FAKE-1020", credit]] as const) {
      await act(ext, { action: "DECIDE_ADJUSTMENT", adjustmentId: adj.id, decision: "APPROVE", reason: "Approved" });
      await act(ext, { action: "MARK_ADJUSTMENT_POSTED", adjustmentId: adj.id });
    }
    // Next import: FAKE-1019's "other" balance goes up by $350 (column 16); FAKE-1020 unchanged.
    const [y, m, d] = addDays(today, 1).split("-");
    const bytes = csvWith(rows => rows.map(row => (row[0] === "FAKE-1019" ? row.map((cell, i) => (i === 16 ? "$350.00" : cell)) : row)));
    const preview = await previewCollectionsImport(ctx.owner, { fileName: `Active Accounts ${Number(m)}-${Number(d)}-${y}.csv`, bytes });
    await afterImportCommitted(ctx.owner, await commitCollectionsImport(ctx.owner, preview.runId));
    expect((await prisma.accountAdjustment.findUniqueOrThrow({ where: { id: fee.id } })).status).toBe("CONFIRMED_BY_IMPORT");
    expect((await prisma.accountAdjustment.findUniqueOrThrow({ where: { id: credit.id } })).status).toBe("POSTED_IN_DMS");
    await runCollectionsAutomations(ctx.organizationId, { trigger: "IMPORT", actorId: ctx.owner.id, now: new Date(Date.now() + 4 * 86_400_000) });
    expect((await prisma.accountAdjustment.findUniqueOrThrow({ where: { id: credit.id } })).status).toBe("NOT_FOUND_IN_IMPORT");
  });

  it("YES confirms an upcoming promise; PAID creates a reported payment once", async () => {
    const phone = `612${String(Math.floor(1_000_000 + Math.random() * 8_999_999))}`;
    await prisma.collectionAccount.update({ where: { id: ids["FAKE-1017"] }, data: { primaryPhone: phone } });
    await act("FAKE-1017", { action: "RECORD_PROMISE", amount: "120", promisedDate: addDays(today, 1) });
    await handleInboundSms({ From: `+1${phone}`, Body: "Yes", MessageSid: `SM-yes-${ctx.suffix}` });
    expect((await prisma.paymentPromise.findFirstOrThrow({ where: { accountId: ids["FAKE-1017"], status: "OPEN" } })).customerConfirmedAt).not.toBeNull();
    await handleInboundSms({ From: `+1${phone}`, Body: "PAID", MessageSid: `SM-paid-${ctx.suffix}` });
    await handleInboundSms({ From: `+1${phone}`, Body: "paid", MessageSid: `SM-paid2-${ctx.suffix}` });
    expect(await prisma.customerReportedPayment.count({ where: { accountId: ids["FAKE-1017"], status: "PENDING_CONFIRMATION" } })).toBe(1);
  });
});
