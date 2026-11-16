/**
 * Collections dashboard (spec section 13): tiles, past due by bucket, promise results,
 * weekly trends (from CollectionsDailyMetric) and activity per collector.
 * Every table can be downloaded as CSV.
 */
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { addDays, chicagoDateTime, chicagoToday, toYmd } from "../domain/money-dates";
import { BUCKET_LABELS, BUCKETS, bucketFor, type Bucket } from "../domain/status";
import { effectiveInsuranceStatus } from "../domain/tasks";
import { collectionsAccess } from "./access";
import { csvCell, visibilityWhere } from "./account-service";
import { loadCollectionsSettings } from "./settings-store";

export type PromiseWindow = { days: number; made: number; kept: number; partial: number; broken: number; keepRate: number | null };

/** Keep rate = kept / (kept + partly kept + broken); null when nothing was resolved. */
export function keepRate(kept: number, partial: number, broken: number) {
  const resolved = kept + partial + broken;
  return resolved ? Math.round((kept / resolved) * 1000) / 10 : null;
}

/** One point per week: the latest daily metric in each Monday-based week. */
export function weeklyTrend(metrics: Array<{ metricDate: Date; totalAccounts: number; pastDueAccounts: number; pastDueAmountCents: number; bucketCounts: unknown }>) {
  const byWeek = new Map<string, (typeof metrics)[number]>();
  for (const m of [...metrics].sort((a, b) => a.metricDate.getTime() - b.metricDate.getTime())) {
    const d = new Date(m.metricDate);
    const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    byWeek.set(monday.toISOString().slice(0, 10), m);
  }
  return [...byWeek.entries()].map(([week, m]) => {
    const counts = (m.bucketCounts && typeof m.bucketCounts === "object" ? m.bucketCounts : {}) as Record<string, number>;
    return { week, pastDuePercent: m.totalAccounts ? Math.round((m.pastDueAccounts / m.totalAccounts) * 1000) / 10 : 0, pastDueAmountCents: m.pastDueAmountCents, count31to60: counts.D31_60 ?? 0, count61plus: counts.D61_PLUS ?? 0 };
  });
}

export async function getDashboard(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "VIEW_DASHBOARD");
  const org = access.organizationId;
  const settings = await loadCollectionsSettings(org);
  const today = chicagoToday();
  const dayStart = chicagoDateTime(today, "00:00");
  const visible = await visibilityWhere(access);
  const since = (days: number) => chicagoDateTime(addDays(today, -days), "00:00");
  const [accounts, brokenToday, lastImport, metrics, contacts, messages, users, promiseRows] = await Promise.all([
    prisma.collectionAccount.findMany({
      where: { organizationId: org, closedStatus: null, archivedAt: null, ...visible },
      select: { id: true, status: true, bucket: true, daysPastDue: true, amountDueCents: true, totalBalanceCents: true,
        insuranceRecords: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, expirationDate: true } },
        snapshots: { orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], take: 1, select: { dmsInsuranceStatus: true } },
        repoCases: { where: { status: { in: ["REVIEW", "APPROVED", "ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE"] } }, select: { status: true } },
        inboundMessages: { where: { readAt: null }, select: { id: true } } }
    }),
    prisma.paymentPromise.count({ where: { organizationId: org, status: "BROKEN", resolvedAt: { gte: dayStart }, account: visible } }),
    prisma.collectionsImportRun.findFirst({ where: { organizationId: org, status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { committedAt: true, asOfDate: true, totalRows: true } }),
    prisma.collectionsDailyMetric.findMany({ where: { organizationId: org, metricDate: { gte: new Date(`${addDays(today, -7 * 13)}T00:00:00Z`) } }, orderBy: { metricDate: "asc" } }),
    prisma.collectionContactAttempt.findMany({ where: { organizationId: org, occurredAt: { gte: since(13) }, account: visible }, select: { occurredAt: true, userId: true } }),
    prisma.outboundMessage.findMany({ where: { organizationId: org, createdAt: { gte: since(13) }, sentByUserId: { not: null }, status: { not: "BLOCKED" }, account: visible }, select: { createdAt: true, sentByUserId: true } }),
    prisma.user.findMany({ where: { appointmentLocationAccess: { some: { location: { organizationId: org } } } }, select: { id: true, name: true } }),
    prisma.paymentPromise.findMany({ where: { organizationId: org, account: visible, OR: [{ createdAt: { gte: since(90) } }, { resolvedAt: { gte: since(90) } }] }, select: { createdAt: true, resolvedAt: true, status: true } })
  ]);

  const pastDue = accounts.filter(a => a.daysPastDue > 0);
  // Same rule as the queue's "Insurance problems" tab: the module's own record wins; with none on file, use DealerCenter's column.
  const insuranceProblems = accounts.filter(a => {
    const r = a.insuranceRecords[0];
    if (r) return ["EXPIRED", "MISSING", "EXPIRING_SOON"].includes(effectiveInsuranceStatus({ status: r.status, expirationDate: toYmd(r.expirationDate) }, today, settings.insuranceExpiringSoonDays));
    return ["EXPIRED", "MISSING", "CANCELLED", "LAPSED"].includes((a.snapshots[0]?.dmsInsuranceStatus ?? "").toUpperCase());
  }).length;
  const repo = (statuses: string[]) => accounts.filter(a => a.repoCases.some(c => statuses.includes(c.status))).length;
  const tiles = {
    totalAccounts: accounts.length,
    totalBalanceCents: accounts.reduce((s, a) => s + a.totalBalanceCents, 0),
    pastDueAccounts: pastDue.length,
    pastDueAmountCents: pastDue.reduce((s, a) => s + a.amountDueCents, 0),
    brokenPromisesToday: brokenToday,
    disableEligible: accounts.filter(a => a.status === "DISABLE_ELIGIBLE").length,
    starterDisabled: accounts.filter(a => a.status === "STARTER_DISABLED").length,
    repoReview: repo(["REVIEW", "APPROVED"]) + accounts.filter(a => a.status === "REPO_REVIEW" && !a.repoCases.length).length,
    repoAssigned: repo(["ASSIGNED", "LOCATED"]),
    repoInStorage: repo(["RECOVERED", "IN_STORAGE"]),
    insuranceProblems,
    unreadMessages: accounts.reduce((s, a) => s + a.inboundMessages.length, 0),
    lastImportAt: lastImport?.committedAt?.toISOString() ?? null,
    lastImportAsOf: toYmd(lastImport?.asOfDate ?? null)
  };

  const buckets = BUCKETS.map(b => {
    const rows = accounts.filter(a => a.bucket === b);
    return { bucket: b as Bucket, label: BUCKET_LABELS[b], count: rows.length, amountDueCents: rows.reduce((s, a) => s + a.amountDueCents, 0), balanceCents: rows.reduce((s, a) => s + a.totalBalanceCents, 0) };
  });

  const promises: PromiseWindow[] = [30, 90].map(days => {
    const from = since(days);
    const resolved = (status: string) => promiseRows.filter(p => p.status === status && p.resolvedAt && p.resolvedAt >= from).length;
    const kept = resolved("KEPT"), partial = resolved("PARTIALLY_KEPT"), broken = resolved("BROKEN");
    return { days, made: promiseRows.filter(p => p.createdAt >= from).length, kept, partial, broken, keepRate: keepRate(kept, partial, broken) };
  });

  const names = new Map(users.map(u => [u.id, u.name]));
  const activityMap = new Map<string, { date: string; collector: string; contacts: number; messages: number }>();
  const bump = (at: Date, userId: string | null, field: "contacts" | "messages") => {
    const date = chicagoToday(at), collector = userId ? names.get(userId) ?? "Former staff" : "System";
    const key = `${date}|${collector}`;
    const row = activityMap.get(key) ?? { date, collector, contacts: 0, messages: 0 };
    row[field] += 1; activityMap.set(key, row);
  };
  for (const c of contacts) bump(c.occurredAt, c.userId, "contacts");
  for (const m of messages) bump(m.createdAt, m.sentByUserId, "messages");
  const activity = [...activityMap.values()].sort((a, b) => b.date.localeCompare(a.date) || a.collector.localeCompare(b.collector));

  return { tiles, buckets, promises, trends: weeklyTrend(metrics), activity, generatedAt: new Date().toISOString() };
}

export const DASHBOARD_TABLES = ["buckets", "promises", "trends", "activity", "rollrates"] as const;
export type DashboardTable = (typeof DASHBOARD_TABLES)[number];

export function dashboardCsv(data: Awaited<ReturnType<typeof getDashboard>> & { kpis?: Awaited<ReturnType<typeof getKpis>> }, table: DashboardTable) {
  const rows: unknown[][] = table === "rollrates" ? [["Bucket 30 days ago", "Accounts", "Rolled worse (%)", "Improved (%)"], ...(data.kpis?.rollRates ?? []).map(r => [r.label, r.accounts, r.rolledWorsePercent ?? "", r.improvedPercent ?? ""])]
    : table === "buckets" ? [["Bucket", "Accounts", "Amount due ($)", "Balance ($)"], ...data.buckets.map(b => [b.label, b.count, (b.amountDueCents / 100).toFixed(2), (b.balanceCents / 100).toFixed(2)])]
    : table === "promises" ? [["Last N days", "Made", "Kept", "Partly kept", "Broken", "Keep rate (%)"], ...data.promises.map(p => [p.days, p.made, p.kept, p.partial, p.broken, p.keepRate ?? ""])]
      : table === "trends" ? [["Week of", "Past due (%)", "Past due amount ($)", "31-60 accounts", "61+ accounts"], ...data.trends.map(t => [t.week, t.pastDuePercent, (t.pastDueAmountCents / 100).toFixed(2), t.count31to60, t.count61plus])]
        : [["Date", "Staff", "Contacts logged", "Messages"], ...data.activity.map(a => [a.date, a.collector, a.contacts, a.messages])];
  return rows.map(r => r.map(csvCell).join(",")).join("\n") + "\n";
}

// ---------------- Deeper KPIs (spec 22.4) ----------------

const RIGHT_PARTY = ["SPOKE_WITH_CUSTOMER", "PROMISE_MADE", "PLAN_MADE", "PAYMENT_REPORTED", "REFUSED", "DISPUTE", "HARDSHIP"];
const BUCKET_ORDER = ["CURRENT", "GRACE_1_5", "LATE_6_14", "D15_30", "D31_60", "D61_PLUS"];
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);

/** Month-over-month movement between buckets, from each account's import 30+ days ago vs today. */
export function rollRates(pairs: Array<{ then: string; now: string }>) {
  return BUCKET_ORDER.map(bucket => {
    const from = pairs.filter(p => p.then === bucket);
    const worse = from.filter(p => BUCKET_ORDER.indexOf(p.now) > BUCKET_ORDER.indexOf(bucket)).length;
    const better = from.filter(p => BUCKET_ORDER.indexOf(p.now) < BUCKET_ORDER.indexOf(bucket)).length;
    return { bucket, label: BUCKET_LABELS[bucket as Bucket], accounts: from.length, rolledWorsePercent: pct(worse, from.length), improvedPercent: pct(better, from.length) };
  });
}

export async function getKpis(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "VIEW_DASHBOARD");
  const org = access.organizationId;
  const settings = await loadCollectionsSettings(org);
  const today = chicagoToday();
  const visible = await visibilityWhere(access);
  const since = (days: number) => chicagoDateTime(addDays(today, -days), "00:00");
  const [accounts, attempts30, promises30, extensions, chargeOffs] = await Promise.all([
    prisma.collectionAccount.findMany({
      where: { organizationId: org, archivedAt: null, ...visible },
      select: { id: true, daysPastDue: true, bucket: true, closedStatus: true,
        snapshots: { where: { asOfDate: { gte: new Date(`${addDays(today, -200)}T00:00:00Z`) } }, orderBy: { asOfDate: "asc" }, select: { asOfDate: true, daysPastDue: true } },
        contactAttempts: { where: { occurredAt: { gte: since(120) } }, orderBy: { occurredAt: "asc" }, select: { occurredAt: true } } }
    }),
    prisma.collectionContactAttempt.findMany({ where: { organizationId: org, occurredAt: { gte: since(30) }, account: visible }, select: { accountId: true, outcome: true } }),
    prisma.paymentPromise.findMany({ where: { organizationId: org, resolvedAt: { gte: since(30) }, status: { in: ["KEPT", "PARTIALLY_KEPT", "BROKEN"] }, account: visible }, select: { status: true } }),
    prisma.extensionRequest.findMany({ where: { organizationId: org, status: "APPLIED", appliedAt: { gte: since(365), lte: since(30) }, account: visible }, select: { accountId: true, appliedAt: true } }),
    prisma.collectionChargeOff.findMany({ where: { organizationId: org, status: "APPROVED", decidedAt: { gte: since(365) }, account: visible }, select: { amountCents: true, recoveredCents: true } })
  ]);
  const open = accounts.filter(a => !a.closedStatus);
  const pastDue = open.filter(a => a.daysPastDue > 0);
  const contacted = new Set(attempts30.map(a => a.accountId));
  // Time to first contact: from the day the current past-due spell started to the first logged contact after it.
  const delays: number[] = [];
  for (const a of pastDue) {
    const start = addDays(today, -a.daysPastDue);
    const first = a.contactAttempts.find(c => chicagoToday(c.occurredAt) >= start);
    if (first) delays.push(Math.max(0, Math.round((first.occurredAt.getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000)));
  }
  const cutoff = addDays(today, -30);
  const pairs: Array<{ then: string; now: string; id: string }> = [];
  for (const a of open) {
    const then = [...a.snapshots].reverse().find(s => toYmd(s.asOfDate)! <= cutoff);
    if (then) pairs.push({ id: a.id, then: bucketFor(then.daysPastDue, settings.graceDays), now: a.bucket });
  }
  const wasPastDue = pairs.filter(p => p.then !== "CURRENT");
  const extCured = extensions.filter(e => {
    const acct = accounts.find(a => a.id === e.accountId);
    const until = addDays(chicagoToday(e.appliedAt!), 30);
    return acct?.snapshots.some(s => toYmd(s.asOfDate)! >= chicagoToday(e.appliedAt!) && toYmd(s.asOfDate)! <= until && s.daysPastDue === 0);
  }).length;
  const resolved = promises30.length;
  const chargedOff = chargeOffs.reduce((s, c) => s + c.amountCents, 0), recovered = chargeOffs.reduce((s, c) => s + c.recoveredCents, 0);
  return {
    contactRatePercent: pct(pastDue.filter(a => contacted.has(a.id)).length, pastDue.length),
    rightPartyContactPercent: pct(attempts30.filter(a => RIGHT_PARTY.includes(a.outcome)).length, attempts30.length),
    avgDaysToFirstContact: delays.length ? Math.round((delays.reduce((s, d) => s + d, 0) / delays.length) * 10) / 10 : null,
    promisesKeptPercent: pct(promises30.filter(p => p.status === "KEPT").length, resolved),
    brokenPromisePercent: pct(promises30.filter(p => p.status === "BROKEN").length, resolved),
    rollRates: rollRates(pairs),
    cureRatePercent: pct(wasPastDue.filter(p => p.now === "CURRENT").length, wasPastDue.length),
    extensionCureRatePercent: pct(extCured, extensions.length),
    extensionsMeasured: extensions.length,
    chargeOffRatePercent: pct(chargeOffs.length, open.length + chargeOffs.length),
    netLossCents: chargedOff - recovered,
    recoveryPercent: pct(recovered, chargedOff)
  };
}

