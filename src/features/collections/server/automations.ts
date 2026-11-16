/**
 * The Collections automations (spec section 7). They run:
 *   - right after each committed import, and
 *   - from the scheduled job (/api/cron/collections) at the automation time (default 9:15 am) Mon–Sat.
 * Every step is idempotent, and the whole run holds a per-organization lock, so running it
 * twice (or two at once) creates nothing twice.
 *
 * Steps: 1 recalculate status/bucket · 2 resolve promises, plans and reported payments ·
 * 3 insurance status (computed from the latest record) · 4 dispatch board tasks ·
 * 5 automatic messages (added in Stage 7) · 6 daily metric + activity summary ·
 * 7 missing-import reminder.
 *
 * Nothing here disables a starter, assigns a repo, sends a letter or clears a flag.
 */
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/client";

import { resolveCollectionsMode } from "../config/flags";
import { chicagoClock, chicagoDateTime, chicagoToday, addDays, dateOnly, timeToMinutes, toYmd } from "../domain/money-dates";
import type { CollectionsSettings } from "../domain/settings";
import { effectiveInsuranceStatus, isDailyRunDue, summaryMessage } from "../domain/tasks";
import { recalculateAccounts } from "./account-state";
import { resolveOutcomes, type ResolutionSummary } from "./promise-service";
import { loadCollectionsSettings } from "./settings-store";
import { syncCollectionTasks, syncImportReminder, type TaskSyncResult } from "./task-sync";

type Db = Prisma.TransactionClient;

export type AutomationTrigger = "IMPORT" | "DAILY" | "REMINDER_CHECK";
export type AutomationResult = {
  trigger: AutomationTrigger;
  recalculated: number;
  resolution: ResolutionSummary;
  tasks: TaskSyncResult;
  reminder: { created: boolean; closed: number; importedToday: boolean };
  summaryPosted: boolean;
};

/** Message queueing is added in Stage 7; this is the step-5 slot. */
export type MessageStep = (db: Db, organizationId: string, settings: CollectionsSettings, now: Date) => Promise<unknown>;
let messageStep: MessageStep | null = null;
export function setAutomaticMessageStep(step: MessageStep | null) { messageStep = step; }

export async function writeDailyMetric(db: Db, organizationId: string, settings: CollectionsSettings, now: Date, importRunId?: string | null) {
  const today = chicagoToday(now);
  const dayStart = chicagoDateTime(today, "00:00"), dayEnd = chicagoDateTime(addDays(today, 1), "00:00");
  const resolvedToday = { resolvedAt: { gte: dayStart, lt: dayEnd } };
  const [accounts, made, kept, partial, broken, repo, insurance] = await Promise.all([
    db.collectionAccount.findMany({ where: { organizationId, closedStatus: null, archivedAt: null }, select: { id: true, bucket: true, status: true, daysPastDue: true, amountDueCents: true, totalBalanceCents: true } }),
    db.paymentPromise.count({ where: { organizationId, createdAt: { gte: dayStart, lt: dayEnd } } }),
    db.paymentPromise.count({ where: { organizationId, status: "KEPT", ...resolvedToday } }),
    db.paymentPromise.count({ where: { organizationId, status: "PARTIALLY_KEPT", ...resolvedToday } }),
    db.paymentPromise.count({ where: { organizationId, status: "BROKEN", ...resolvedToday } }),
    db.repossessionCase.groupBy({ by: ["status"], where: { organizationId, status: { not: "CANCELLED" } }, _count: { _all: true } }),
    db.insuranceRecord.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, distinct: ["accountId"], select: { accountId: true, status: true, expirationDate: true } })
  ]);
  const bucketCounts: Record<string, number> = {}, bucketCents: Record<string, number> = {};
  for (const a of accounts) { bucketCounts[a.bucket] = (bucketCounts[a.bucket] ?? 0) + 1; bucketCents[a.bucket] = (bucketCents[a.bucket] ?? 0) + a.totalBalanceCents; }
  const insuranceByAccount = new Map(insurance.map(r => [r.accountId, r]));
  const insuranceCounts: Record<string, number> = {};
  for (const a of accounts) {
    const r = insuranceByAccount.get(a.id);
    const status = effectiveInsuranceStatus(r ? { status: r.status, expirationDate: toYmd(r.expirationDate) } : null, today, settings.insuranceExpiringSoonDays);
    insuranceCounts[status] = (insuranceCounts[status] ?? 0) + 1;
  }
  const pastDue = accounts.filter(a => a.daysPastDue > 0);
  const data = {
    importRunId: importRunId ?? undefined,
    totalAccounts: accounts.length,
    totalBalanceCents: accounts.reduce((s, a) => s + a.totalBalanceCents, 0),
    pastDueAccounts: pastDue.length,
    pastDueAmountCents: pastDue.reduce((s, a) => s + a.amountDueCents, 0),
    bucketCounts, bucketCents,
    promisesMade: made, promisesKept: kept, promisesPartiallyKept: partial, promisesBroken: broken,
    disableCount: accounts.filter(a => a.status === "STARTER_DISABLED").length,
    repoCounts: Object.fromEntries(repo.map(r => [r.status, r._count._all])),
    insuranceCounts
  };
  return db.collectionsDailyMetric.upsert({ where: { organizationId_metricDate: { organizationId, metricDate: dateOnly(today) } }, update: data, create: { organizationId, metricDate: dateOnly(today), ...data } });
}

async function postSummary(db: Db, now: Date, actorId: string | null, organizationId: string, message: string, metadata: Prisma.InputJsonValue) {
  const date = dateOnly(chicagoToday(now));
  const boardDay = await db.boardDay.upsert({ where: { date }, update: {}, create: { date }, select: { id: true } });
  await db.activityEvent.create({ data: { boardDayId: boardDay.id, actorUserId: actorId, eventType: "COLLECTIONS_SUMMARY", message, metadata: { organizationId, ...(metadata as object) } } });
}

/** Run every automation step for one organization. */
export async function runCollectionsAutomations(
  organizationId: string,
  options: { trigger: AutomationTrigger; now?: Date; actorId?: string | null; importRunId?: string | null; settings?: CollectionsSettings }
): Promise<AutomationResult> {
  const now = options.now ?? new Date();
  const settings = options.settings ?? (await loadCollectionsSettings(organizationId));
  const clock = chicagoClock(now);
  const today = clock.ymd;
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collections-automation:${organizationId}`}))`;
    const recalculated = (await recalculateAccounts(tx, organizationId, settings)).changed;
    const resolution = await resolveOutcomes(tx, organizationId, settings, today);
    const tasks = await syncCollectionTasks(tx, organizationId, settings, { now, fallbackUserId: options.actorId });
    if (messageStep) await messageStep(tx, organizationId, settings, now);
    const reminderDue = isDailyRunDue(clock, timeToMinutes(settings.importReminderTime));
    const reminder = await syncImportReminder(tx, organizationId, { now, due: reminderDue, fallbackUserId: options.actorId });
    await writeDailyMetric(tx, organizationId, settings, now, options.importRunId);

    const somethingNew = tasks.createdTotal > 0 || resolution.promisesBroken > 0 || resolution.promisesKept > 0 || resolution.reportedNotFound > 0;
    let summaryPosted = false;
    if (somethingNew) {
      await postSummary(tx, now, options.actorId ?? null, organizationId, summaryMessage(tasks.created, resolution), { source: "COLLECTIONS", trigger: options.trigger, tasksCreated: tasks.created, tasksClosed: tasks.closed, promisesBroken: resolution.promisesBroken, promisesKept: resolution.promisesKept });
      summaryPosted = true;
    }
    if (options.trigger === "DAILY") {
      await tx.collectionAccountEvent.create({ data: { organizationId, type: "DAILY_AUTOMATION_RUN", reason: today, after: { tasksCreated: tasks.createdTotal, tasksClosed: tasks.closed, reminderCreated: reminder.created } } });
    }
    return { trigger: options.trigger, recalculated, resolution, tasks, reminder, summaryPosted };
  }, { timeout: 120_000, maxWait: 20_000 });
}

/**
 * Called by the scheduled job (every 15 minutes is fine). For each organization using Collections:
 *  - Mon–Sat after the automation time, runs the full automations once per day;
 *  - Mon–Sat after the reminder time, creates the import reminder if nothing was imported.
 * Does nothing at all when COLLECTIONS_MODULE is OFF.
 */
export async function runScheduledCollections(now = new Date()) {
  const mode = resolveCollectionsMode();
  if (mode === "OFF") return { mode, ran: [] as Array<{ organizationId: string; action: string }> };
  const clock = chicagoClock(now);
  const organizations = await prisma.collectionsSetting.findMany({ select: { organizationId: true } });
  const ran: Array<{ organizationId: string; action: string; error?: string }> = [];
  for (const { organizationId } of organizations) {
    try {
      const settings = await loadCollectionsSettings(organizationId);
      const dailyDue = isDailyRunDue(clock, timeToMinutes(settings.automationRunTime));
      const reminderDue = isDailyRunDue(clock, timeToMinutes(settings.importReminderTime));
      const alreadyRan = dailyDue && (await prisma.collectionAccountEvent.findFirst({ where: { organizationId, type: "DAILY_AUTOMATION_RUN", reason: clock.ymd }, select: { id: true } }));
      if (dailyDue && !alreadyRan) {
        await runCollectionsAutomations(organizationId, { trigger: "DAILY", now, settings });
        ran.push({ organizationId, action: "DAILY" });
      } else if (reminderDue) {
        const reminder = await prisma.$transaction(async tx => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collections-automation:${organizationId}`}))`;
          return syncImportReminder(tx, organizationId, { now, due: true });
        });
        ran.push({ organizationId, action: reminder.created ? "REMINDER_CREATED" : "REMINDER_CHECKED" });
      }
    } catch (error) {
      // One organization failing must not stop the others; the next run retries.
      ran.push({ organizationId, action: "FAILED", error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return { mode, ran };
}
