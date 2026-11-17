/**
 * Collections home page: what needs attention today, in one place.
 * Read-only: it only gathers counts and short lists; every action happens on the
 * account, queue or approvals pages with their usual permission checks.
 */
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { hasCollectionsPermission } from "../config/permissions";
import { addDays, chicagoClock, chicagoDateTime, chicagoToday, maskPhone, timeToMinutes, toYmd } from "../domain/money-dates";
import { buildQueue, queueReason, queueSummary } from "../domain/queue";
import { BUCKET_LABELS, BUCKETS } from "../domain/status";
import { keepRate } from "./dashboard-service";
import { collectionsAccess } from "./access";
import { loadQueueFacts, visibilityWhere } from "./account-service";
import { loadCollectionsSettings } from "./settings-store";

export type CheckState = "done" | "waiting" | "problem";

export async function getHome(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "VIEW");
  const org = access.organizationId;
  const isAdmin = access.role === "ADMIN";
  const settings = await loadCollectionsSettings(org);
  const now = new Date();
  const clock = chicagoClock(now);
  const today = clock.ymd;
  const visible = await visibilityWhere(access);
  const facts = await loadQueueFacts(access);
  const mine = isAdmin ? facts : facts.filter(f => f.assignedCollectorUserId === access.actor.id || !f.assignedCollectorUserId);
  const queue = buildQueue(mine, { tab: "PAST_DUE" });
  const summary = queueSummary(mine, today);
  const since30 = chicagoDateTime(addDays(today, -30), "00:00");

  const [lastImport, dailyRun, openTasks, recon, promises30, inbound, unreadCount] = await Promise.all([
    prisma.collectionsImportRun.findFirst({ where: { organizationId: org, status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { committedAt: true, asOfDate: true } }),
    prisma.collectionAccountEvent.findFirst({ where: { organizationId: org, type: "DAILY_AUTOMATION_RUN", reason: today }, select: { occurredAt: true } }),
    prisma.collectionTaskLink.count({ where: { organizationId: org, status: "OPEN" } }),
    prisma.collectionAccountEvent.findFirst({ where: { organizationId: org, type: "RECONCILIATION_SUMMARY" }, orderBy: { occurredAt: "desc" }, select: { after: true } }),
    prisma.paymentPromise.findMany({ where: { organizationId: org, account: visible, resolvedAt: { gte: since30 }, status: { in: ["KEPT", "PARTIALLY_KEPT", "BROKEN"] } }, select: { status: true } }),
    prisma.inboundMessage.findMany({ where: { organizationId: org, readAt: null, ...(Object.keys(visible).length ? { OR: [{ accountId: null }, { account: { is: visible } }] } : {}) }, orderBy: { receivedAt: "desc" }, take: 4, select: { id: true, accountId: true, from: true, body: true, receivedAt: true, mediaDocumentIds: true, account: { select: { buyerNameRaw: true } } } }),
    prisma.inboundMessage.count({ where: { organizationId: org, readAt: null, ...(Object.keys(visible).length ? { OR: [{ accountId: null }, { account: { is: visible } }] } : {}) } })
  ]);

  const importedToday = Boolean(lastImport?.committedAt && chicagoToday(lastImport.committedAt) === today);
  const reminderPassed = clock.minutes >= timeToMinutes(settings.importReminderTime) && clock.weekday >= 1 && clock.weekday <= 6;
  const runDue = clock.minutes >= timeToMinutes(settings.automationRunTime) && clock.weekday >= 1 && clock.weekday <= 6;
  const reconSummary = recon?.after as { differences?: number; accounts?: number; date?: string } | undefined;
  const checklist: Array<{ key: string; state: CheckState; text: string; href?: string }> = [
    importedToday
      ? { key: "import", state: "done", text: `DealerCenter file imported ${new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(lastImport!.committedAt!)}` }
      : { key: "import", state: reminderPassed ? "problem" : "waiting", text: reminderPassed ? "Today's DealerCenter file isn't imported yet" : "Import today's DealerCenter file", href: "/collections/import" },
    dailyRun || importedToday
      ? { key: "automation", state: "done", text: "Follow-ups and reminders are up to date" }
      : { key: "automation", state: runDue ? "problem" : "waiting", text: runDue ? "The morning automations haven't run yet" : `Morning automations run at ${settings.automationRunTime}` },
    { key: "tasks", state: "done", text: `${openTasks} Collections task${openTasks === 1 ? "" : "s"} on the dispatch board` },
    ...(reconSummary && reconSummary.accounts ? [{ key: "recon", state: (reconSummary.differences ? "problem" : "done") as CheckState, text: reconSummary.differences ? `${reconSummary.differences} account${reconSummary.differences === 1 ? "" : "s"} differ from DealerCenter` : "Every ledger account matches DealerCenter", href: "/collections/reconciliation" }] : [])
  ];

  // Decisions: admins see what's waiting for them; collectors see the status of what they asked for.
  const whose = isAdmin ? {} : { requestedByUserId: access.actor.id };
  const [starter, repo, extensions, adjustments, chargeOffs, skips] = await Promise.all([
    prisma.starterDisableAction.count({ where: { organizationId: org, status: "REQUESTED", ...whose } }),
    prisma.repossessionCase.count({ where: { organizationId: org, status: "REVIEW", ...(isAdmin ? {} : { openedByUserId: access.actor.id }) } }),
    prisma.extensionRequest.count({ where: { organizationId: org, status: "REQUESTED", ...whose } }),
    prisma.accountAdjustment.count({ where: { organizationId: org, status: "PENDING_APPROVAL", ...(isAdmin ? {} : { enteredByUserId: access.actor.id }) } }),
    prisma.collectionChargeOff.count({ where: { organizationId: org, status: "REQUESTED", ...whose } }),
    prisma.collectionSkipAlert.count({ where: { organizationId: org, status: "OPEN", account: visible } })
  ]);
  const decisions = [
    { key: "starter", label: "Starter disable requests", count: starter },
    { key: "repo", label: "Repo reviews to approve", count: repo },
    { key: "extensions", label: "Extension requests", count: extensions },
    { key: "adjustments", label: "Fees and credits", count: adjustments },
    { key: "chargeoffs", label: "Charge-off requests", count: chargeOffs },
    { key: "skips", label: "Possible skips to confirm", count: skips }
  ];

  const buckets = BUCKETS.map(b => ({ bucket: b, label: BUCKET_LABELS[b], count: facts.filter(f => f.bucket === b).length }));
  const kept = promises30.filter(p => p.status === "KEPT").length;

  return {
    firstName: access.actor.name.split(/\s+/)[0] ?? access.actor.name,
    isAdmin,
    greeting: clock.minutes < 12 * 60 ? "Good morning" : clock.minutes < 17 * 60 ? "Good afternoon" : "Good evening",
    dateLabel: new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric" }).format(now),
    dataAsOf: toYmd(lastImport?.asOfDate ?? null),
    checklist,
    summary,
    keepRatePercent: keepRate(kept, promises30.filter(p => p.status === "PARTIALLY_KEPT").length, promises30.filter(p => p.status === "BROKEN").length),
    callFirst: queue.rows.slice(0, 6).map(r => ({ id: r.id, name: r.buyerName, daysPastDue: r.daysPastDue, amountDueCents: r.amountDueCents, reason: queueReason(r, today) })),
    firstAccountId: queue.rows[0]?.id ?? null,
    toCall: queue.rows.length,
    decisions,
    decisionsTotal: decisions.reduce((s, d) => s + d.count, 0),
    inbox: inbound.map(m => ({ id: m.id, accountId: m.accountId, who: m.account?.buyerNameRaw ?? `Unknown ${maskPhone(m.from)}`, text: Array.isArray(m.mediaDocumentIds) && m.mediaDocumentIds.length && !m.body.trim() ? "Photo attached" : m.body.slice(0, 80), at: m.receivedAt.toISOString() })),
    unreadCount,
    buckets,
    links: [
      { href: "/collections/accounts", label: "Find an account", show: true },
      { href: "/collections/dashboard", label: "Dashboard", show: hasCollectionsPermission(access.actor, "VIEW_DASHBOARD") },
      { href: "/collections/reconciliation", label: "Reconciliation", show: hasCollectionsPermission(access.actor, "VIEW_DASHBOARD") },
      { href: "/collections/import", label: "Import", show: hasCollectionsPermission(access.actor, "IMPORT") },
      { href: "/collections/playbook", label: "Playbook", show: hasCollectionsPermission(access.actor, "EDIT_SETTINGS") },
      { href: "/collections/settings", label: "Settings", show: hasCollectionsPermission(access.actor, "EDIT_SETTINGS") }
    ].filter(l => l.show)
  };
}

/** Approvals page: every pending decision, with a link to the account section where it's decided. */
export async function getApprovals(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "VIEW");
  const org = access.organizationId;
  const isAdmin = access.role === "ADMIN";
  const visible = await visibilityWhere(access);
  const acct = { select: { id: true, buyerNameRaw: true, dealNumber: true, daysPastDue: true } } as const;
  const [starter, repo, extensions, adjustments, chargeOffs, skips] = await Promise.all([
    prisma.starterDisableAction.findMany({ where: { organizationId: org, status: { in: ["REQUESTED", "APPROVED"] }, account: visible, ...(isAdmin ? {} : { requestedByUserId: access.actor.id }) }, orderBy: { requestedAt: "asc" }, select: { id: true, action: true, status: true, reason: true, requestedAt: true, account: acct } }),
    prisma.repossessionCase.findMany({ where: { organizationId: org, status: { in: ["REVIEW", "APPROVED"] }, account: visible, ...(isAdmin ? {} : { openedByUserId: access.actor.id }) }, orderBy: { createdAt: "asc" }, select: { id: true, status: true, createdAt: true, account: acct } }),
    prisma.extensionRequest.findMany({ where: { organizationId: org, status: { in: ["REQUESTED", "APPROVED"] }, account: visible, ...(isAdmin ? {} : { requestedByUserId: access.actor.id }) }, orderBy: { createdAt: "asc" }, select: { id: true, type: true, status: true, requestedTerms: true, eligible: true, createdAt: true, account: acct } }),
    prisma.accountAdjustment.findMany({ where: { organizationId: org, status: { in: ["PENDING_APPROVAL", "APPROVED", "NOT_FOUND_IN_IMPORT"] }, account: visible, ...(isAdmin ? {} : { enteredByUserId: access.actor.id }) }, orderBy: { createdAt: "asc" }, select: { id: true, type: true, status: true, amountCents: true, reason: true, createdAt: true, account: acct } }),
    prisma.collectionChargeOff.findMany({ where: { organizationId: org, status: "REQUESTED", account: visible, ...(isAdmin ? {} : { requestedByUserId: access.actor.id }) }, orderBy: { createdAt: "asc" }, select: { id: true, amountCents: true, reason: true, createdAt: true, account: acct } }),
    prisma.collectionSkipAlert.findMany({ where: { organizationId: org, status: "OPEN", account: visible }, orderBy: { raisedAt: "asc" }, select: { id: true, reasons: true, raisedAt: true, account: acct } })
  ]);
  const row = (kind: string, view: string, a: { id: string; buyerNameRaw: string; dealNumber: string | null; daysPastDue: number }, what: string, status: string, at: Date, amountCents?: number) =>
    ({ kind, href: `/collections/accounts/${a.id}?view=${view}`, name: a.buyerNameRaw, deal: a.dealNumber, daysPastDue: a.daysPastDue, what, status, at: at.toISOString(), amountCents: amountCents ?? null });
  const items = [
    ...starter.map(s => row(s.action === "DISABLE" ? "Starter disable" : "Starter re-enable", "recovery", s.account, s.reason, s.status === "APPROVED" ? "Approved: do it in the portal" : "Waiting for approval", s.requestedAt)),
    ...repo.map(r => row("Repossession", "recovery", r.account, "Repo review", r.status === "APPROVED" ? "Approved: assign to TLC" : "Waiting for approval", r.createdAt)),
    ...extensions.map(e => row(e.type === "DUE_DATE_CHANGE" ? "Due-date change" : e.type === "DEFERRAL" ? "Deferral" : "Extension", "promises", e.account, `${e.requestedTerms}${e.eligible ? "" : " (doesn't meet the rules)"}`, e.status === "APPROVED" ? "Approved: post in DealerCenter" : "Waiting for approval", e.createdAt)),
    ...adjustments.map(a => row(a.type.endsWith("FEE") ? "Fee" : "Credit", "promises", a.account, a.reason, a.status === "PENDING_APPROVAL" ? "Waiting for approval" : a.status === "APPROVED" ? "Approved: post in DealerCenter" : "Not found in DealerCenter", a.createdAt, a.amountCents)),
    ...chargeOffs.map(c => row("Charge-off", "recovery", c.account, c.reason, "Waiting for approval", c.createdAt, c.amountCents)),
    ...skips.map(s => row("Possible skip", "recovery", s.account, (s.reasons as string[]).join("; "), "Confirm or dismiss", s.raisedAt))
  ].sort((a, b) => a.at.localeCompare(b.at));
  return { isAdmin, items };
}
