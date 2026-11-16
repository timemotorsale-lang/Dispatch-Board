import { describe, expect, it, vi } from "vitest";

import { checkSendRules, classifyInbound, firstNameFrom, isWithinSendWindow, nextSendWindow, renderTemplate, type SendRuleInput } from "@/features/collections/domain/messaging";
import { DEFAULT_COLLECTIONS_SETTINGS } from "@/features/collections/domain/settings";
import { sendResendEmail, sendTwilioSms, twilioSignatureFor, verifyTwilioSignature, webhookRateLimited } from "@/features/collections/server/providers";

const ok: SendRuleInput = {
  channel: "SMS", automatic: true, to: "+16125550123", activeFlags: [], consents: [], contractConsent: true, overrideReason: null,
  automaticSentLast7Days: 0, weeklyCap: 3, bodyLength: 120, maxLength: 320, missingFields: [], templateApproved: true
};
const rule = (patch: Partial<SendRuleInput>) => checkSendRules({ ...ok, ...patch });

describe("STOP, START and HELP keywords", () => {
  it("recognizes the standard keywords", () => {
    for (const word of ["STOP", "stop", " Stop. ", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT"]) expect(classifyInbound(word)).toBe("STOP");
    expect(classifyInbound("START")).toBe("START");
    expect(classifyInbound("unstop")).toBe("START");
    expect(classifyInbound("HELP")).toBe("HELP");
  });
  it("recognizes 'stop texting me' phrases in all four languages", () => {
    expect(classifyInbound("Please stop texting me")).toBe("STOP");
    expect(classifyInbound("Dejen de enviarme mensajes por favor")).toBe("STOP");
    expect(classifyInbound("Fadlan ha ii soo dirin fariimo")).toBe("STOP");
    expect(classifyInbound("Tafadhali usinitumie ujumbe")).toBe("STOP");
  });
  it("doesn't treat normal replies as keywords", () => {
    expect(classifyInbound("I will pay on Friday, sorry it's late")).toBeNull();
    expect(classifyInbound("Can you stop by tomorrow?")).toBeNull();
  });
});

describe("templates", () => {
  it("fills merge fields and lists missing ones", () => {
    expect(renderTemplate("Hi {firstName}, call {dealershipPhone}.", { firstName: "Ana", dealershipPhone: "612-555-0100" })).toEqual({ text: "Hi Ana, call 612-555-0100.", missing: [] });
    expect(renderTemplate("Pay at {payOnlineUrl}", { payOnlineUrl: "" }).missing).toEqual(["payOnlineUrl"]);
  });
  it("takes the first name from 'LAST, FIRST' or 'First Last'", () => {
    expect(firstNameFrom("SAMPLE, ALEX J")).toBe("Alex");
    expect(firstNameFrom("jordan testcase")).toBe("Jordan");
    expect(firstNameFrom("")).toBe("there");
  });
});

describe("send rules", () => {
  it("allows a normal message", () => expect(rule({}).allowed).toBe(true));
  it("blocks bankruptcy and contact restrictions", () => {
    expect(rule({ activeFlags: [{ type: "BANKRUPTCY", scope: null }] }).reason).toMatch(/Bankruptcy/);
    expect(rule({ activeFlags: [{ type: "CONTACT_RESTRICTED", scope: "NO_TEXT" }] }).allowed).toBe(false);
    expect(rule({ channel: "EMAIL", to: "a@example.test", activeFlags: [{ type: "CONTACT_RESTRICTED", scope: "NO_TEXT" }] }).allowed).toBe(true);
    expect(rule({ activeFlags: [{ type: "CONTACT_RESTRICTED", scope: "NO_CONTACT" }] }).allowed).toBe(false);
  });
  it("needs a manual override with a reason for attorney-represented accounts, never automatic", () => {
    const attorney = [{ type: "ATTORNEY_REPRESENTED", scope: null }];
    expect(rule({ activeFlags: attorney }).allowed).toBe(false);
    expect(rule({ activeFlags: attorney, automatic: false }).allowed).toBe(false);
    expect(rule({ activeFlags: attorney, automatic: false, overrideReason: "Customer asked us to call them directly" }).allowed).toBe(true);
  });
  it("respects STOP until new consent is recorded", () => {
    const stop = { status: "REVOKED" as const, recordedAt: new Date("2026-11-10T12:00:00Z") };
    expect(rule({ consents: [stop] }).reason).toMatch(/STOP/);
    expect(rule({ consents: [stop, { status: "GRANTED", recordedAt: new Date("2026-11-12T12:00:00Z") }] }).allowed).toBe(true);
    expect(rule({ contractConsent: false }).allowed).toBe(false);
  });
  it("enforces the weekly cap for automatic messages and only warns for manual ones", () => {
    expect(rule({ automaticSentLast7Days: 3 }).allowed).toBe(false);
    const manual = rule({ automaticSentLast7Days: 3, automatic: false });
    expect(manual.allowed).toBe(true);
    expect(manual.warnings[0]).toMatch(/3 automatic messages/);
  });
  it("blocks long texts, missing details, no phone and unapproved automatic templates", () => {
    expect(rule({ bodyLength: 321 }).allowed).toBe(false);
    expect(rule({ missingFields: ["payOnlineUrl"] }).reason).toMatch(/payOnlineUrl/);
    expect(rule({ to: null }).allowed).toBe(false);
    expect(rule({ templateApproved: false }).allowed).toBe(false);
    expect(rule({ templateApproved: false, automatic: false }).allowed).toBe(true);
  });
  it("pauses automatic messages for deceased", () => {
    expect(rule({ activeFlags: [{ type: "DECEASED", scope: null }] }).allowed).toBe(false);
  });
});

describe("quiet hours (Chicago time)", () => {
  const s = DEFAULT_COLLECTIONS_SETTINGS;
  it("sends Mon–Fri 9–6 and Sat 10–3 only", () => {
    expect(isWithinSendWindow(new Date("2026-11-16T15:00:00Z"), s)).toBe(true); // Mon 9:00
    expect(isWithinSendWindow(new Date("2026-11-16T14:59:00Z"), s)).toBe(false); // Mon 8:59
    expect(isWithinSendWindow(new Date("2026-11-17T00:00:00Z"), s)).toBe(false); // Mon 6:00 pm
    expect(isWithinSendWindow(new Date("2026-11-21T15:30:00Z"), s)).toBe(false); // Sat 9:30
    expect(isWithinSendWindow(new Date("2026-11-21T16:00:00Z"), s)).toBe(true); // Sat 10:00
    expect(isWithinSendWindow(new Date("2026-11-22T18:00:00Z"), s)).toBe(false); // Sun
  });
  it("finds the next allowed time", () => {
    expect(nextSendWindow(new Date("2026-11-21T14:20:00Z"), s)?.toISOString()).toBe("2026-11-21T16:00:00.000Z"); // Sat 8:20 -> 10:00
    expect(nextSendWindow(new Date("2026-11-21T22:00:00Z"), s)?.toISOString()).toBe("2026-11-23T15:00:00.000Z"); // Sat 4 pm -> Mon 9:00
  });
});

describe("Twilio and Resend clients (no network)", () => {
  it("checks Twilio signatures and rejects tampering", () => {
    const params = { From: "+16125550123", Body: "STOP", MessageSid: "SM1" };
    const url = "https://hooks.example.test/api/collections/sms/inbound";
    const signature = twilioSignatureFor("test-token", url, params);
    expect(verifyTwilioSignature({ authToken: "test-token", url, params, signature })).toBe(true);
    expect(verifyTwilioSignature({ authToken: "test-token", url, params: { ...params, Body: "START" }, signature })).toBe(false);
    expect(verifyTwilioSignature({ authToken: undefined, url, params, signature })).toBe(false);
    expect(verifyTwilioSignature({ authToken: "test-token", url, params, signature: null })).toBe(false);
  });
  it("sends through Twilio's REST API with the messaging service", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ sid: "SMabc" }), { status: 201 }));
    const result = await sendTwilioSms({ to: "+16125550123", body: "Hi" }, { TWILIO_ACCOUNT_SID: "ACtest", TWILIO_AUTH_TOKEN: "t", TWILIO_MESSAGING_SERVICE_SID: "MGtest", COLLECTIONS_PUBLIC_WEBHOOK_BASE_URL: "https://hooks.example.test/" } as never, fetcher as never);
    expect(result).toEqual({ ok: true, providerMessageId: "SMabc" });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json");
    expect(String(init.body)).toContain("MessagingServiceSid=MGtest");
    expect(String(init.body)).toContain(encodeURIComponent("https://hooks.example.test/api/collections/sms/status"));
  });
  it("reports missing setup instead of sending", async () => {
    const fetcher = vi.fn();
    expect((await sendTwilioSms({ to: "+1", body: "x" }, {} as never, fetcher as never)).ok).toBe(false);
    expect((await sendResendEmail({ to: "a@example.test", subject: "s", text: "t" }, {} as never, fetcher as never)).ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rate-limits the public webhooks", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i += 1) expect(webhookRateLimited("test-key", 3, 60_000, now)).toBe(false);
    expect(webhookRateLimited("test-key", 3, 60_000, now)).toBe(true);
    expect(webhookRateLimited("test-key", 3, 60_000, now + 60_000)).toBe(false);
  });
});
