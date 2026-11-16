/**
 * Collections dashboard (spec section 13): tiles, past due by bucket, promise results,
 * weekly trends (from CollectionsDailyMetric) and activity per collector.
 * Every table can be downloaded as CSV.
 */
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { addDays, chicagoDateTime, chicagoToday, toYmd } from "../domain/money-dates";
import { BUCKET_LABELS, BUCKETS, type Bucket } from "../domain/status";
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
  const insuranceProblems = accounts.filter(a => {
    const r = a.insuranceRecords[0];
    return r && ["EXPIRED", "MISSING", "EXPIRING_SOON"].includes(effectiveInsuranceStatus({ status: r.status, expirationDate: toYmd(r.expirationDate) }, today, settings.insuranceExpiringSoonDays));
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

export const DASHBOARD_TABLES = ["buckets", "promises", "trends", "activity"] as const;
export type DashboardTable = (typeof DASHBOARD_TABLES)[number];

export function dashboardCsv(data: Awaited<ReturnType<typeof getDashboard>>, table: DashboardTable) {
  const rows: unknown[][] = table === "buckets" ? [["Bucket", "Accounts", "Amount due ($)", "Balance ($)"], ...data.buckets.map(b => [b.label, b.count, (b.amountDueCents / 100).toFixed(2), (b.balanceCents / 100).toFixed(2)])]
    : table === "promises" ? [["Last N days", "Made", "Kept", "Partly kept", "Broken", "Keep rate (%)"], ...data.promises.map(p => [p.days, p.made, p.kept, p.partial, p.broken, p.keepRate ?? ""])]
      : table === "trends" ? [["Week of", "Past due (%)", "Past due amount ($)", "31-60 accounts", "61+ accounts"], ...data.trends.map(t => [t.week, t.pastDuePercent, (t.pastDueAmountCents / 100).toFixed(2), t.count31to60, t.count61plus])]
        : [["Date", "Staff", "Contacts logged", "Messages"], ...data.activity.map(a => [a.date, a.collector, a.contacts, a.messages])];
  return rows.map(r => r.map(csvCell).join(",")).join("\n") + "\n";
}
