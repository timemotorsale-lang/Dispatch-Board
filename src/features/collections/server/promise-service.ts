/**
 * Promises, payment plans and customer-reported payments (spec sections 3.5-3.7, 6.3).
 * Recording one of these never changes DealerCenter; it only tracks what the customer said.
 */
import type { CustomerReportedPaymentMethod, Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { CollectionsError } from "../config/permissions";
import { chicagoToday, dateOnly, parseBusinessDate, parseMoneyToCents, toYmd } from "../domain/money-dates";
import { resolvePlanStatus, resolvePromise, resolveReportedPayment, validatePlan, type InstallmentStatus, type SnapshotPoint } from "../domain/resolution";
import type { CollectionsSettings } from "../domain/settings";
import { collectionsAccess, recordAccountEvent, type CollectionsAccess } from "./access";
import { recalculateAccounts } from "./account-state";
import { findAccount, text } from "./account-service";
import { loadCollectionsSettings } from "./settings-store";
import { formatDay } from "../domain/account-ref";

type Db = Prisma.TransactionClient;

const METHODS: CustomerReportedPaymentMethod[] = ["ONLINE", "IN_PERSON", "PHONE", "CASH_AT_STORE", "ZELLE", "OTHER"];

function amount(value: unknown, label = "amount") {
  const cents = parseMoneyToCents(value);
  if (cents === null || cents === undefined || cents <= 0 || cents > 10_000_000) throw new CollectionsError(`Enter a ${label} above $0.`);
  return cents;
}
function date(value: unknown, label = "date") {
  const ymd = parseBusinessDate(value);
  if (!ymd) throw new CollectionsError(`Choose a valid ${label}.`);
  return ymd;
}

/** Hook called whenever a payment, promise or plan is recorded (Stage 9 adds the re-enable task). */
export type ArrangementHook = (db: Db, access: CollectionsAccess, accountId: string, kind: "PROMISE" | "PLAN" | "REPORTED_PAYMENT") => Promise<void>;
const arrangementHooks: ArrangementHook[] = [];
export function onArrangementRecorded(hook: ArrangementHook) {
  if (!arrangementHooks.includes(hook)) arrangementHooks.push(hook);
}
async function runArrangementHooks(db: Db, access: CollectionsAccess, accountId: string, kind: "PROMISE" | "PLAN" | "REPORTED_PAYMENT") {
  for (const hook of arrangementHooks) await hook(db, access, accountId, kind);
}

async function assertNotFrozen(db: Db, accountId: string) {
  const freeze = await db.collectionFlag.findFirst({ where: { accountId, type: "BANKRUPTCY", clearedAt: null }, select: { id: true } });
  if (freeze) throw new CollectionsError("This account has a bankruptcy freeze. Don't make collection arrangements; review with your bankruptcy attorney.", 409);
}

export async function promiseAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = text(input.action, 50);
  const access = await collectionsAccess(actor, "LOG_ACTIVITY");
  const today = chicagoToday();
  return prisma.$transaction(async tx => {
    const account = await findAccount(tx, access, accountId);
    const event = (type: string, after: unknown, reason = "", before?: unknown) => recordAccountEvent(tx, { organizationId: access.organizationId, accountId, type, userId: access.actor.id, before, after, reason });
    const settings = await loadCollectionsSettings(access.organizationId, tx);
    const finish = async () => { await recalculateAccounts(tx, access.organizationId, settings, [accountId]); };

    switch (action) {
      case "RECORD_PROMISE": {
        await assertNotFrozen(tx, accountId);
        const cents = amount(input.amount, "promised amount");
        const promisedDate = date(input.promisedDate, "promise date");
        if (promisedDate < today) throw new CollectionsError("The promise date can't be in the past.");
        const promise = await tx.paymentPromise.create({
          data: { organizationId: access.organizationId, accountId, promisedAmountCents: cents, promisedDate: dateOnly(promisedDate), takenByUserId: access.actor.id, source: "MANUAL", baselineAmountDueCents: account.amountDueCents, baselineDaysPastDue: account.daysPastDue }
        });
        if (input.logContact !== false) {
          await tx.collectionContactAttempt.create({ data: { organizationId: access.organizationId, accountId, userId: access.actor.id, channel: (text(input.channel, 20) || "CALL_OUT") as never, outcome: "PROMISE_MADE", notes: text(input.notes, 2000) || `Promised $${(cents / 100).toFixed(2)} on ${promisedDate}` } });
          await tx.collectionAccount.update({ where: { id: accountId }, data: { lastContactAt: new Date() } });
        }
        await event("PROMISE_RECORDED", { promiseId: promise.id, amountCents: cents, promisedDate });
        await runArrangementHooks(tx, access, accountId, "PROMISE");
        await finish();
        return { ok: true as const, message: `Promise saved: $${(cents / 100).toFixed(2)} on ${formatDay(promisedDate)}.`, promiseId: promise.id };
      }
      case "CANCEL_PROMISE": {
        const promise = await tx.paymentPromise.findFirst({ where: { id: text(input.promiseId, 100), accountId, status: "OPEN" } });
        if (!promise) throw new CollectionsError("This promise isn't open.", 404);
        const reason = text(input.reason, 500);
        if (reason.length < 5) throw new CollectionsError("Write a short reason for cancelling.");
        await tx.paymentPromise.update({ where: { id: promise.id }, data: { status: "CANCELLED", resolvedAt: new Date(), resolutionNote: reason } });
        await event("PROMISE_CANCELLED", { promiseId: promise.id }, reason);
        await finish();
        return { ok: true as const, message: "Promise cancelled." };
      }
      case "CREATE_PLAN": {
        await assertNotFrozen(tx, accountId);
        const reason = text(input.reason, 1000);
        if (reason.length < 5) throw new CollectionsError("Write a short reason for the plan.");
        const raw = Array.isArray(input.installments) ? input.installments : [];
        const installments = raw.map(item => {
          const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          const cents = parseMoneyToCents(record.amount);
          return { date: parseBusinessDate(record.date) ?? "", amountCents: typeof cents === "number" ? cents : 0 };
        });
        const problems = validatePlan(installments, today);
        if (problems.length) throw new CollectionsError(problems.join(" "));
        // Re-planning supersedes the previous active or broken plan.
        const previous = await tx.paymentPlan.findMany({ where: { accountId, status: { in: ["ACTIVE", "BROKEN"] } } });
        const total = installments.reduce((sum, item) => sum + item.amountCents, 0);
        const plan = await tx.paymentPlan.create({ data: { organizationId: access.organizationId, accountId, createdByUserId: access.actor.id, reason, totalCatchUpCents: total } });
        for (const old of previous) {
          await tx.paymentPlan.update({ where: { id: old.id }, data: { status: "CANCELLED", supersededByPlanId: plan.id, resolvedAt: new Date() } });
          await tx.paymentPromise.updateMany({ where: { planId: old.id, status: "OPEN" }, data: { status: "SUPERSEDED", resolvedAt: new Date(), resolutionNote: "Replaced by a new plan" } });
        }
        // An open one-off promise is replaced by the plan.
        await tx.paymentPromise.updateMany({ where: { accountId, planId: null, status: "OPEN" }, data: { status: "SUPERSEDED", resolvedAt: new Date(), resolutionNote: "Replaced by a payment plan" } });
        let number = 0;
        for (const item of installments) {
          number += 1;
          await tx.paymentPromise.create({ data: { organizationId: access.organizationId, accountId, planId: plan.id, installmentNumber: number, promisedAmountCents: item.amountCents, promisedDate: dateOnly(item.date), takenByUserId: access.actor.id, source: "PLAN_INSTALLMENT", baselineAmountDueCents: account.amountDueCents, baselineDaysPastDue: account.daysPastDue } });
        }
        await tx.collectionContactAttempt.create({ data: { organizationId: access.organizationId, accountId, userId: access.actor.id, channel: (text(input.channel, 20) || "CALL_OUT") as never, outcome: "PLAN_MADE", notes: `Plan: ${installments.length} payments, $${(total / 100).toFixed(2)} total. ${reason}` } });
        await tx.collectionAccount.update({ where: { id: accountId }, data: { lastContactAt: new Date() } });
        await event("PLAN_CREATED", { planId: plan.id, installments: installments.length, totalCents: total, superseded: previous.map(p => p.id) }, reason);
        await runArrangementHooks(tx, access, accountId, "PLAN");
        await finish();
        return { ok: true as const, message: `Payment plan saved: ${installments.length} payments, $${(total / 100).toFixed(2)} total.`, planId: plan.id };
      }
      case "CANCEL_PLAN": {
        const plan = await tx.paymentPlan.findFirst({ where: { id: text(input.planId, 100), accountId, status: "ACTIVE" } });
        if (!plan) throw new CollectionsError("This plan isn't active.", 404);
        const reason = text(input.reason, 500);
        if (reason.length < 5) throw new CollectionsError("Write a short reason for cancelling.");
        await tx.paymentPlan.update({ where: { id: plan.id }, data: { status: "CANCELLED", resolvedAt: new Date() } });
        await tx.paymentPromise.updateMany({ where: { planId: plan.id, status: "OPEN" }, data: { status: "CANCELLED", resolvedAt: new Date(), resolutionNote: reason } });
        await event("PLAN_CANCELLED", { planId: plan.id }, reason);
        await finish();
        return { ok: true as const, message: "Plan cancelled." };
      }
      case "REPORT_PAYMENT": {
        const cents = amount(input.amount, "payment amount");
        const method = METHODS.includes(input.method as CustomerReportedPaymentMethod) ? input.method as CustomerReportedPaymentMethod : (() => { throw new CollectionsError("Choose how they paid."); })();
        const paidDate = date(input.paidDate, "paid date");
        if (paidDate > today) throw new CollectionsError("The paid date can't be in the future.");
        const reported = await tx.customerReportedPayment.create({
          data: { organizationId: access.organizationId, accountId, method, amountCents: cents, paidDate: dateOnly(paidDate), referenceNumber: text(input.referenceNumber, 100) || null, notes: text(input.notes, 2000), enteredByUserId: access.actor.id, baselineAmountDueCents: account.amountDueCents, baselineDaysPastDue: account.daysPastDue }
        });
        await tx.collectionContactAttempt.create({ data: { organizationId: access.organizationId, accountId, userId: access.actor.id, channel: (text(input.channel, 20) || "CALL_IN") as never, outcome: "PAYMENT_REPORTED", notes: `Says they paid $${(cents / 100).toFixed(2)} by ${method.toLowerCase().replaceAll("_", " ")} on ${paidDate}.` } });
        await event("PAYMENT_REPORTED", { reportedPaymentId: reported.id, amountCents: cents, method, paidDate });
        await runArrangementHooks(tx, access, accountId, "REPORTED_PAYMENT");
        await finish();
        const outside = method === "ZELLE" || method === "OTHER" || method === "CASH_AT_STORE";
        return { ok: true as const, message: `Saved. It will be confirmed automatically when a DealerCenter import shows it.${outside ? " Reminder: post this payment in DealerCenter." : ""}` };
      }
      case "CANCEL_REPORTED_PAYMENT": {
        const reported = await tx.customerReportedPayment.findFirst({ where: { id: text(input.reportedPaymentId, 100), accountId, status: { in: ["PENDING_CONFIRMATION", "NOT_FOUND"] } } });
        if (!reported) throw new CollectionsError("This reported payment can't be cancelled.", 404);
        const reason = text(input.reason, 500);
        if (reason.length < 5) throw new CollectionsError("Write a short reason.");
        await tx.customerReportedPayment.update({ where: { id: reported.id }, data: { status: "CANCELLED", resolvedAt: new Date(), resolutionNote: reason } });
        await event("REPORTED_PAYMENT_CANCELLED", { reportedPaymentId: reported.id }, reason);
        return { ok: true as const, message: "Reported payment cancelled." };
      }
    }
    throw new CollectionsError("Unknown action.");
  }, { timeout: 30_000 });
}

export const PROMISE_ACTIONS = ["RECORD_PROMISE", "CANCEL_PROMISE", "CREATE_PLAN", "CANCEL_PLAN", "REPORT_PAYMENT", "CANCEL_REPORTED_PAYMENT"] as const;

export type ResolutionSummary = { promisesKept: number; promisesPartial: number; promisesBroken: number; reportedConfirmed: number; reportedNotFound: number; plansBroken: number; plansCompleted: number; changedAccountIds: string[]; brokenAccountIds: string[]; partialAccountIds: string[]; notFoundAccountIds: string[] };

/**
 * Resolves every open promise and pending reported payment in the organization. Idempotent:
 * only OPEN/PENDING rows are looked at, so running it twice changes nothing the second time.
 */
export async function resolveOutcomes(db: Db, organizationId: string, settings: CollectionsSettings, today = chicagoToday()): Promise<ResolutionSummary> {
  const summary: ResolutionSummary = { promisesKept: 0, promisesPartial: 0, promisesBroken: 0, reportedConfirmed: 0, reportedNotFound: 0, plansBroken: 0, plansCompleted: 0, changedAccountIds: [], brokenAccountIds: [], partialAccountIds: [], notFoundAccountIds: [] };
  const [reported, promises] = await Promise.all([
    db.customerReportedPayment.findMany({ where: { organizationId, status: "PENDING_CONFIRMATION" } }),
    db.paymentPromise.findMany({ where: { organizationId, status: "OPEN" } })
  ]);
  const accountIds = [...new Set([...reported.map(r => r.accountId), ...promises.map(p => p.accountId)])];
  if (!accountIds.length) return summary;
  const snaps = await db.collectionAccountSnapshot.findMany({ where: { accountId: { in: accountIds } }, select: { accountId: true, asOfDate: true, amountDueCents: true, daysPastDue: true } });
  const byAccount = new Map<string, SnapshotPoint[]>();
  for (const s of snaps) byAccount.set(s.accountId, [...(byAccount.get(s.accountId) ?? []), { asOfDate: toYmd(s.asOfDate)!, amountDueCents: s.amountDueCents, daysPastDue: s.daysPastDue }]);
  const changed = new Set<string>();

  // 1) Reported payments first, so confirmed ones can count toward promises.
  for (const payment of reported) {
    const outcome = resolveReportedPayment({
      payment: { amountCents: payment.amountCents, reportedDate: chicagoToday(payment.reportedAt), baselineAmountDueCents: payment.baselineAmountDueCents, baselineDaysPastDue: payment.baselineDaysPastDue },
      snapshots: byAccount.get(payment.accountId) ?? [], today, windowDays: settings.reportedPaymentConfirmationDays
    });
    if (outcome.status === "PENDING_CONFIRMATION") continue;
    await db.customerReportedPayment.update({ where: { id: payment.id }, data: { status: outcome.status, resolvedAt: new Date(), resolutionNote: outcome.note } });
    await db.collectionAccountEvent.create({ data: { organizationId, accountId: payment.accountId, type: outcome.status === "CONFIRMED_BY_IMPORT" ? "REPORTED_PAYMENT_CONFIRMED" : "REPORTED_PAYMENT_NOT_FOUND", after: { reportedPaymentId: payment.id }, reason: outcome.note } });
    if (outcome.status === "CONFIRMED_BY_IMPORT") summary.reportedConfirmed += 1;
    else { summary.reportedNotFound += 1; summary.notFoundAccountIds.push(payment.accountId); }
    changed.add(payment.accountId);
  }

  const reportedNow = await db.customerReportedPayment.findMany({ where: { accountId: { in: accountIds }, status: { not: "CANCELLED" } }, select: { accountId: true, status: true, amountCents: true, paidDate: true } });
  const planIds = new Set<string>();
  for (const promise of promises) {
    const outcome = resolvePromise({
      promise: { promisedAmountCents: promise.promisedAmountCents, promisedDate: toYmd(promise.promisedDate)!, createdDate: chicagoToday(promise.createdAt), baselineAmountDueCents: promise.baselineAmountDueCents, baselineDaysPastDue: promise.baselineDaysPastDue },
      snapshots: byAccount.get(promise.accountId) ?? [],
      reportedPayments: reportedNow.filter(r => r.accountId === promise.accountId).map(r => ({ status: r.status, amountCents: r.amountCents, paidDate: toYmd(r.paidDate)! })),
      today, graceDays: settings.promiseGraceDays
    });
    if (outcome.status === "OPEN") continue;
    await db.paymentPromise.update({ where: { id: promise.id }, data: { status: outcome.status, resolvedAt: new Date(), resolutionNote: outcome.note } });
    await db.collectionAccountEvent.create({ data: { organizationId, accountId: promise.accountId, type: `PROMISE_${outcome.status}`, after: { promiseId: promise.id, reductionCents: outcome.reductionCents }, reason: outcome.note } });
    if (outcome.status === "KEPT") summary.promisesKept += 1;
    if (outcome.status === "PARTIALLY_KEPT") { summary.promisesPartial += 1; summary.partialAccountIds.push(promise.accountId); }
    if (outcome.status === "BROKEN") { summary.promisesBroken += 1; summary.brokenAccountIds.push(promise.accountId); }
    if (promise.planId) planIds.add(promise.planId);
    changed.add(promise.accountId);
  }

  for (const planId of planIds) {
    const plan = await db.paymentPlan.findUnique({ where: { id: planId }, include: { installments: { select: { status: true } } } });
    if (!plan || plan.status !== "ACTIVE") continue;
    const next = resolvePlanStatus(plan.installments.map(i => i.status as InstallmentStatus));
    if (next === "ACTIVE") continue;
    await db.paymentPlan.update({ where: { id: plan.id }, data: { status: next, resolvedAt: new Date() } });
    if (next === "BROKEN") {
      // Remaining installments stay on record but are no longer expected.
      await db.paymentPromise.updateMany({ where: { planId: plan.id, status: "OPEN" }, data: { status: "CANCELLED", resolvedAt: new Date(), resolutionNote: "Plan broken" } });
      summary.plansBroken += 1;
      if (!summary.brokenAccountIds.includes(plan.accountId)) summary.brokenAccountIds.push(plan.accountId);
    } else summary.plansCompleted += 1;
    await db.collectionAccountEvent.create({ data: { organizationId, accountId: plan.accountId, type: `PLAN_${next}`, after: { planId: plan.id } } });
  }
  summary.changedAccountIds = [...changed];
  if (changed.size) await recalculateAccounts(db, organizationId, settings, [...changed]);
  return summary;
}
