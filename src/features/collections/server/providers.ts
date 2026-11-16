/**
 * Twilio (texts) and Resend (email) clients, using plain fetch (no new packages).
 *
 * These are only called when the channel's sending mode is LIVE, which requires
 * COLLECTIONS_MODULE=PILOT or LIVE plus COLLECTIONS_SMS_SENDING / COLLECTIONS_EMAIL_SENDING=LIVE.
 * In REVIEW mode, or with DRY_RUN, nothing here runs. Tests replace `fetch`, so they never
 * reach the internet.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type ProviderResult = { ok: true; providerMessageId: string | null } | { ok: false; error: string };

export function publicWebhookUrl(path: string, env: NodeJS.ProcessEnv = process.env) {
  const base = (env.COLLECTIONS_PUBLIC_WEBHOOK_BASE_URL ?? "").trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

export async function sendTwilioSms(input: { to: string; body: string }, env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch): Promise<ProviderResult> {
  const sid = env.TWILIO_ACCOUNT_SID?.trim(), token = env.TWILIO_AUTH_TOKEN?.trim();
  const service = env.TWILIO_MESSAGING_SERVICE_SID?.trim(), from = env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token || (!service && !from)) return { ok: false, error: "Twilio isn't set up (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and a messaging service or from number)." };
  const form = new URLSearchParams({ To: input.to, Body: input.body });
  if (service) form.set("MessagingServiceSid", service); else form.set("From", from!);
  const callback = publicWebhookUrl("/api/collections/sms/status", env);
  if (callback) form.set("StatusCallback", callback);
  try {
    const response = await fetcher(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    const json = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!response.ok) return { ok: false, error: `Twilio error ${response.status}${json.message ? `: ${json.message}` : ""}` };
    return { ok: true, providerMessageId: json.sid ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Twilio request failed" };
  }
}

export async function sendResendEmail(input: { to: string; subject: string; text: string }, env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch): Promise<ProviderResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.COLLECTIONS_EMAIL_FROM?.trim() || env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) return { ok: false, error: "Email isn't set up (RESEND_API_KEY and COLLECTIONS_EMAIL_FROM)." };
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, reply_to: env.COLLECTIONS_EMAIL_REPLY_TO?.trim() || env.AUTH_EMAIL_REPLY_TO?.trim() || undefined })
    });
    const json = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) return { ok: false, error: `Resend error ${response.status}${json.message ? `: ${json.message}` : ""}` };
    return { ok: true, providerMessageId: json.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email request failed" };
  }
}

/**
 * Twilio request signature check: HMAC-SHA1 (auth token) of the full public URL followed by
 * every POST parameter name+value in alphabetical order, base64-encoded.
 */
export function twilioSignatureFor(authToken: string, url: string, params: Record<string, string>) {
  const data = Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function verifyTwilioSignature(input: { authToken: string | undefined; url: string | null; params: Record<string, string>; signature: string | null }) {
  if (!input.authToken || !input.url || !input.signature) return false;
  const expected = Buffer.from(twilioSignatureFor(input.authToken, input.url, input.params));
  const given = Buffer.from(input.signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Very small fixed-window rate limit for the public webhooks (per process). */
const hits = new Map<string, { windowStart: number; count: number }>();
export function webhookRateLimited(key: string, limit = 120, windowMs = 60_000, now = Date.now()) {
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= windowMs) { hits.set(key, { windowStart: now, count: 1 }); return false; }
  entry.count += 1;
  return entry.count > limit;
}
