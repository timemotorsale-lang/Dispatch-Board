import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/server/db/client";
import { POST as inboundRoute } from "@/app/api/collections/sms/inbound/route";
import { runAccountAction } from "@/features/collections/server/action-router";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { dispatchQueuedMessages, getInbox, handleInboundSms, queueAutomaticMessages } from "@/features/collections/server/messaging-service";
import { twilioSignatureFor } from "@/features/collections/server/providers";
import { seedCollectionsForOrganization } from "@/features/collections/server/seed";
import { loadCollectionsSettings } from "@/features/collections/server/settings-store";
import { chicagoToday } from "@/features/collections/domain/money-dates";
import { DEFAULT_COLLECTIONS_SETTINGS } from "@/features/collections/domain/settings";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections messaging (database, no real sending)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  const saved = { ...process.env };
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  // A random fake 612 number so other test runs' accounts never match.
  const phone = `612${String(Math.floor(1_000_000 + Math.random() * 8_999_999))}`;
  const e164 = `+1${phone}`;
  let accountId = "";
  const send = (values: Record<string, unknown>) => runAccountAction(ctx.owner, accountId, { action: "SEND_MESSAGE", channel: "SMS", ...values }) as Promise<{ status: string; message: string }>;
  const latestOut = () => prisma.outboundMessage.findFirstOrThrow({ where: { accountId }, orderBy: { createdAt: "desc" } });

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    await seedCollectionsForOrganization(prisma, ctx.organizationId);
    const values = { ...DEFAULT_COLLECTIONS_SETTINGS, dealership: { ...DEFAULT_COLLECTIONS_SETTINGS.dealership, phone: "612-555-0100", payOnlineUrl: "https://pay.example.test", zelleRecipient: "pay@example.test", address: "1 Test Ave" } };
    await prisma.collectionsSetting.update({ where: { organizationId: ctx.organizationId }, data: { values } });
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: chicagoToday() });
    await commitCollectionsImport(ctx.owner, preview.runId);
    const account = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1012" } });
    accountId = account.id;
    await prisma.collectionAccount.update({ where: { id: accountId }, data: { primaryPhone: phone, primaryEmail: "customer@example.test", daysPastDue: 1 } });
    process.env.COLLECTIONS_SMS_SENDING = "LIVE"; // REVIEW mode must still force DRY_RUN
    process.env.COLLECTIONS_EMAIL_SENDING = "DRY_RUN";
    process.env.TWILIO_AUTH_TOKEN = "test-only-token";
    process.env.COLLECTIONS_PUBLIC_WEBHOOK_BASE_URL = "https://hooks.example.test";
  });

  afterAll(() => {
    for (const key of ["COLLECTIONS_SMS_SENDING", "COLLECTIONS_EMAIL_SENDING", "TWILIO_AUTH_TOKEN", "COLLECTIONS_PUBLIC_WEBHOOK_BASE_URL"]) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
    fetchSpy.mockRestore();
  });

  it("REVIEW mode turns sending into a dry run, even when SMS sending says LIVE", async () => {
    const result = await send({ templateKey: "PAST_DUE_DAY1" });
    expect(result.status).toBe("DRY_RUN");
    const message = await latestOut();
    expect(message.renderedBody).toMatch(/^Hi [A-Z][a-z]+, this is Time Motor Sales(, Inc)?\./);
    expect(message.renderedBody).toMatch(/Reply STOP to opt out\.$/);
    expect(message.to).toBe(e164);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("saves a blocked message with the reason when sending is OFF", async () => {
    process.env.COLLECTIONS_SMS_SENDING = "OFF";
    try {
      expect((await send({ body: "Hi, please call us." })).status).toBe("BLOCKED");
      expect((await latestOut()).blockedReason).toMatch(/turned off/);
    } finally { process.env.COLLECTIONS_SMS_SENDING = "LIVE"; }
  });

  it("STOP by text blocks texts, sends one confirmation, and START allows them again", async () => {
    const result = await handleInboundSms({ From: e164, Body: "Stop", MessageSid: `SM-stop-${ctx.suffix}` });
    expect(result).toMatchObject({ stored: true, keyword: "STOP", matchedAccounts: 1, replies: 1 });
    expect((await latestOut()).renderedBody).toMatch(/unsubscribed/);
    expect((await handleInboundSms({ From: e164, Body: "Stop", MessageSid: `SM-stop-${ctx.suffix}` })).duplicate).toBe(true);
    expect((await send({ body: "Hi" })).status).toBe("BLOCKED");
    expect((await latestOut()).blockedReason).toMatch(/opted out/);
    await handleInboundSms({ From: e164, Body: "START", MessageSid: `SM-start-${ctx.suffix}` });
    expect((await send({ body: "Hi" })).status).toBe("DRY_RUN");
  });

  it("only accepts signed Twilio webhooks", async () => {
    const params = { From: e164, Body: "I can pay Friday", MessageSid: `SM-hook-${ctx.suffix}` };
    const body = new URLSearchParams(params).toString();
    const headers = { "content-type": "application/x-www-form-urlencoded" };
    const unsigned = await inboundRoute(new Request("http://localhost/api/collections/sms/inbound", { method: "POST", headers, body }));
    expect(unsigned.status).toBe(403);
    const signature = twilioSignatureFor("test-only-token", "https://hooks.example.test/api/collections/sms/inbound", params);
    const signed = await inboundRoute(new Request("http://localhost/api/collections/sms/inbound", { method: "POST", headers: { ...headers, "x-twilio-signature": signature }, body }));
    expect(signed.status).toBe(200);
    expect(await prisma.inboundMessage.count({ where: { providerMessageId: params.MessageSid } })).toBe(1);
  });

  it("shows the thread in the inbox with unread messages", async () => {
    const inbox = await getInbox(ctx.owner, { thread: accountId });
    expect(inbox.threads.find(t => t.accountId === accountId)?.unread).toBeGreaterThan(0);
    expect(inbox.messages.some(m => m.direction === "in" && m.body === "I can pay Friday")).toBe(true);
    await runAccountAction(ctx.owner, accountId, { action: "MARK_MESSAGES_READ" });
    expect((await getInbox(ctx.owner, { thread: accountId })).threads.find(t => t.accountId === accountId)?.unread).toBe(0);
  });

  it("creates automatic messages once, and waits for business hours", async () => {
    const settings = await loadCollectionsSettings(ctx.organizationId);
    const run = (iso: string) => prisma.$transaction(tx => queueAutomaticMessages(tx, ctx.organizationId, settings, new Date(iso)));
    // Saturday 8:20 am Chicago: before opening, so it waits in the queue.
    const first = await run("2026-11-21T14:20:00Z");
    expect(first.created).toBeGreaterThanOrEqual(1);
    const auto = await prisma.outboundMessage.findFirstOrThrow({ where: { accountId, automationRuleKey: "PAST_DUE_DAY1" } });
    expect(auto.status).toBe("QUEUED");
    expect(auto.scheduledFor?.toISOString()).toBe("2026-11-21T16:00:00.000Z");
    expect((await run("2026-11-21T14:25:00Z")).created).toBe(0); // idempotent
    const sent = await prisma.$transaction(tx => dispatchQueuedMessages(tx, ctx.organizationId, settings, new Date("2026-11-21T16:05:00Z")));
    expect(sent).toBeGreaterThanOrEqual(1);
    expect((await prisma.outboundMessage.findUniqueOrThrow({ where: { id: auto.id } })).status).toBe("DRY_RUN");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never texts a bankruptcy-frozen account", async () => {
    await runAccountAction(ctx.owner, accountId, { action: "SET_FLAG", type: "BANKRUPTCY", reason: "Customer reported a filing" });
    expect((await send({ body: "Hi" })).status).toBe("BLOCKED");
    expect((await latestOut()).blockedReason).toMatch(/Bankruptcy/);
  });
});
