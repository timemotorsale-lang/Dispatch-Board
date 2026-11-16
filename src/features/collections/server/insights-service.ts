/**
 * Builds the facts for the risk score and "Do this next" (spec 22.2), and saves one score
 * per account per day (re-running the same day updates that day's row; nothing is created twice).
 */
import type { Prisma } from "@prisma/client";

import { addDays, chicagoToday, daysBetween, toYmd } from "../domain/money-dates";
import { computeRiskScore, nextBestAction, paymentsPer90Days, type NextAction, type RiskFactor } from "../domain/risk";
import type { CollectionsSettings } from "../domain/settings";
import { effectiveInsuranceStatus } from "../domain/tasks";

type Db = Prisma.TransactionClient;

export const RIGHT_PARTY_OUTCOMES = ["SPOKE_WITH_CUSTOMER", "PROMISE_MADE", "PLAN_MADE", "PAYMENT_REPORTED", "REFUSED", "DISPUTE", "HARDSHIP"];
const OPEN_REPO = ["REVIEW", "APPROVED", "ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE"] as const;

export type AccountInsight = { accountId: string; score: number; factors: RiskFactor[]; next: NextAction };

export async function loadInsights(db: Db, organizationId: string, settings: CollectionsSettings, options: { accountIds?: string[]; today?: string } = {}): Promise<AccountInsight[]> {
  const today = options.today ?? chicagoToday();
  const since90 = new Date(`${addDays(today, -90)}T00:00:00Z`);
  const since120 = new Date(`${addDays(today, -120)}T00:00:00Z`);
  const accounts = await db.collectionAccount.findMany({
    where: { organizationId, closedStatus: null, archivedAt: null, ...(options.accountIds ? { id: { in: options.accountIds } } : {}) },
    select: {
      id: true, daysPastDue: true, status: true, paymentFrequency: true, contractDate: true, lastContactAt: true,
      snapshots: { where: { asOfDate: { gte: since120 } }, orderBy: { asOfDate: "asc" }, select: { asOfDate: true, daysPastDue: true, amountDueCents: true } },
      promises: { where: { OR: [{ status: "OPEN" }, { status: "BROKEN", resolvedAt: { gte: since90 } }] }, select: { status: true, promisedDate: true, resolvedAt: true, createdAt: true } },
      contactAttempts: { where: { occurredAt: { gte: since90 } }, orderBy: { occurredAt: "desc" }, select: { outcome: true, channel: true, occurredAt: true } },
      insuranceRecords: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, expirationDate: true } },
      skipAlerts: { where: { status: "OPEN" }, select: { id: true } },
      inboundMessages: { where: { readAt: null }, select: { id: true } },
      reportedPayments: { where: { status: { not: "CANCELLED" } }, select: { status: true, createdAt: true } },
      starterActions: { where: { status: "DONE_IN_PORTAL" }, orderBy: [{ performedInPortalAt: "desc" }, { updatedAt: "desc" }], take: 1, select: { action: true, performedInPortalAt: true, updatedAt: true } },
      plans: { where: { status: { not: "CANCELLED" } }, select: { createdAt: true } },
      repoCases: { where: { status: { in: [...OPEN_REPO] } }, select: { id: true } },
      flags: { where: { clearedAt: null, type: "BANKRUPTCY" }, select: { id: true } }
    }
  });
  const todayDate = new Date(`${today}T00:00:00Z`);
  return accounts.map(a => {
    const snaps = a.snapshots;
    const old = [...snaps].reverse().find(s => toYmd(s.asOfDate)! <= addDays(today, -30));
    let paymentsSeen = 0;
    for (let i = 1; i < snaps.length; i += 1) {
      if (snaps[i].asOfDate < since90) continue;
      if (snaps[i].amountDueCents < snaps[i - 1].amountDueCents || snaps[i].daysPastDue < snaps[i - 1].daysPastDue) paymentsSeen += 1;
    }
    const broken = a.promises.filter(p => p.status === "BROKEN");
    const latestBroken = broken.reduce<Date | null>((m, p) => (p.resolvedAt && (!m || p.resolvedAt > m) ? p.resolvedAt : m), null);
    const rpc = a.contactAttempts.filter(c => RIGHT_PARTY_OUTCOMES.includes(c.outcome)).length;
    const calls = a.contactAttempts.filter(c => c.channel === "CALL_OUT").slice(0, 4);
    const ins = a.insuranceRecords[0];
    const insuranceStatus = ins ? effectiveInsuranceStatus({ status: ins.status, expirationDate: toYmd(ins.expirationDate) }, today, settings.insuranceExpiringSoonDays) : "UNKNOWN";
    const ageMonths = a.contractDate ? Math.floor(daysBetween(toYmd(a.contractDate)!, today) / 30.4) : null;
    const starter = a.starterActions[0];
    const disabledAt = starter?.action === "DISABLE" ? starter.performedInPortalAt ?? starter.updatedAt : null;
    const arrangements = [...a.promises.filter(p => p.status === "OPEN").map(p => p.createdAt), ...a.reportedPayments.map(r => r.createdAt), ...a.plans.map(p => p.createdAt)];
    const { score, factors } = computeRiskScore({
      daysPastDue: a.daysPastDue, daysPastDue30DaysAgo: old ? old.daysPastDue : null, paymentsSeen90: paymentsSeen,
      paymentsExpected90: a.daysPastDue > 0 || snaps.length > 1 ? paymentsPer90Days(a.paymentFrequency) : 0,
      brokenPromises90: broken.length, contactAttempts90: a.contactAttempts.length, rightPartyContacts90: rpc,
      insuranceStatus, possibleSkip: a.skipAlerts.length > 0, accountAgeMonths: ageMonths
    }, settings.riskWeights);
    const next = nextBestAction({
      frozen: a.flags.length > 0, unreadTexts: a.inboundMessages.length,
      brokenPromiseDaysAgo: latestBroken && !a.promises.some(p => p.status === "OPEN") ? Math.max(0, daysBetween(chicagoToday(latestBroken), today)) : null,
      answeredOfLast: { answered: calls.filter(c => RIGHT_PARTY_OUTCOMES.includes(c.outcome)).length, tries: calls.length },
      reportedPaymentNotFound: a.reportedPayments.some(r => r.status === "NOT_FOUND"),
      promiseDueToday: a.promises.some(p => p.status === "OPEN" && p.promisedDate.getTime() === todayDate.getTime()),
      starterDisabled: Boolean(disabledAt), arrangementSinceDisable: Boolean(disabledAt && arrangements.some(d => d > disabledAt)) || Boolean(disabledAt && a.daysPastDue === 0),
      disableEligible: a.status === "DISABLE_ELIGIBLE", openPromise: a.promises.some(p => p.status === "OPEN"),
      insuranceProblem: ["EXPIRED", "MISSING", "EXPIRING_SOON"].includes(insuranceStatus), possibleSkip: a.skipAlerts.length > 0,
      daysPastDue: a.daysPastDue, daysSinceContact: a.lastContactAt ? daysBetween(chicagoToday(a.lastContactAt), today) : null, repoInProgress: a.repoCases.length > 0
    });
    return { accountId: a.id, score, factors, next };
  });
}

/** Save today's score for every account (idempotent per day) and copy it onto the account for sorting. */
export async function saveRiskScores(db: Db, organizationId: string, settings: CollectionsSettings, today = chicagoToday()) {
  const insights = await loadInsights(db, organizationId, settings, { today });
  const scoreDate = new Date(`${today}T00:00:00Z`);
  const now = new Date();
  for (const i of insights) {
    const factors = i.factors as unknown as Prisma.InputJsonValue, nextAction = i.next as unknown as Prisma.InputJsonValue;
    await db.collectionRiskScore.upsert({ where: { accountId_scoreDate: { accountId: i.accountId, scoreDate } }, update: { score: i.score, factors, nextAction }, create: { organizationId, accountId: i.accountId, scoreDate, score: i.score, factors, nextAction } });
    await db.collectionAccount.update({ where: { id: i.accountId }, data: { riskScore: i.score, riskScoredAt: now } });
  }
  return { scored: insights.length };
}
