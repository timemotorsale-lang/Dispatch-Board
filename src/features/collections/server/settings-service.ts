/**
 * Collections Settings (spec section 15). Admin only; every change is saved as a new
 * version in CollectionsSettingHistory plus an audit event, and edits from two people at
 * once can't overwrite each other (version check).
 *
 * Message templates are versioned and append-only: editing saves a new DRAFT version,
 * approving saves an APPROVED copy. Only the newest version of each template is used.
 */
import type { CollectionLanguage, CollectionMessageChannel, Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { CollectionsError } from "../config/permissions";
import { FLUENT_REVIEW_NOTE, MERGE_FIELDS, SMS_MAX_LENGTH } from "../domain/default-templates";
import { renderTemplate } from "../domain/messaging";
import { MESSAGE_RULE_KEYS, parseCollectionsSettings, type CollectionsSettings } from "../domain/settings";
import { collectionsAccess, recordAccountEvent } from "./access";
import { text } from "./account-service";
import { recalculateAccounts } from "./account-state";
import { seedCollectionsForOrganization } from "./seed";
import { loadCollectionsSettings } from "./settings-store";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Plain-English problems with a settings form, or [] when it's fine. */
export function validateSettingsInput(input: unknown): string[] {
  const errors: string[] = [];
  const v = (input && typeof input === "object" ? input : {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const num = (value: unknown, label: string, min: number, max: number) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) errors.push(`${label} must be a whole number from ${min} to ${max}.`);
    return n;
  };
  num(v.graceDays, "Grace days", 0, 30);
  num(v.promiseGraceDays, "Promise grace days", 0, 14);
  num(v.reportedPaymentConfirmationDays, "Reported-payment window", 1, 14);
  num(v.insuranceExpiringSoonDays, "Insurance expiring-soon days", 1, 90);
  num(v.weeklyAutomaticMessageCap, "Weekly message limit", 0, 20);
  if (!Number.isInteger(Number(v.lateFeeDisplayCents)) || Number(v.lateFeeDisplayCents) < 0 || Number(v.lateFeeDisplayCents) > 100_000) errors.push("Late fee must be between $0 and $1,000.");
  const t = v.thresholds ?? {};
  const steps = [num(t.disableReview, "Disable review", 1, 365), num(t.followUp, "Follow-up", 1, 365), num(t.review30, "Account review", 1, 365), num(t.repoReview, "Repo review", 1, 365)];
  if (steps.every(Number.isFinite) && !(steps[0] < steps[1] && steps[1] < steps[2] && steps[2] < steps[3])) errors.push("Thresholds must go up: disable review < follow-up < account review < repo review.");
  for (const [day, hours] of Object.entries(v.businessHours ?? {})) {
    if (hours === null) continue;
    const h = hours as { open?: string; close?: string };
    if (!TIME.test(h.open ?? "") || !TIME.test(h.close ?? "") || h.open! >= h.close!) errors.push(`Business hours for ${day}: closing must be after opening (HH:MM).`);
  }
  for (const [key, label] of [["importReminderTime", "Import reminder time"], ["automationRunTime", "Daily automation time"]] as const) if (!TIME.test(v[key] ?? "")) errors.push(`${label} must be HH:MM.`);
  const w = v.customerContactWindow ?? {};
  if (!TIME.test(w.start ?? "") || !TIME.test(w.end ?? "") || w.start >= w.end) errors.push("The customer contact window must be HH:MM to HH:MM.");
  for (const key of ["advantageGpsPortalUrl", "payOnlineUrl"] as const) {
    const url = String(v.dealership?.[key] ?? "").trim();
    if (url && !/^https?:\/\/[^\s]+$/i.test(url)) errors.push(`${key === "payOnlineUrl" ? "Pay-online link" : "Advantage portal link"} must start with https://`);
  }
  if (!String(v.dealership?.name ?? "").trim()) errors.push("Dealership name is required.");
  for (const key of MESSAGE_RULE_KEYS) {
    const rule = v.messageRules?.[key];
    if (rule && !Number.isInteger(Number(rule.dayOffset))) errors.push(`Timing for ${key} must be a whole number of days.`);
  }
  return errors;
}

export async function getSettingsPage(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "EDIT_SETTINGS");
  await seedCollectionsForOrganization(prisma, access.organizationId);
  const [row, history, templates] = await Promise.all([
    prisma.collectionsSetting.findUniqueOrThrow({ where: { organizationId: access.organizationId } }),
    prisma.collectionsSettingHistory.findMany({ where: { organizationId: access.organizationId }, orderBy: { version: "desc" }, take: 20, select: { version: true, changedByUserId: true, reason: true, createdAt: true } }),
    prisma.messageTemplate.findMany({ where: { organizationId: access.organizationId }, orderBy: [{ key: "asc" }, { channel: "asc" }, { language: "asc" }, { version: "desc" }], distinct: ["key", "channel", "language"] })
  ]);
  const names = new Map((await prisma.user.findMany({ where: { id: { in: [...new Set(history.map(h => h.changedByUserId).filter((x): x is string => Boolean(x)))] } }, select: { id: true, name: true } })).map(u => [u.id, u.name]));
  return {
    settings: parseCollectionsSettings(row.values),
    version: row.version,
    history: history.map(h => ({ ...h, changedBy: h.changedByUserId ? names.get(h.changedByUserId) ?? "Former staff" : "System", createdAt: h.createdAt.toISOString() })),
    templates: templates.map(t => ({ id: t.id, key: t.key, channel: t.channel, language: t.language, version: t.version, subject: t.subject, body: t.body, status: t.status, reviewNote: t.reviewNote, approvedAt: t.approvedAt?.toISOString() ?? null })),
    mergeFields: [...MERGE_FIELDS]
  };
}

function changedKeys(before: CollectionsSettings, after: CollectionsSettings) {
  return (Object.keys(after) as Array<keyof CollectionsSettings>).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

export async function saveSettings(actor: AuthenticatedUser | null, input: { values: unknown; version: number; reason?: string }) {
  const access = await collectionsAccess(actor, "EDIT_SETTINGS");
  const errors = validateSettingsInput(input.values);
  if (errors.length) throw new CollectionsError(errors.join(" "));
  const next = parseCollectionsSettings(input.values);
  // DISABLE_WARNING can never be automatic (parse enforces it too).
  next.messageRules.DISABLE_WARNING.enabled = false;
  return prisma.$transaction(async tx => {
    const row = await tx.collectionsSetting.findUnique({ where: { organizationId: access.organizationId } });
    if (!row) throw new CollectionsError("Settings aren't set up yet. Reload the page.", 409);
    if (row.version !== input.version) throw new CollectionsError("Someone else changed the settings since you opened this page. Reload to see their changes, then try again.", 409);
    const before = parseCollectionsSettings(row.values);
    const changed = changedKeys(before, next);
    if (!changed.length) return { ok: true as const, message: "Nothing changed.", version: row.version };
    const version = row.version + 1;
    const values = next as unknown as Prisma.InputJsonValue;
    await tx.collectionsSetting.update({ where: { organizationId: access.organizationId }, data: { values, version, updatedByUserId: access.actor.id } });
    await tx.collectionsSettingHistory.create({ data: { organizationId: access.organizationId, version, values, changedByUserId: access.actor.id, reason: text(input.reason, 500) || `Changed: ${changed.join(", ")}` } });
    await recordAccountEvent(tx, { organizationId: access.organizationId, type: "SETTINGS_CHANGED", userId: access.actor.id, before: Object.fromEntries(changed.map(k => [k, before[k]])), after: Object.fromEntries(changed.map(k => [k, next[k]])), reason: text(input.reason, 500) });
    // Grace days and thresholds change buckets and statuses; recalculate now (tasks follow on the next run).
    if (changed.some(k => k === "graceDays" || k === "thresholds")) await recalculateAccounts(tx, access.organizationId, await loadCollectionsSettings(access.organizationId, tx));
    return { ok: true as const, message: "Settings saved.", version };
  }, { timeout: 60_000 });
}

// ---------------- Templates ----------------

const LANGS: CollectionLanguage[] = ["EN", "ES", "SO", "SW"];

export function validateTemplate(input: { channel: string; language: string; body: string; subject?: string | null }) {
  const errors: string[] = [];
  const known = new Set<string>(MERGE_FIELDS);
  const unknown = [...input.body.matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(f => !known.has(f));
  if (unknown.length) errors.push(`Unknown merge fields: ${[...new Set(unknown)].map(f => `{${f}}`).join(", ")}.`);
  if (!input.body.trim()) errors.push("The message can't be empty.");
  if (input.channel === "SMS") {
    if (!/\bSTOP\b/.test(input.body)) errors.push('Texts must tell the customer how to opt out (for example "Reply STOP to opt out.").');
    // Measure with realistic sample values so the limit holds after merge fields are filled in.
    const sample = renderTemplate(input.body, { firstName: "Christopher", paymentAmount: "$1,234.56", dueDate: "Nov 30", promiseAmount: "$1,234.56", promiseDate: "Nov 30", dealershipName: "Time Motor Sales", dealershipPhone: "612-555-0100", businessHours: "Mon–Fri 9am–6pm, Sat 10am–3pm", payOnlineUrl: "https://pay.example.com/abc", zelleRecipient: "payments@example.com", inPersonAddress: "1234 Main St, Minneapolis" }).text;
    if (sample.length > SMS_MAX_LENGTH) errors.push(`Too long: about ${sample.length} characters with real details filled in (limit ${SMS_MAX_LENGTH}).`);
  } else if (!input.subject?.trim()) errors.push("Emails need a subject.");
  return errors;
}

export async function templateAction(actor: AuthenticatedUser | null, input: Record<string, unknown>) {
  const access = await collectionsAccess(actor, "EDIT_SETTINGS");
  const action = text(input.action, 40);
  return prisma.$transaction(async tx => {
    if (action === "SAVE_TEMPLATE") {
      const key = text(input.key, 40), channel = text(input.channel, 10) as CollectionMessageChannel, language = text(input.language, 4) as CollectionLanguage;
      if (!(MESSAGE_RULE_KEYS as readonly string[]).includes(key) || !["SMS", "EMAIL"].includes(channel) || !LANGS.includes(language)) throw new CollectionsError("Unknown template.");
      const body = text(input.body, 4000), subject = text(input.subject, 200) || null;
      const errors = validateTemplate({ channel, language, body, subject });
      if (errors.length) throw new CollectionsError(errors.join(" "));
      const latest = await tx.messageTemplate.findFirst({ where: { organizationId: access.organizationId, key, channel, language }, orderBy: { version: "desc" } });
      const created = await tx.messageTemplate.create({ data: { organizationId: access.organizationId, key, channel, language, version: (latest?.version ?? 0) + 1, subject, body, status: "DRAFT", reviewNote: language === "EN" ? null : FLUENT_REVIEW_NOTE, createdByUserId: access.actor.id } });
      await recordAccountEvent(tx, { organizationId: access.organizationId, type: "TEMPLATE_SAVED", userId: access.actor.id, after: { templateId: created.id, key, channel, language, version: created.version } });
      return { ok: true as const, message: `Saved as draft version ${created.version}. Approve it to start using it.` };
    }
    if (action === "APPROVE_TEMPLATE") {
      const t = await tx.messageTemplate.findFirst({ where: { id: text(input.templateId, 100), organizationId: access.organizationId } });
      if (!t) throw new CollectionsError("That template isn't available.", 404);
      const latest = await tx.messageTemplate.findFirst({ where: { organizationId: access.organizationId, key: t.key, channel: t.channel, language: t.language }, orderBy: { version: "desc" } });
      if (latest?.id !== t.id) throw new CollectionsError("A newer version exists. Reload the page.", 409);
      if (t.status === "APPROVED") return { ok: true as const, message: "Already approved." };
      if (t.language !== "EN" && input.fluentReviewed !== true && input.fluentReviewed !== "true") throw new CollectionsError("Confirm that a fluent speaker reviewed this translation.");
      const errors = validateTemplate(t);
      if (errors.length) throw new CollectionsError(errors.join(" "));
      const approved = await tx.messageTemplate.create({ data: { organizationId: t.organizationId, key: t.key, channel: t.channel, language: t.language, version: t.version + 1, subject: t.subject, body: t.body, status: "APPROVED", reviewNote: t.language === "EN" ? null : "Reviewed by a fluent speaker (confirmed by the approver).", createdByUserId: access.actor.id, approvedByUserId: access.actor.id, approvedAt: new Date() } });
      await recordAccountEvent(tx, { organizationId: access.organizationId, type: "TEMPLATE_APPROVED", userId: access.actor.id, after: { templateId: approved.id, key: t.key, channel: t.channel, language: t.language, version: approved.version } });
      return { ok: true as const, message: "Approved. It's used from now on." };
    }
    throw new CollectionsError("Unknown template action.");
  });
}
