/**
 * Creates and closes Collections tasks on the dispatch board (spec section 7, step 4).
 *
 * - One open task per account per reason (CollectionTaskLink.openKey is unique).
 * - A task is created only once per occurrence of its reason (see domain/tasks.ts).
 * - When the reason goes away (for example a later import shows the account caught up),
 *   the task is closed with a note. A task a person completes on the board is respected.
 * - Tasks go to the account's collector, or to the Collections admin when none is set.
 */
import type { Prisma, RepossessionCaseStatus, TaskTemplatePriority } from "@prisma/client";

import { COLLECTIONS_ADMIN_DUTY, COLLECTIONS_ADMIN_ROLE_NAMES } from "../config/permissions";
import { chicagoDateTime, chicagoToday, dateOnly, toYmd } from "../domain/money-dates";
import type { CollectionsSettings } from "../domain/settings";
import { effectiveInsuranceStatus, TASK_REASON_INFO, TASK_REASONS, wantedAccountTasks, type AccountTaskFacts, type TaskReason, type WantedTask } from "../domain/tasks";

type Db = Prisma.TransactionClient;

const OPEN_REPO: RepossessionCaseStatus[] = ["REVIEW", "APPROVED", "ASSIGNED", "LOCATED"];
const REPOSSESSED_REPO: RepossessionCaseStatus[] = ["RECOVERED", "IN_STORAGE", "SENT_TO_AUCTION", "RETURNED_TO_INVENTORY"];

const MANAGED_REASONS = new Set<string>(TASK_REASONS);

export type TaskSyncResult = { created: Partial<Record<TaskReason, number>>; createdTotal: number; closed: number; completedByStaff: number; skippedNoAssignee: number };

export function openKeyFor(organizationId: string, accountId: string | null, reason: TaskReason, extra = "") {
  return `${organizationId}:${accountId ?? "org"}:${reason}${extra ? `:${extra}` : ""}`;
}

/** The Collections admin who receives tasks when an account has no collector. */
export async function findCollectionsAdminUserId(db: Db, organizationId: string, preferredUserId?: string | null) {
  const now = new Date();
  const users = await db.user.findMany({
    where: {
      isActive: true,
      appointmentLocationAccess: { some: { location: { organizationId }, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] } },
      OR: [
        { userRoles: { some: { role: { name: { in: [...COLLECTIONS_ADMIN_ROLE_NAMES] } } } } },
        { userDuties: { some: { duty: { name: { contains: COLLECTIONS_ADMIN_DUTY, mode: "insensitive" } } } } }
      ]
    },
    select: { id: true, userRoles: { select: { role: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" }
  });
  if (preferredUserId && users.some(user => user.id === preferredUserId)) return preferredUserId;
  const manager = users.find(user => user.userRoles.some(r => r.role.name === "Collections Manager"));
  return manager?.id ?? users[0]?.id ?? preferredUserId ?? null;
}

async function boardDayFor(db: Db, ymd: string) {
  const date = dateOnly(ymd);
  return db.boardDay.upsert({ where: { date }, update: {}, create: { date }, select: { id: true } });
}

/** Load everything wantedAccountTasks needs, for every account (or the given ones). */
async function loadTaskFacts(db: Db, organizationId: string, settings: CollectionsSettings, today: string, accountIds?: string[]) {
  const scope = { organizationId, ...(accountIds ? { accountId: { in: accountIds } } : {}) };
  const accounts = await db.collectionAccount.findMany({
    where: { organizationId, ...(accountIds ? { id: { in: accountIds } } : {}) },
    select: { id: true, buyerNameRaw: true, dealNumber: true, stockNumberRaw: true, vehicleDescriptionRaw: true, daysPastDue: true, status: true, closedStatus: true, archivedAt: true, assignedCollectorUserId: true, customerId: true, vehicleId: true, customer: { select: { displayName: true } } }
  });
  const ids = accounts.map(a => a.id);
  const t = settings.thresholds;
  const [flags, broken, promisesOpen, plans, reported, starter, repos, insurance, snaps] = await Promise.all([
    db.collectionFlag.findMany({ where: { ...scope, clearedAt: null }, select: { accountId: true, type: true, setAt: true } }),
    db.paymentPromise.findMany({ where: { ...scope, status: { in: ["BROKEN", "PARTIALLY_KEPT"] }, resolvedAt: { not: null } }, orderBy: { resolvedAt: "desc" }, select: { accountId: true, resolvedAt: true } }),
    db.paymentPromise.findMany({ where: { ...scope, status: { notIn: ["CANCELLED", "SUPERSEDED"] } }, select: { accountId: true, status: true, createdAt: true } }),
    db.paymentPlan.findMany({ where: { ...scope, status: { not: "CANCELLED" } }, select: { accountId: true, status: true, createdAt: true } }),
    db.customerReportedPayment.findMany({ where: { ...scope, status: { not: "CANCELLED" } }, select: { accountId: true, status: true, createdAt: true, resolvedAt: true } }),
    db.starterDisableAction.findMany({ where: { ...scope, status: "DONE_IN_PORTAL" }, orderBy: [{ performedInPortalAt: "desc" }, { updatedAt: "desc" }], select: { accountId: true, action: true, performedInPortalAt: true, updatedAt: true } }),
    db.repossessionCase.findMany({ where: { ...scope, status: { in: [...OPEN_REPO, ...REPOSSESSED_REPO, "REDEEMED"] } }, orderBy: { createdAt: "desc" }, select: { accountId: true, status: true, assignedAt: true, createdAt: true, outcomeAt: true } }),
    db.insuranceRecord.findMany({ where: scope, orderBy: { createdAt: "desc" }, select: { accountId: true, status: true, expirationDate: true, createdAt: true } }),
    db.collectionAccountSnapshot.findMany({ where: { accountId: { in: ids.length ? ids : ["-"] }, account: { daysPastDue: { gte: Math.min(t.disableReview, t.followUp, t.review30, t.repoReview) } } }, select: { accountId: true, asOfDate: true, daysPastDue: true } })
  ]);

  const first = <T extends { accountId: string }>(rows: T[]) => { const m = new Map<string, T>(); for (const r of rows) if (!m.has(r.accountId)) m.set(r.accountId, r); return m; };
  const group = <T extends { accountId: string }>(rows: T[]) => { const m = new Map<string, T[]>(); for (const r of rows) m.set(r.accountId, [...(m.get(r.accountId) ?? []), r]); return m; };
  const latestBroken = first(broken), starterBy = first(starter), repoBy = first(repos.filter(r => r.status !== "REDEEMED")), insuranceBy = first(insurance);
  const redeemedBy = first(repos.filter(r => r.status === "REDEEMED"));
  const flagsBy = group(flags), promisesBy = group(promisesOpen), plansBy = group(plans), reportedBy = group(reported), snapsBy = group(snaps);
  const latest = (dates: Array<Date | null | undefined>) => dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);

  return accounts.map(account => {
    const accountFlags = flagsBy.get(account.id) ?? [];
    const lastBrokenAt = latestBroken.get(account.id)?.resolvedAt ?? null;
    const accountPromises = promisesBy.get(account.id) ?? [];
    const accountPlans = plansBy.get(account.id) ?? [];
    const accountReported = reportedBy.get(account.id) ?? [];
    const repo = repoBy.get(account.id);
    const ins = insuranceBy.get(account.id);
    const s = starterBy.get(account.id);
    const accountSnaps = snapsBy.get(account.id) ?? [];
    const lastBelow = (threshold: number) => latest(accountSnaps.filter(x => x.daysPastDue < threshold).map(x => x.asOfDate));
    const facts: AccountTaskFacts = {
      daysPastDue: account.daysPastDue,
      inactive: Boolean(account.closedStatus || account.archivedAt || account.status === "REPOSSESSED" || (repo && REPOSSESSED_REPO.includes(repo.status))),
      activeFlags: accountFlags.map(f => f.type),
      bankruptcyFlaggedAt: latest(accountFlags.filter(f => f.type === "BANKRUPTCY").map(f => f.setAt)),
      lastBrokenAt,
      arrangementAfterBroken: Boolean(lastBrokenAt) && (accountPromises.some(p => p.status === "OPEN" && p.createdAt > lastBrokenAt!) || accountPlans.some(p => p.status === "ACTIVE" && p.createdAt > lastBrokenAt!)),
      lastNotFoundAt: latest(accountReported.filter(r => r.status === "NOT_FOUND").map(r => r.resolvedAt)),
      starter: s ? { action: s.action, at: s.performedInPortalAt ?? s.updatedAt } : null,
      lastArrangementAt: latest([...accountPromises.map(p => p.createdAt), ...accountPlans.map(p => p.createdAt), ...accountReported.map(r => r.createdAt)]),
      repo: repo && OPEN_REPO.includes(repo.status) ? { status: repo.status, since: repo.assignedAt ?? repo.createdAt } : null,
      redeemedAt: redeemedBy.get(account.id)?.outcomeAt ?? null,
      insurance: ins ? { status: effectiveInsuranceStatus({ status: ins.status, expirationDate: toYmd(ins.expirationDate) }, today, settings.insuranceExpiringSoonDays), since: ins.createdAt } : null,
      belowThresholdSince: { disable: lastBelow(t.disableReview), twoWeek: lastBelow(t.followUp), thirtyDay: lastBelow(t.review30), repo: lastBelow(t.repoReview) }
    };
    return { account, wanted: wantedAccountTasks(facts, settings) };
  });
}

async function closeLink(db: Db, link: { id: string; taskId: string; task: { status: string; boardDayId: string } }, note: string, now: Date) {
  await db.collectionTaskLink.update({ where: { id: link.id }, data: { status: "CLOSED", openKey: null, closedAt: now, closeNote: note } });
  if (link.task.status !== "COMPLETED") {
    await db.task.update({ where: { id: link.taskId }, data: { status: "COMPLETED", completedAt: now } });
    await db.activityEvent.create({ data: { boardDayId: link.task.boardDayId, taskId: link.taskId, eventType: "STATUS_CHANGED", message: `Collections closed this task automatically: ${note}`, metadata: { source: "COLLECTIONS", automatic: true, to: "COMPLETED" } } });
  }
}

function dueAtFor(priority: TaskTemplatePriority, today: string) {
  return chicagoDateTime(today, priority === "CRITICAL" ? "12:00" : "17:00");
}

/**
 * Bring the dispatch board in line with what each account needs today.
 * Safe to run any number of times.
 */
export async function syncCollectionTasks(
  db: Db,
  organizationId: string,
  settings: CollectionsSettings,
  options: { now?: Date; accountIds?: string[]; fallbackUserId?: string | null } = {}
): Promise<TaskSyncResult> {
  const now = options.now ?? new Date();
  const today = chicagoToday(now);
  const result: TaskSyncResult = { created: {}, createdTotal: 0, closed: 0, completedByStaff: 0, skippedNoAssignee: 0 };
  const rows = await loadTaskFacts(db, organizationId, settings, today, options.accountIds);
  if (!rows.length) return result;
  const accountIds = rows.map(r => r.account.id);
  const links = await db.collectionTaskLink.findMany({
    where: { organizationId, accountId: { in: accountIds } },
    select: { id: true, accountId: true, reason: true, status: true, createdAt: true, taskId: true, task: { select: { status: true, boardDayId: true } } }
  });
  const linksBy = new Map<string, typeof links>();
  for (const link of links) linksBy.set(link.accountId!, [...(linksBy.get(link.accountId!) ?? []), link]);

  const collectorIds = [...new Set(rows.map(r => r.account.assignedCollectorUserId).filter((id): id is string => Boolean(id)))];
  const activeCollectors = new Set((await db.user.findMany({ where: { id: { in: collectorIds }, isActive: true }, select: { id: true } })).map(u => u.id));
  let fallback: string | null | undefined;
  let boardDayId: string | null = null;

  for (const { account, wanted } of rows) {
    const accountLinks = linksBy.get(account.id) ?? [];
    const wantedBy = new Map<TaskReason, WantedTask>(wanted.map(w => [w.reason, w]));

    // Close open links whose reason is gone, or that a person already completed.
    // Only reasons this sync manages; one-off tasks (for example "post in DealerCenter") are closed by their own workflow.
    for (const link of accountLinks.filter(l => l.status === "OPEN" && MANAGED_REASONS.has(l.reason))) {
      const reason = link.reason as TaskReason;
      if (link.task.status === "COMPLETED") {
        await db.collectionTaskLink.update({ where: { id: link.id }, data: { status: "CLOSED", openKey: null, closedAt: now, closeNote: "Completed on the dispatch board." } });
        result.completedByStaff += 1;
        link.status = "CLOSED";
      } else if (!wantedBy.has(reason)) {
        await closeLink(db, link, TASK_REASON_INFO[reason]?.closedNote ?? "The reason no longer applies.", now);
        result.closed += 1;
        link.status = "CLOSED";
      }
    }

    for (const want of wanted) {
      const already = accountLinks.some(l => l.reason === want.reason && (l.status === "OPEN" || !want.since || l.createdAt >= want.since));
      if (already) continue;
      let assignee = account.assignedCollectorUserId && activeCollectors.has(account.assignedCollectorUserId) ? account.assignedCollectorUserId : null;
      if (!assignee) {
        if (fallback === undefined) fallback = await findCollectionsAdminUserId(db, organizationId, options.fallbackUserId);
        assignee = fallback;
      }
      if (!assignee) { result.skippedNoAssignee += 1; continue; }
      boardDayId ??= (await boardDayFor(db, today)).id;
      const info = TASK_REASON_INFO[want.reason];
      const name = account.customer?.displayName ?? account.buyerNameRaw;
      const task = await db.task.create({
        data: {
          boardDayId,
          title: `${info.title}: ${name}${account.dealNumber ? ` (deal ${account.dealNumber})` : ""}`,
          description: `${info.why}\nOpen the account: /collections/accounts/${account.id}`,
          assignedUserId: assignee,
          priority: info.priority,
          dueAt: dueAtFor(info.priority, today),
          sourceType: "COLLECTIONS",
          workflowArea: "COLLECTIONS",
          customerId: account.customerId,
          vehicleId: account.vehicleId,
          customerReference: name,
          vehicleReference: account.stockNumberRaw ?? account.vehicleDescriptionRaw,
          templateSnapshot: { source: "COLLECTIONS", reason: want.reason, accountId: account.id }
        },
        select: { id: true }
      });
      await db.collectionTaskLink.create({ data: { organizationId, accountId: account.id, reason: want.reason, taskId: task.id, openKey: openKeyFor(organizationId, account.id, want.reason) } });
      // The repo case keeps a link to its board task, so status updates are posted there.
      if (want.reason === "REPO_TLC") await db.repossessionCase.updateMany({ where: { accountId: account.id, status: { in: ["ASSIGNED", "LOCATED"] } }, data: { taskId: task.id } });
      accountLinks.push({ id: "new", accountId: account.id, reason: want.reason, status: "OPEN", createdAt: now, taskId: task.id, task: { status: "NOT_STARTED", boardDayId } });
      result.created[want.reason] = (result.created[want.reason] ?? 0) + 1;
      result.createdTotal += 1;
    }
  }
  return result;
}

/**
 * "Import DealerCenter accounts" reminder (spec section 7, step 7): one task per day for the
 * Collections admin when nothing was imported by the reminder time; closed once a file is imported.
 */
export async function syncImportReminder(db: Db, organizationId: string, options: { now?: Date; due: boolean; fallbackUserId?: string | null }) {
  const now = options.now ?? new Date();
  const today = chicagoToday(now);
  const key = openKeyFor(organizationId, null, "IMPORT_REMINDER", today);
  const lastImport = await db.collectionsImportRun.findFirst({ where: { organizationId, status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { committedAt: true } });
  const importedToday = Boolean(lastImport?.committedAt && chicagoToday(lastImport.committedAt) === today);
  const open = await db.collectionTaskLink.findMany({ where: { organizationId, accountId: null, reason: "IMPORT_REMINDER", status: "OPEN" }, select: { id: true, taskId: true, openKey: true, task: { select: { status: true, boardDayId: true } } } });
  let closed = 0;
  for (const link of open) {
    // Close today's reminder once imported; close older days' reminders too (a new day gets its own).
    if (importedToday || link.openKey !== key || link.task.status === "COMPLETED") {
      await closeLink(db, link, link.openKey !== key ? "A new day's reminder replaces this one." : TASK_REASON_INFO.IMPORT_REMINDER.closedNote, now);
      closed += 1;
    }
  }
  if (importedToday || !options.due) return { created: false, closed, importedToday };
  const existing = await db.collectionTaskLink.findFirst({ where: { organizationId, reason: "IMPORT_REMINDER", OR: [{ openKey: key }, { createdAt: { gte: chicagoDateTime(today, "00:00") } }] }, select: { id: true } });
  if (existing) return { created: false, closed, importedToday };
  const assignee = await findCollectionsAdminUserId(db, organizationId, options.fallbackUserId);
  if (!assignee) return { created: false, closed, importedToday };
  const boardDay = await boardDayFor(db, today);
  const info = TASK_REASON_INFO.IMPORT_REMINDER;
  const task = await db.task.create({
    data: {
      boardDayId: boardDay.id, title: info.title, description: `${info.why}\nIn DealerCenter, export Active Accounts, then upload it at /collections/import.`,
      assignedUserId: assignee, priority: info.priority, dueAt: chicagoDateTime(today, "12:00"), sourceType: "COLLECTIONS", workflowArea: "COLLECTIONS",
      templateSnapshot: { source: "COLLECTIONS", reason: "IMPORT_REMINDER", date: today }
    },
    select: { id: true }
  });
  await db.collectionTaskLink.create({ data: { organizationId, accountId: null, reason: "IMPORT_REMINDER", taskId: task.id, openKey: key } });
  return { created: true, closed, importedToday };
}

/**
 * One-off follow-up tasks created by a person's decision (for example "Post this extension in
 * DealerCenter"). One open task per key; closed by the workflow that created it.
 */
export async function openFollowUpTask(db: Db, input: { organizationId: string; accountId: string; key: string; reason: string; title: string; description: string; assignedUserId: string; priority?: TaskTemplatePriority }) {
  const openKey = `${input.organizationId}:${input.accountId}:${input.reason}:${input.key}`;
  const existing = await db.collectionTaskLink.findUnique({ where: { openKey }, select: { taskId: true } });
  if (existing) return existing.taskId;
  const today = chicagoToday();
  const boardDay = await boardDayFor(db, today);
  const priority = input.priority ?? "HIGH";
  const account = await db.collectionAccount.findUnique({ where: { id: input.accountId }, select: { customerId: true, vehicleId: true, stockNumberRaw: true, buyerNameRaw: true } });
  const task = await db.task.create({ data: {
    boardDayId: boardDay.id, title: input.title, description: `${input.description}
Open the account: /collections/accounts/${input.accountId}`, assignedUserId: input.assignedUserId, createdByUserId: input.assignedUserId,
    priority, dueAt: dueAtFor(priority, today), sourceType: "COLLECTIONS", workflowArea: "COLLECTIONS", customerId: account?.customerId ?? null, vehicleId: account?.vehicleId ?? null,
    customerReference: account?.buyerNameRaw ?? null, vehicleReference: account?.stockNumberRaw ?? null, templateSnapshot: { source: "COLLECTIONS", reason: input.reason, key: input.key, accountId: input.accountId }
  }, select: { id: true } });
  await db.collectionTaskLink.create({ data: { organizationId: input.organizationId, accountId: input.accountId, reason: input.reason, taskId: task.id, openKey } });
  return task.id;
}

export async function closeFollowUpTask(db: Db, input: { organizationId: string; accountId: string; key: string; reason: string; note: string }) {
  const openKey = `${input.organizationId}:${input.accountId}:${input.reason}:${input.key}`;
  const link = await db.collectionTaskLink.findUnique({ where: { openKey }, select: { id: true, taskId: true, task: { select: { status: true, boardDayId: true } } } });
  if (link) await closeLink(db, link, input.note, new Date());
  return Boolean(link);
}
