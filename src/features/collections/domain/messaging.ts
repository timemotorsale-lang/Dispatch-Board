/**
 * Messaging rules (spec section 8), as pure functions so they can be tested without a
 * database or a phone provider. The server checks every message, manual or automatic,
 * with checkSendRules() before anything is sent.
 */
import { chicagoClock, timeToMinutes } from "./money-dates";
import type { CollectionsSettings } from "./settings";

export type Channel = "SMS" | "EMAIL";

// ---------- Keywords (section 8.2 rule 3) ----------

const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT", "OPT OUT", "PARAR", "ALTO", "JOOJI", "ACHA", "SITISHA"];
const START_WORDS = ["START", "UNSTOP", "YES", "SUBSCRIBE", "COMENZAR", "BILOW", "ANZA"];
const HELP_WORDS = ["HELP", "INFO", "AYUDA", "CAAWIN", "MSAADA"];
/** "Please stop texting me"-style phrases in English, Spanish, Somali and Swahili. */
const STOP_PHRASES = [
  /\bstop (texting|messaging|sending|contacting)\b/i, /\bdon'?t (text|message|contact) me\b/i, /\bno more (texts|messages)\b/i, /\bremove me\b/i,
  /\bdej(e|en) de (enviar|mandar|escribir)/i, /\bno me (env[ií]en|manden|escriban)/i, /\bya no (me )?(env[ií]en|manden)/i,
  /\bha (ii|i) soo dirin\b/i, /\bjoojiya? (fariimaha|farriimaha|qoraalka)/i,
  /\bacha (kunitumia|kutuma)/i, /\businitumie\b/i, /\bsitaki (ujumbe|meseji)/i
];

export type InboundKeyword = "STOP" | "START" | "HELP" | null;

/** Classify an inbound text. A one-word keyword or a clear "stop texting me" phrase counts. */
export function classifyInbound(body: string): InboundKeyword {
  const cleaned = body.trim().replace(/[.!?,"']+$/g, "").replace(/\s+/g, " ").toUpperCase();
  if (STOP_WORDS.includes(cleaned)) return "STOP";
  if (START_WORDS.includes(cleaned)) return "START";
  if (HELP_WORDS.includes(cleaned)) return "HELP";
  if (STOP_PHRASES.some(re => re.test(body))) return "STOP";
  return null;
}

// ---------- Templates (section 8.4) ----------

export function firstNameFrom(name: string | null | undefined) {
  const raw = (name ?? "").trim();
  if (!raw) return "there";
  const first = raw.includes(",") ? raw.split(",")[1]?.trim().split(/\s+/)[0] : raw.split(/\s+/)[0];
  const word = first || raw.split(/\s+/)[0];
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Fill {mergeFields}. Returns the text and the names of fields that had no value. */
export function renderTemplate(body: string, fields: Record<string, string | null | undefined>) {
  const missing = new Set<string>();
  const text = body.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = fields[name];
    if (value === undefined || value === null || value === "") { missing.add(name); return `[${name}]`; }
    return value;
  });
  return { text, missing: [...missing] };
}

// ---------- Send rules (section 8.2) ----------

export type ConsentRecord = { status: "GRANTED" | "REVOKED"; recordedAt: Date };

export type SendRuleInput = {
  channel: Channel;
  automatic: boolean;
  to: string | null;
  activeFlags: Array<{ type: string; scope: string | null }>;
  /** Consent records for this exact channel + address, any order. */
  consents: ConsentRecord[];
  /** The account's contract includes text consent (contract consent counts). */
  contractConsent: boolean;
  overrideReason?: string | null;
  automaticSentLast7Days: number;
  weeklyCap: number;
  bodyLength: number;
  maxLength: number;
  missingFields: string[];
  /** Template not approved in any language (automatic messages need an approved template). */
  templateApproved: boolean;
};

export type SendRuleResult = { allowed: boolean; reason: string | null; warnings: string[] };

export function latestConsent(consents: ConsentRecord[]) {
  return [...consents].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0] ?? null;
}

export function checkSendRules(input: SendRuleInput): SendRuleResult {
  const warnings: string[] = [];
  const block = (reason: string): SendRuleResult => ({ allowed: false, reason, warnings });
  const flags = new Set(input.activeFlags.map(f => f.type));
  const scopes = new Set(input.activeFlags.filter(f => f.type === "CONTACT_RESTRICTED").map(f => f.scope));

  if (flags.has("BANKRUPTCY")) return block("Bankruptcy freeze: no texts or emails.");
  if (scopes.has("NO_CONTACT")) return block("Contact restricted: no contact.");
  if (scopes.has("ATTORNEY_ONLY")) return block("Contact restricted: attorney only.");
  if (input.channel === "SMS" && scopes.has("NO_TEXT")) return block("Contact restricted: no texts.");
  if (input.channel === "EMAIL" && scopes.has("NO_EMAIL")) return block("Contact restricted: no email.");
  if (flags.has("ATTORNEY_REPRESENTED")) {
    if (input.automatic) return block("Attorney represented: automatic messages are stopped.");
    if (!input.overrideReason || input.overrideReason.trim().length < 5) return block("Attorney represented: a manual override with a reason is required.");
    warnings.push("Sent with an attorney-represented override.");
  }
  if (input.automatic && flags.has("DECEASED")) return block("Deceased flag: automation is paused.");
  if (!input.to) return block(input.channel === "SMS" ? "No mobile phone number on the account." : "No email address on the account.");

  if (input.channel === "SMS") {
    const consent = latestConsent(input.consents);
    if (consent?.status === "REVOKED") return block("The customer opted out of texts (STOP). A new recorded consent from the customer is needed.");
    if (!consent && !input.contractConsent) return block("No text consent on file.");
    if (input.bodyLength > input.maxLength) return block(`The text is too long (${input.bodyLength} of ${input.maxLength} characters).`);
  }
  if (input.missingFields.length) return block(`Missing details for the message: ${input.missingFields.join(", ")}. Fill them in under Settings.`);
  if (input.automatic && !input.templateApproved) return block("The template isn't approved yet.");
  if (input.automaticSentLast7Days >= input.weeklyCap) {
    if (input.automatic) return block(`Weekly limit reached (${input.weeklyCap} automatic messages in 7 days).`);
    warnings.push(`This account already had ${input.automaticSentLast7Days} automatic messages in the last 7 days.`);
  }
  return { allowed: true, reason: null, warnings };
}

// ---------- Quiet hours (section 8.2 rule 4) ----------

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Automatic messages go out only inside business hours AND the customer's 8am–9pm window (Chicago time). */
export function isWithinSendWindow(now: Date, settings: CollectionsSettings) {
  const clock = chicagoClock(now);
  const hours = settings.businessHours[DAY_KEYS[clock.weekday]];
  if (!hours) return false;
  const open = Math.max(timeToMinutes(hours.open), timeToMinutes(settings.customerContactWindow.start));
  const close = Math.min(timeToMinutes(hours.close), timeToMinutes(settings.customerContactWindow.end));
  return clock.minutes >= open && clock.minutes < close;
}

/** The next moment (on a 5-minute step, within 8 days) when an automatic message may go out. */
export function nextSendWindow(now: Date, settings: CollectionsSettings) {
  if (isWithinSendWindow(now, settings)) return now;
  const step = 5 * 60_000;
  const start = Math.ceil(now.getTime() / step) * step;
  for (let t = start; t < now.getTime() + 8 * 86_400_000; t += step) {
    if (isWithinSendWindow(new Date(t), settings)) return new Date(t);
  }
  return null;
}
