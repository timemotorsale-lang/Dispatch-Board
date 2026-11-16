/**
 * Texts and emails (spec section 8): building, checking, recording and sending messages,
 * the automatic message rules, and incoming texts (STOP / START / HELP).
 *
 * Every message is saved as an OutboundMessage, including blocked ones (with the reason).
 * What actually happens depends on the sending mode for the channel:
 *   OFF     -> saved as BLOCKED ("sending is turned off"); automatic rules don't run at all
 *   DRY_RUN -> saved as DRY_RUN; nothing leaves the building (REVIEW mode always forces this)
 *   LIVE    -> sent through Twilio / Resend (only in PILOT or LIVE mode)
 */
import type { CollectionLanguage, CollectionMessageChannel, OutboundMessage, Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { resolveSendingMode } from "../config/flags";
import { CollectionsError } from "../config/permissions";
import { SMS_MAX_LENGTH } from "../domain/default-templates";
import { checkSendRules, classifyInbound, firstNameFrom, isWithinSendWindow, nextSendWindow, renderTemplate, type Channel } from "../domain/messaging";
import { addDays, chicagoDateTime, chicagoToday, dateOnly, formatCents, maskPhone, toE164, toYmd } from "../domain/money-dates";
import type { CollectionsSettings, MessageRuleKey } from "../domain/settings";
import { effectiveInsuranceStatus } from "../domain/tasks";
import { collectionsAccess, recordAccountEvent, type CollectionsAccess } from "./access";
import { findAccount, text, visibilityWhere } from "./account-service";
import { loadCollectionsSettings } from "./settings-store";
import { sendResendEmail, sendTwilioSms } from "./providers";

type Db = Prisma.TransactionClient;

const ACCOUNT_SELECT = {
  id: true, organizationId: true, buyerNameRaw: true, dealNumber: true, primaryPhone: true, primaryEmail: true, preferredLanguage: true,
  paymentAmountCents: true, amountDueCents: true, consentSource: true, assignedCollectorUserId: true, daysPastDue: true,
  customer: { select: { displayName: true } }
} satisfies Prisma.CollectionAccountSelect;
type MessageAccount = Prisma.CollectionAccountGetPayload<{ select: typeof ACCOUNT_SELECT }>;

// ---------- Templates and merge fields ----------

export async function loadTemplate(db: Db, organizationId: string, key: string, channel: CollectionMessageChannel, language: CollectionLanguage) {
  // The newest APPROVED version is what gets sent; a newer draft waits for approval without stopping messages.
  const pick = async (lang: CollectionLanguage) => {
    const approved = await db.messageTemplate.findFirst({ where: { organizationId, key, channel, language: lang, status: "APPROVED" }, orderBy: { version: "desc" } });
    return approved ?? db.messageTemplate.findFirst({ where: { organizationId, key, channel, language: lang }, orderBy: { version: "desc" } });
  };
  const own = await pick(language);
  if (own?.status === "APPROVED") return { template: own, fallback: false };
  if (language !== "EN") {
    const english = await pick("EN");
    if (english) return { template: english, fallback: true };
  }
  return { template: own, fallback: false };
}

function shortDate(ymd: string | null) {
  if (!ymd) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T00:00:00Z`));
}

function hoursText(settings: CollectionsSettings) {
  const h = settings.businessHours;
  const fmt = (t: string) => { const [hh, mm] = t.split(":").map(Number); return `${hh % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""}${hh < 12 ? "am" : "pm"}`; };
  return [h.mon ? `Mon–Fri ${fmt(h.mon.open)}–${fmt(h.mon.close)}` : null, h.sat ? `Sat ${fmt(h.sat.open)}–${fmt(h.sat.close)}` : null].filter(Boolean).join(", ");
}

export async function mergeFieldsFor(db: Db, account: MessageAccount, settings: CollectionsSettings, extra: Record<string, string | null> = {}) {
  const snapshot = await db.collectionAccountSnapshot.findFirst({ where: { accountId: account.id }, orderBy: { asOfDate: "desc" }, select: { paymentDueDate: true } });
  const d = settings.dealership;
  return {
    firstName: firstNameFrom(account.customer?.displayName ?? account.buyerNameRaw),
    // Rule 8: no full balances in texts; only the payment amount and due date.
    paymentAmount: account.paymentAmountCents ? formatCents(account.paymentAmountCents) : null,
    dueDate: shortDate(toYmd(snapshot?.paymentDueDate ?? null)),
    dealershipName: d.name || null, dealershipPhone: d.phone || null, businessHours: hoursText(settings) || null,
    payOnlineUrl: d.payOnlineUrl || null, zelleRecipient: d.zelleRecipient || null, inPersonAddress: d.address || null,
    promiseAmount: null, promiseDate: null,
    ...extra
  } as Record<string, string | null>;
}

// ---------- Building and checking a message ----------

export type DraftInput = {
  channel: Channel;
  templateKey?: string | null;
  /** Manual messages may be edited before sending. */
  body?: string | null;
  subject?: string | null;
  automatic: boolean;
  ruleKey?: MessageRuleKey | null;
  overrideReason?: string | null;
  extraFields?: Record<string, string | null>;
};

export async function draftMessage(db: Db, account: MessageAccount, settings: CollectionsSettings, input: DraftInput, now = new Date(), excludeMessageId?: string) {
  const to = input.channel === "SMS" ? toE164(account.primaryPhone) : account.primaryEmail?.trim() || null;
  let templateId: string | null = null, languageFallback = false, templateApproved = true, language: CollectionLanguage = account.preferredLanguage;
  let body = input.body?.trim() ?? "", subject = input.subject?.trim() ?? null;
  if (input.templateKey) {
    const { template, fallback } = await loadTemplate(db, account.organizationId, input.templateKey, input.channel, account.preferredLanguage);
    if (!template) throw new CollectionsError("There's no template for that message yet.", 404);
    templateId = template.id; languageFallback = fallback; templateApproved = template.status === "APPROVED"; language = template.language;
    if (!body) body = template.body;
    if (!subject) subject = template.subject;
  }
  if (!body) throw new CollectionsError("Write a message or choose a template.");
  const fields = await mergeFieldsFor(db, account, settings, input.extraFields);
  const rendered = renderTemplate(body, fields);
  const renderedSubject = subject ? renderTemplate(subject, fields).text : input.channel === "EMAIL" ? `Message from ${settings.dealership.name}` : null;
  const [flags, consents, automaticSent] = await Promise.all([
    db.collectionFlag.findMany({ where: { accountId: account.id, clearedAt: null }, select: { type: true, scope: true } }),
    to ? db.contactConsent.findMany({ where: { accountId: account.id, channel: input.channel, address: to }, select: { status: true, recordedAt: true } }) : Promise.resolve([]),
    db.outboundMessage.count({ where: { accountId: account.id, ...(excludeMessageId ? { id: { not: excludeMessageId } } : {}), automationRuleKey: { not: null, notIn: ["KEYWORD_STOP", "KEYWORD_START", "KEYWORD_HELP"] }, status: { in: ["QUEUED", "DRY_RUN", "SENT", "DELIVERED"] }, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } })
  ]);
  const check = checkSendRules({
    channel: input.channel, automatic: input.automatic, to, activeFlags: flags, consents, contractConsent: account.consentSource === "CONTRACT",
    overrideReason: input.overrideReason, automaticSentLast7Days: automaticSent, weeklyCap: settings.weeklyAutomaticMessageCap,
    bodyLength: rendered.text.length, maxLength: SMS_MAX_LENGTH, missingFields: rendered.missing, templateApproved
  });
  if (languageFallback) check.warnings.push(`No approved ${account.preferredLanguage} template yet, so English is used.`);
  return { to, body: rendered.text, subject: renderedSubject, templateId, language, languageFallback, check };
}

// ---------- Delivering ----------

/** Send (or dry-run) one saved QUEUED message according to the channel's sending mode. */
export async function deliverMessage(db: Db, message: OutboundMessage, now = new Date()) {
  const channel = message.channel === "EMAIL" ? "EMAIL" : "SMS";
  const mode = resolveSendingMode(channel);
  if (mode === "OFF") {
    return db.outboundMessage.update({ where: { id: message.id }, data: { status: "BLOCKED", blockedReason: `${channel === "SMS" ? "Text" : "Email"} sending is turned off.` } });
  }
  if (mode === "DRY_RUN") {
    return db.outboundMessage.update({ where: { id: message.id }, data: { status: "DRY_RUN", sentAt: now } });
  }
  const result = channel === "SMS"
    ? await sendTwilioSms({ to: message.to, body: message.renderedBody })
    : await sendResendEmail({ to: message.to, subject: message.subject ?? "Message", text: message.renderedBody });
  if (!result.ok) {
    console.error(`[collections] ${channel} send failed to ${channel === "SMS" ? maskPhone(message.to) : "email"}: ${result.error}`);
    return db.outboundMessage.update({ where: { id: message.id }, data: { status: "FAILED", failedAt: now, errorMessage: result.error.slice(0, 500) } });
  }
  return db.outboundMessage.update({ where: { id: message.id }, data: { status: "SENT", sentAt: now, providerMessageId: result.providerMessageId } });
}

async function recordMessage(db: Db, account: MessageAccount, settings: CollectionsSettings, input: DraftInput & { actorId: string | null; dedupeKey?: string | null }, now: Date) {
  const draft = await draftMessage(db, account, settings, input, now);
  const base = {
    organizationId: account.organizationId, accountId: account.id, channel: input.channel, to: draft.to ?? "", templateKey: input.templateKey ?? null,
    templateId: draft.templateId, language: draft.language, languageFallback: draft.languageFallback, subject: draft.subject, renderedBody: draft.body,
    overrideReason: input.overrideReason?.trim() || null, automationRuleKey: input.automatic ? input.ruleKey ?? input.templateKey ?? null : null,
    dedupeKey: input.dedupeKey ?? null, sentByUserId: input.actorId
  };
  if (!draft.check.allowed) {
    return { message: await db.outboundMessage.create({ data: { ...base, status: "BLOCKED", blockedReason: draft.check.reason } }), draft };
  }
  if (input.automatic && !isWithinSendWindow(now, settings)) {
    const when = nextSendWindow(now, settings);
    return { message: await db.outboundMessage.create({ data: { ...base, status: "QUEUED", scheduledFor: when } }), draft };
  }
  const queued = await db.outboundMessage.create({ data: { ...base, status: "QUEUED", scheduledFor: now } });
  return { message: await deliverMessage(db, queued, now), draft };
}

// ---------- Manual actions from the account page / inbox ----------

export const MESSAGE_ACTIONS = ["PREVIEW_MESSAGE", "SEND_MESSAGE", "MARK_MESSAGES_READ", "RECORD_CONSENT"] as const;

export async function messageAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = text(input.action, 40);
  const permission = action === "RECORD_CONSENT" ? "CLEAR_FLAG" : action === "MARK_MESSAGES_READ" ? "VIEW" : "SEND_MANUAL_MESSAGE";
  const access = await collectionsAccess(actor, permission);
  const settings = await loadCollectionsSettings(access.organizationId);
  const channel: Channel = input.channel === "EMAIL" ? "EMAIL" : "SMS";
  return prisma.$transaction(async tx => {
    await findAccount(tx, access, accountId);
    const account = await tx.collectionAccount.findUniqueOrThrow({ where: { id: accountId }, select: ACCOUNT_SELECT });
    const draftInput: DraftInput = { channel, templateKey: text(input.templateKey, 60) || null, body: text(input.body, 2000) || null, subject: text(input.subject, 200) || null, automatic: false, overrideReason: text(input.overrideReason, 500) || null };
    switch (action) {
      case "PREVIEW_MESSAGE": {
        const draft = await draftMessage(tx, account, settings, draftInput);
        return { ok: true as const, message: "Preview ready.", preview: { to: channel === "SMS" ? maskPhone(draft.to) : draft.to, body: draft.body, subject: draft.subject, length: draft.body.length, maxLength: SMS_MAX_LENGTH, allowed: draft.check.allowed, reason: draft.check.reason, warnings: draft.check.warnings, languageFallback: draft.languageFallback, sendingMode: resolveSendingMode(channel) } };
      }
      case "SEND_MESSAGE": {
        const { message, draft } = await recordMessage(tx, account, settings, { ...draftInput, actorId: access.actor.id }, new Date());
        await recordAccountEvent(tx, { organizationId: access.organizationId, accountId, type: "MESSAGE_SENT", userId: access.actor.id, after: { messageId: message.id, channel, status: message.status }, reason: draftInput.overrideReason ?? "" });
        await tx.collectionAccount.update({ where: { id: accountId }, data: { lastContactAt: new Date() } });
        const words = { BLOCKED: `Not sent: ${message.blockedReason}`, DRY_RUN: "Saved as a dry run. Nothing was actually sent (test mode).", SENT: "Sent.", FAILED: `Sending failed: ${message.errorMessage}`, QUEUED: "Queued.", DELIVERED: "Delivered." } as const;
        return { ok: true as const, message: words[message.status], status: message.status, warnings: draft.check.warnings };
      }
      case "MARK_MESSAGES_READ": {
        const { count } = await tx.inboundMessage.updateMany({ where: { accountId, readAt: null }, data: { readAt: new Date(), readByUserId: access.actor.id } });
        return { ok: true as const, message: count ? "Marked as read." : "No unread messages." };
      }
      case "RECORD_CONSENT": {
        // A new consent recorded from the customer is the only way to text again after STOP.
        const to = channel === "SMS" ? toE164(account.primaryPhone) : account.primaryEmail?.trim();
        if (!to) throw new CollectionsError("Add the customer's contact details first.");
        const evidence = text(input.evidence, 500);
        if (evidence.length < 10) throw new CollectionsError("Describe how the customer gave consent (who, when, how).");
        const source = input.source === "WRITTEN" ? "WRITTEN" : "VERBAL";
        await tx.contactConsent.create({ data: { organizationId: access.organizationId, accountId, channel, address: to, status: "GRANTED", source, evidence, recordedByUserId: access.actor.id } });
        await recordAccountEvent(tx, { organizationId: access.organizationId, accountId, type: "CONSENT_GRANTED", userId: access.actor.id, after: { channel, source }, reason: evidence });
        return { ok: true as const, message: "Consent recorded." };
      }
      default:
        throw new CollectionsError("Unknown message action.");
    }
  });
}

// ---------- Automatic messages (section 8.3) ----------

export type AutomaticMessageSummary = { created: number; blocked: number; queued: number; sent: number; skipped: string | null };

/** Create today's automatic messages (idempotent through dedupeKey), then send any that are due. */
export async function queueAutomaticMessages(db: Db, organizationId: string, settings: CollectionsSettings, now = new Date()): Promise<AutomaticMessageSummary> {
  const summary: AutomaticMessageSummary = { created: 0, blocked: 0, queued: 0, sent: 0, skipped: null };
  const smsMode = resolveSendingMode("SMS"), emailMode = resolveSendingMode("EMAIL");
  if (smsMode === "OFF" && emailMode === "OFF") { summary.skipped = "Text and email sending are both OFF."; return summary; }
  const today = chicagoToday(now);
  const rules = settings.messageRules;
  const accounts = await db.collectionAccount.findMany({
    where: { organizationId, closedStatus: null, archivedAt: null, status: { notIn: ["REPOSSESSED", "BANKRUPTCY_FROZEN", "PAID_OFF", "CLOSED"] } },
    select: { ...ACCOUNT_SELECT, snapshots: { orderBy: { asOfDate: "desc" }, take: 1, select: { paymentDueDate: true } } }
  });
  const ids = accounts.map(a => a.id);
  const [promises, insurance, priorInsuranceMsgs] = await Promise.all([
    db.paymentPromise.findMany({ where: { organizationId, accountId: { in: ids }, status: "OPEN", promisedDate: dateOnly(addDays(today, -rules.PROMISE_REMINDER.dayOffset)) }, select: { id: true, accountId: true, promisedAmountCents: true, promisedDate: true } }),
    db.insuranceRecord.findMany({ where: { organizationId, accountId: { in: ids } }, orderBy: { createdAt: "desc" }, distinct: ["accountId"], select: { id: true, accountId: true, status: true, expirationDate: true, createdAt: true } }),
    db.outboundMessage.findMany({ where: { organizationId, automationRuleKey: "INSURANCE_NEEDED", status: { not: "BLOCKED" } }, select: { accountId: true, createdAt: true, dedupeKey: true } })
  ]);

  type Job = { account: (typeof accounts)[number]; rule: MessageRuleKey; channel: Channel; key: string; extra?: Record<string, string | null> };
  const jobs: Job[] = [];
  for (const account of accounts) {
    const due = toYmd(account.snapshots[0]?.paymentDueDate ?? null);
    const smsOrEmail = (rule: MessageRuleKey, key: string, extra?: Record<string, string | null>) => {
      // Email is the fallback when there's no usable mobile number.
      const channel: Channel = toE164(account.primaryPhone) || !account.primaryEmail ? "SMS" : "EMAIL";
      jobs.push({ account, rule, channel, key, extra });
    };
    if (rules.DUE_SOON.enabled && account.daysPastDue === 0 && due && due === addDays(today, -rules.DUE_SOON.dayOffset)) smsOrEmail("DUE_SOON", `DUE_SOON:${due}`);
    if (rules.PAST_DUE_DAY1.enabled && account.daysPastDue === rules.PAST_DUE_DAY1.dayOffset) jobs.push({ account, rule: "PAST_DUE_DAY1", channel: "SMS", key: `PAST_DUE_DAY1:${due ?? today}` });
    if (rules.PAST_DUE_LATE_FEE.enabled && account.daysPastDue === rules.PAST_DUE_LATE_FEE.dayOffset) jobs.push({ account, rule: "PAST_DUE_LATE_FEE", channel: "SMS", key: `PAST_DUE_LATE_FEE:${due ?? today}` });
    if (rules.PROMISE_REMINDER.enabled) {
      for (const p of promises.filter(x => x.accountId === account.id)) {
        jobs.push({ account, rule: "PROMISE_REMINDER", channel: "SMS", key: `PROMISE_REMINDER:${p.id}`, extra: { promiseAmount: formatCents(p.promisedAmountCents), promiseDate: shortDate(toYmd(p.promisedDate)) } });
      }
    }
    const ins = insurance.find(r => r.accountId === account.id);
    if (rules.INSURANCE_NEEDED.enabled && ins) {
      const status = effectiveInsuranceStatus({ status: ins.status, expirationDate: toYmd(ins.expirationDate) }, today, settings.insuranceExpiringSoonDays);
      if (status === "EXPIRED" || status === "MISSING") {
        // First request, then every N days (setting, default 7), at most 3 times per insurance record.
        const prior = priorInsuranceMsgs.filter(m => m.accountId === account.id && m.dedupeKey?.includes(`:${ins.id}:`));
        const rounds = new Set(prior.map(m => m.dedupeKey!.split(":").at(-2)));
        const last = prior.reduce<Date | null>((max, m) => (!max || m.createdAt > max ? m.createdAt : max), null);
        const waited = !last || now.getTime() - last.getTime() >= rules.INSURANCE_NEEDED.dayOffset * 86_400_000 - 3_600_000;
        if (rounds.size < 3 && waited) {
          const round = rounds.size + 1;
          jobs.push({ account, rule: "INSURANCE_NEEDED", channel: "SMS", key: `INSURANCE_NEEDED:${ins.id}:${round}:SMS` });
          if (account.primaryEmail) jobs.push({ account, rule: "INSURANCE_NEEDED", channel: "EMAIL", key: `INSURANCE_NEEDED:${ins.id}:${round}:EMAIL` });
        }
      }
    }
  }

  for (const job of jobs) {
    if ((job.channel === "SMS" ? smsMode : emailMode) === "OFF") continue;
    const dedupeKey = `${organizationId}:${job.account.id}:${job.key}`;
    if (await db.outboundMessage.findUnique({ where: { dedupeKey }, select: { id: true } })) continue;
    const template = await loadTemplate(db, organizationId, job.rule, job.channel, job.account.preferredLanguage);
    if (!template.template) continue; // no template for this channel (for example no email version)
    const { message } = await recordMessage(db, job.account, settings, { channel: job.channel, templateKey: job.rule, ruleKey: job.rule, automatic: true, extraFields: job.extra, actorId: null, dedupeKey }, now);
    summary.created += 1;
    if (message.status === "BLOCKED") summary.blocked += 1;
    else if (message.status === "QUEUED") summary.queued += 1;
    else summary.sent += 1;
  }
  summary.sent += await dispatchQueuedMessages(db, organizationId, settings, now);
  return summary;
}

/** Send automatic messages that were waiting for business hours. Rules are checked again first. */
export async function dispatchQueuedMessages(db: Db, organizationId: string, settings: CollectionsSettings, now = new Date()) {
  if (!isWithinSendWindow(now, settings)) return 0;
  const waiting = await db.outboundMessage.findMany({ where: { organizationId, status: "QUEUED", scheduledFor: { lte: now } }, orderBy: { scheduledFor: "asc" }, take: 500 });
  let sent = 0;
  for (const message of waiting) {
    const account = await db.collectionAccount.findUniqueOrThrow({ where: { id: message.accountId }, select: ACCOUNT_SELECT });
    const recheck = await draftMessage(db, account, settings, { channel: message.channel === "EMAIL" ? "EMAIL" : "SMS", body: message.renderedBody, subject: message.subject, automatic: Boolean(message.automationRuleKey), ruleKey: message.automationRuleKey as MessageRuleKey | null }, now, message.id);
    if (!recheck.check.allowed) {
      await db.outboundMessage.update({ where: { id: message.id }, data: { status: "BLOCKED", blockedReason: recheck.check.reason } });
      continue;
    }
    const after = await deliverMessage(db, message, now);
    if (after.status !== "BLOCKED" && after.status !== "FAILED") sent += 1;
  }
  return sent;
}

// ---------- Incoming texts (Twilio webhooks) ----------

export type InboundResult = { stored: boolean; duplicate?: boolean; keyword: string | null; matchedAccounts: number; replies: number };

async function systemReply(db: Db, account: MessageAccount, to: string, body: string, kind: string) {
  const message = await db.outboundMessage.create({ data: { organizationId: account.organizationId, accountId: account.id, channel: "SMS", to, renderedBody: body, status: "QUEUED", automationRuleKey: `KEYWORD_${kind}`, scheduledFor: new Date() } });
  return deliverMessage(db, message);
}

export async function handleInboundSms(params: Record<string, string>): Promise<InboundResult> {
  const from = toE164(params.From) ?? params.From?.trim() ?? "";
  const body = (params.Body ?? "").slice(0, 2000);
  const sid = params.MessageSid || params.SmsSid || null;
  const keyword = classifyInbound(body);
  if (!from) return { stored: false, keyword, matchedAccounts: 0, replies: 0 };
  if (sid && (await prisma.inboundMessage.findUnique({ where: { providerMessageId: sid }, select: { id: true } }))) return { stored: false, duplicate: true, keyword, matchedAccounts: 0, replies: 0 };

  const last4 = from.replace(/\D/g, "").slice(-4);
  const candidates = await prisma.collectionAccount.findMany({ where: { primaryPhone: { endsWith: last4 }, archivedAt: null }, select: { ...ACCOUNT_SELECT, lastImportedAt: true }, orderBy: { lastImportedAt: "desc" } });
  const matches = candidates.filter(a => toE164(a.primaryPhone) === from);
  let organizations = [...new Set(matches.map(m => m.organizationId))];
  if (!organizations.length) {
    const all = await prisma.collectionsSetting.findMany({ select: { organizationId: true }, take: 2 });
    if (all.length !== 1) { console.warn(`[collections] inbound text from ${maskPhone(from)} matched no organization; not stored`); return { stored: false, keyword, matchedAccounts: 0, replies: 0 }; }
    organizations = [all[0].organizationId];
  }
  const media = Array.from({ length: Math.min(Number(params.NumMedia ?? 0) || 0, 10) }, (_, i) => ({ url: params[`MediaUrl${i}`], contentType: params[`MediaContentType${i}`], savedDocumentId: null })).filter(m => m.url);

  let replies = 0;
  await prisma.$transaction(async tx => {
    for (const organizationId of organizations) {
      const orgMatches = matches.filter(m => m.organizationId === organizationId);
      const primary = orgMatches[0] ?? null;
      const settings = await loadCollectionsSettings(organizationId, tx);
      await tx.inboundMessage.create({ data: { organizationId, accountId: primary?.id ?? null, from, body, providerMessageId: organizations.length === 1 ? sid : null, keyword, mediaDocumentIds: media.length ? (media as Prisma.InputJsonValue) : undefined } });
      // YES re-subscribes someone who had opted out; otherwise it confirms an upcoming promise.
      let effective = keyword;
      if (keyword === "YES" && primary) {
        const latest = await tx.contactConsent.findFirst({ where: { accountId: primary.id, channel: "SMS", address: from }, orderBy: { recordedAt: "desc" }, select: { status: true } });
        if (latest?.status === "REVOKED") effective = "START";
      }
      for (const account of orgMatches) {
        if (effective === "STOP" || effective === "START") {
          const status = effective === "STOP" ? "REVOKED" : "GRANTED";
          await tx.contactConsent.create({ data: { organizationId, accountId: account.id, channel: "SMS", address: from, status, source: effective === "STOP" ? "KEYWORD_STOP" : "KEYWORD_START", evidence: `Customer texted "${body.slice(0, 80)}"` } });
          await recordAccountEvent(tx, { organizationId, accountId: account.id, type: effective === "STOP" ? "CONSENT_REVOKED" : "CONSENT_GRANTED", reason: `Keyword ${effective} received by text` });
        }
        await tx.collectionAccount.update({ where: { id: account.id }, data: { lastContactAt: new Date() } });
      }
      if (primary && effective) {
        const name = settings.dealership.name, phone = settings.dealership.phone;
        let reply: string | null = null;
        if (effective === "STOP") reply = `You're unsubscribed from ${name} texts and won't get more. Reply START to resubscribe.`;
        else if (effective === "START") reply = `You're subscribed again to texts from ${name}. Reply STOP to opt out.`;
        else if (effective === "HELP") reply = `${name}${phone ? `: call us at ${phone}` : ""}. Reply STOP to opt out.`;
        else if (effective === "YES") reply = await confirmPromiseByText(tx, primary, name);
        else if (effective === "PAID") reply = await reportPaidByText(tx, primary, body, name, phone);
        if (reply) { await systemReply(tx, primary, from, reply, effective); replies += 1; }
      }
      // Activity feed: no message text (privacy), just who it's for.
      const date = dateOnly(chicagoToday());
      const boardDay = await tx.boardDay.upsert({ where: { date }, update: {}, create: { date }, select: { id: true } });
      await tx.activityEvent.create({ data: { boardDayId: boardDay.id, eventType: "COLLECTIONS_INBOUND_TEXT", message: primary ? `New text from a Collections customer${primary.dealNumber ? ` (deal ${primary.dealNumber})` : ""}${keyword ? ` — ${keyword}` : ""}.` : "New text from an unknown number in the Collections inbox.", metadata: { source: "COLLECTIONS", organizationId, accountId: primary?.id ?? null, notifyUserId: primary?.assignedCollectorUserId ?? null, keyword } } });
    }
  });
  return { stored: true, keyword, matchedAccounts: matches.length, replies };
}

const STATUS_MAP: Record<string, "DELIVERED" | "FAILED" | "SENT" | undefined> = { delivered: "DELIVERED", failed: "FAILED", undelivered: "FAILED", sent: "SENT" };

export async function handleSmsStatus(params: Record<string, string>) {
  const sid = params.MessageSid || params.SmsSid;
  const status = STATUS_MAP[(params.MessageStatus ?? params.SmsStatus ?? "").toLowerCase()];
  if (!sid || !status) return { updated: 0 };
  const now = new Date();
  const { count } = await prisma.outboundMessage.updateMany({
    where: { providerMessageId: sid, status: { in: ["SENT", "QUEUED", "DELIVERED"] } },
    data: status === "DELIVERED" ? { status, deliveredAt: now } : status === "FAILED" ? { status, failedAt: now, errorMessage: params.ErrorCode ? `Twilio error code ${params.ErrorCode}` : "Not delivered" } : { status }
  });
  return { updated: count };
}

// ---------- Inbox (section 8.5) ----------

export async function getInbox(actor: AuthenticatedUser | null, query: { thread?: string | null }) {
  const access: CollectionsAccess = await collectionsAccess(actor, "VIEW");
  const visible = await visibilityWhere(access);
  const inbound = await prisma.inboundMessage.findMany({
    where: { organizationId: access.organizationId, ...(Object.keys(visible).length ? { OR: [{ accountId: null }, { account: { is: visible } }] } : {}) },
    orderBy: { receivedAt: "desc" }, take: 1000,
    select: { id: true, accountId: true, from: true, body: true, receivedAt: true, readAt: true, keyword: true, account: { select: { buyerNameRaw: true, dealNumber: true, customer: { select: { displayName: true } } } } }
  });
  const threads = new Map<string, { key: string; accountId: string | null; title: string; subtitle: string; lastAt: string; lastText: string; unread: number }>();
  for (const m of inbound) {
    const key = m.accountId ?? `phone:${m.from}`;
    const existing = threads.get(key);
    if (existing) { if (!m.readAt) existing.unread += 1; continue; }
    threads.set(key, {
      key, accountId: m.accountId,
      title: m.account ? m.account.customer?.displayName ?? m.account.buyerNameRaw : `Unknown number ${maskPhone(m.from)}`,
      subtitle: m.account ? `Deal ${m.account.dealNumber ?? "—"}` : "Not matched to an account",
      lastAt: m.receivedAt.toISOString(), lastText: m.body.slice(0, 120), unread: m.readAt ? 0 : 1
    });
  }
  const list = [...threads.values()].sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.lastAt.localeCompare(a.lastAt));
  const selected = query.thread ? threads.get(query.thread) ?? null : list[0] ?? null;
  let messages: Array<{ id: string; direction: "in" | "out"; at: string; body: string; status?: string; blockedReason?: string | null; media?: number }> = [];
  if (selected) {
    const inWhere = selected.accountId ? { accountId: selected.accountId } : { organizationId: access.organizationId, accountId: null, from: selected.key.slice(6) };
    const [ins, outs] = await Promise.all([
      prisma.inboundMessage.findMany({ where: inWhere, orderBy: { receivedAt: "desc" }, take: 200 }),
      selected.accountId ? prisma.outboundMessage.findMany({ where: { accountId: selected.accountId }, orderBy: { createdAt: "desc" }, take: 200 }) : Promise.resolve([])
    ]);
    messages = [
      ...ins.map(m => ({ id: m.id, direction: "in" as const, at: m.receivedAt.toISOString(), body: m.body, media: Array.isArray(m.mediaDocumentIds) ? m.mediaDocumentIds.length : 0 })),
      ...outs.map(m => ({ id: m.id, direction: "out" as const, at: m.createdAt.toISOString(), body: m.renderedBody, status: m.status, blockedReason: m.blockedReason }))
    ].sort((a, b) => a.at.localeCompare(b.at));
  }
  const templates = await prisma.messageTemplate.findMany({ where: { organizationId: access.organizationId, channel: "SMS", language: "EN", status: "APPROVED" }, orderBy: [{ key: "asc" }, { version: "desc" }], distinct: ["key"], select: { key: true } });
  return { threads: list, selected, messages, templateKeys: templates.map(t => t.key), sendingMode: resolveSendingMode("SMS") };
}

/**
 * Send one manual template message from inside another workflow (for example the starter-disable
 * warning text, which a person reviews and sends). Same rules and modes as any manual message.
 */
export async function sendManualTemplateMessage(db: Db, accountId: string, actorId: string, settings: CollectionsSettings, input: { channel: Channel; templateKey: string; body?: string | null }) {
  const account = await db.collectionAccount.findUniqueOrThrow({ where: { id: accountId }, select: ACCOUNT_SELECT });
  const { message, draft } = await recordMessage(db, account, settings, { channel: input.channel, templateKey: input.templateKey, body: input.body ?? null, automatic: false, actorId }, new Date());
  return { message, warnings: draft.check.warnings };
}


/** Customer replied YES: confirm the nearest open promise in the next 7 days (spec 22.7). */
async function confirmPromiseByText(db: Db, account: MessageAccount, dealershipName: string) {
  const today = chicagoToday();
  const promise = await db.paymentPromise.findFirst({ where: { accountId: account.id, status: "OPEN", promisedDate: { gte: dateOnly(today), lte: dateOnly(addDays(today, 7)) } }, orderBy: { promisedDate: "asc" } });
  if (!promise) return null; // Nothing to confirm; the text stays in the inbox for a person.
  if (!promise.customerConfirmedAt) {
    await db.paymentPromise.update({ where: { id: promise.id }, data: { customerConfirmedAt: new Date() } });
    await recordAccountEvent(db, { organizationId: account.organizationId, accountId: account.id, type: "PROMISE_CONFIRMED_BY_TEXT", after: { promiseId: promise.id } });
  }
  return `Thanks, ${firstNameFrom(account.customer?.displayName ?? account.buyerNameRaw)}! You're confirmed for ${formatCents(promise.promisedAmountCents)} on ${shortDate(toYmd(promise.promisedDate))}. - ${dealershipName}`;
}

/** Customer replied PAID: record a "customer says they paid" for the next imports to confirm (spec 22.7). */
async function reportPaidByText(db: Db, account: MessageAccount, body: string, dealershipName: string, phone: string) {
  const today = chicagoToday();
  const already = await db.customerReportedPayment.findFirst({ where: { accountId: account.id, enteredByUserId: null, notes: { startsWith: "Customer texted PAID" }, reportedAt: { gte: chicagoDateTime(today, "00:00") } }, select: { id: true } });
  if (!already) {
    const amount = account.paymentAmountCents ?? account.amountDueCents;
    const created = await db.customerReportedPayment.create({ data: {
      organizationId: account.organizationId, accountId: account.id, method: "OTHER", amountCents: amount, paidDate: dateOnly(today),
      notes: `Customer texted PAID: "${body.slice(0, 120)}". Amount assumed to be one payment; confirm with the customer.`, baselineAmountDueCents: account.amountDueCents, baselineDaysPastDue: account.daysPastDue
    } });
    await recordAccountEvent(db, { organizationId: account.organizationId, accountId: account.id, type: "PAYMENT_REPORTED_BY_TEXT", after: { reportedPaymentId: created.id, amountCents: amount } });
  }
  return `Thanks! We'll confirm your payment when it shows in our system. Questions? Call ${phone || dealershipName}. - ${dealershipName}`;
}
