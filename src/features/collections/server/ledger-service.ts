/**
 * Servicing ledger service (spec 25.1–25.3). In Release 1 this is a SHADOW ledger:
 * DealerCenter remains the system of record (SYSTEM_OF_RECORD is locked), so nothing here
 * takes money or changes what the customer owes in DealerCenter. It exists so the app can
 * prove, account by account, that its own calculations match DealerCenter (Stage 15).
 *
 * Transactions are append-only; corrections are reversals. Balances, amount past due and
 * days past due are always replayed from the transactions (domain/ledger.ts).
 */
import type { LedgerTransactionSource, LedgerTransactionType, Prisma, ServicingCalcMethod } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { resolveSystemOfRecord } from "../config/flags";
import { CollectionsError } from "../config/permissions";
import { buildSchedule, NEEDS_APPROVAL, replayLedger, REVERSIBLE_TYPES, type ContractTerms, type Frequency, type Installment, type LedgerTx } from "../domain/ledger";
import { chicagoToday, dateOnly, parseBusinessDate, parseMoneyToCents, parseWholeNumber, toYmd } from "../domain/money-dates";
import type { CollectionsSettings } from "../domain/settings";
import { collectionsAccess, recordAccountEvent } from "./access";
import { findAccount, text } from "./account-service";
import { loadCollectionsSettings } from "./settings-store";

type Db = Prisma.TransactionClient;

export const LEDGER_ACTIONS = ["CREATE_CONTRACT", "POST_LEDGER_TRANSACTION", "RESCHEDULE"] as const;
const FREQUENCIES: Frequency[] = ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"];
const TX_TYPES: LedgerTransactionType[] = ["PAYMENT", "PAYMENT_REVERSAL", "RETURNED_PAYMENT", "LATE_FEE", "LATE_FEE_WAIVER", "FEE", "CREDIT", "ADJUSTMENT", "PAYOFF", "CHARGE_OFF", "RECOVERY", "REPO_EXPENSE", "SALE_PROCEEDS", "SIDE_NOTE_PAYMENT", "OPENING_BALANCE"];
const SOURCES: LedgerTransactionSource[] = ["CASH_DRAWER", "PROCESSOR", "ZELLE", "MONEY_ORDER", "IMPORT", "SYSTEM", "MANUAL"];

type ContractRow = Prisma.ServicingContractGetPayload<object>;

export function termsFrom(c: ContractRow): ContractTerms {
  return {
    calcMethod: c.calcMethod, frequency: c.frequency as Frequency, contractDate: toYmd(c.contractDate)!, firstDueDate: toYmd(c.firstDueDate)!,
    numberOfPayments: c.numberOfPayments, paymentAmountCents: c.paymentAmountCents, totalOfPaymentsCents: c.totalOfPaymentsCents,
    amountFinancedCents: c.amountFinancedCents, aprBasisPoints: c.aprBasisPoints, sideNoteCents: c.sideNoteCents
  };
}

/** Load a contract with its current schedule and all transactions, and replay it to `asOf`. */
export async function loadLedger(db: Db, contractId: string, settings: CollectionsSettings, asOf = chicagoToday()) {
  const contract = await db.servicingContract.findUniqueOrThrow({ where: { id: contractId } });
  const schedule = await db.paymentSchedule.findFirst({ where: { contractId, isCurrent: true }, orderBy: { version: "desc" }, include: { installments: { orderBy: { number: "asc" } } } });
  const txs = await db.ledgerTransaction.findMany({ where: { contractId }, orderBy: [{ effectiveDate: "asc" }, { postedAt: "asc" }] });
  const installments: Installment[] = (schedule?.installments ?? []).map(i => ({ number: i.number, dueDate: toYmd(i.dueDate)!, amountCents: i.amountCents, principalCents: i.principalCents ?? undefined, interestCents: i.interestCents ?? undefined }));
  const ledgerTxs: LedgerTx[] = txs.map(t => ({ id: t.id, type: t.type, amountCents: t.amountCents, effectiveDate: toYmd(t.effectiveDate)!, postedAt: t.postedAt.toISOString(), reversesTransactionId: t.reversesTransactionId }));
  const state = replayLedger(termsFrom(contract), installments, ledgerTxs, asOf, settings.ledger.allocationOrder);
  return { contract, schedule, transactions: txs, state };
}

/** Post one transaction (append-only), store how it was split, and return the new state. Used by people and by Stage 15's shadow posting. */
export async function postLedgerTransaction(db: Db, input: {
  organizationId: string; contractId: string; accountId: string; type: LedgerTransactionType; amountCents: number; effectiveDate: string; source: LedgerTransactionSource;
  referenceNumber?: string | null; memo?: string; enteredByUserId: string | null; approvedByUserId?: string | null; reversesTransactionId?: string | null; idempotencyKey?: string | null; settings: CollectionsSettings;
}) {
  if (input.idempotencyKey) {
    const existing = await db.ledgerTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } });
    if (existing) return { transactionId: existing.id, duplicate: true as const };
  }
  if (NEEDS_APPROVAL.includes(input.type) && !input.approvedByUserId) throw new CollectionsError("This kind of entry needs an approver.", 403);
  if (input.type !== "ADJUSTMENT" && input.amountCents < 0) throw new CollectionsError("Amounts must be positive (use a reversal or a credit to take money back).");
  if (input.type === "PAYMENT_REVERSAL" || input.type === "RETURNED_PAYMENT") {
    const target = input.reversesTransactionId ? await db.ledgerTransaction.findFirst({ where: { id: input.reversesTransactionId, contractId: input.contractId } }) : null;
    if (!target || !REVERSIBLE_TYPES.includes(target.type)) throw new CollectionsError("Choose the payment to reverse.", 400);
    if (await db.ledgerTransaction.findFirst({ where: { reversesTransactionId: target.id }, select: { id: true } })) throw new CollectionsError("That payment was already reversed.", 409);
    input = { ...input, amountCents: target.amountCents };
  }
  const tx = await db.ledgerTransaction.create({ data: {
    organizationId: input.organizationId, contractId: input.contractId, accountId: input.accountId, type: input.type, amountCents: input.amountCents,
    effectiveDate: dateOnly(input.effectiveDate), source: input.source, referenceNumber: input.referenceNumber ?? null, memo: input.memo ?? "",
    enteredByUserId: input.enteredByUserId, approvedByUserId: input.approvedByUserId ?? null, reversesTransactionId: input.reversesTransactionId ?? null, idempotencyKey: input.idempotencyKey ?? null
  } });
  const { state } = await loadLedger(db, input.contractId, input.settings, input.effectiveDate > chicagoToday() ? input.effectiveDate : chicagoToday());
  const split = state.allocations[tx.id] ?? [];
  if (split.length) await db.ledgerAllocation.createMany({ data: split.map(a => ({ transactionId: tx.id, bucket: a.bucket, amountCents: a.amountCents, installmentNumber: a.installmentNumber ?? null })) });
  return { transactionId: tx.id, duplicate: false as const, state };
}

export async function ledgerAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = text(input.action, 40);
  const access = await collectionsAccess(actor, "APPROVE_MONEY");
  const settings = await loadCollectionsSettings(access.organizationId);
  return prisma.$transaction(async tx => {
    const account = await findAccount(tx, access, accountId);
    const org = access.organizationId;
    switch (action) {
      case "CREATE_CONTRACT": {
        if (await tx.servicingContract.findUnique({ where: { accountId }, select: { id: true } })) throw new CollectionsError("This account already has a servicing contract.", 409);
        const money = (v: unknown, label: string, required = true) => { const c = parseMoneyToCents(v); if (c === undefined || (required && (c === null || c <= 0)) || (c !== null && c < 0)) throw new CollectionsError(`Enter a valid ${label}.`); return c ?? 0; };
        const frequency = (FREQUENCIES as string[]).includes(String(input.frequency)) ? (input.frequency as Frequency) : null;
        if (!frequency) throw new CollectionsError("Choose weekly, biweekly, semimonthly or monthly.");
        const calcMethod: ServicingCalcMethod = input.calcMethod === "SIMPLE_INTEREST" ? "SIMPLE_INTEREST" : "FIXED_PAYMENT";
        const count = parseWholeNumber(input.numberOfPayments);
        if (!count || count < 1) throw new CollectionsError("Enter the number of payments.");
        const firstDue = parseBusinessDate(input.firstDueDate), contractDate = parseBusinessDate(input.contractDate) ?? toYmd(account.contractDate);
        if (!firstDue || !contractDate) throw new CollectionsError("Enter the contract date and first due date.");
        const payment = money(input.paymentAmount, "payment amount");
        const amountFinanced = money(input.amountFinanced, "amount financed", calcMethod === "SIMPLE_INTEREST");
        const apr = input.apr === undefined || input.apr === "" ? null : Math.round(Number(input.apr) * 100);
        if (calcMethod === "SIMPLE_INTEREST" && (apr === null || !Number.isFinite(apr) || apr < 0 || apr > 10_000)) throw new CollectionsError("Enter the APR for a simple-interest contract.");
        const total = calcMethod === "FIXED_PAYMENT" ? (money(input.totalOfPayments, "total of payments", false) || payment * count) : 0;
        const terms: ContractTerms = { calcMethod, frequency, contractDate, firstDueDate: firstDue, numberOfPayments: count, paymentAmountCents: payment, totalOfPaymentsCents: total, amountFinancedCents: amountFinanced, aprBasisPoints: apr, sideNoteCents: money(input.sideNote, "side note", false) };
        let installments: Installment[];
        try { installments = buildSchedule(terms, { weekendRule: settings.ledger.weekendRule, holidays: settings.ledger.holidays }); } catch (e) { throw new CollectionsError(e instanceof Error ? e.message : "Those terms don't work."); }
        const contract = await tx.servicingContract.create({ data: {
          organizationId: org, accountId, accountType: account.accountType, calcMethod, cashPriceCents: money(input.cashPrice, "cash price", false), downPaymentCents: money(input.downPayment, "down payment", false),
          sideNoteCents: terms.sideNoteCents, feesCents: money(input.fees, "fees", false), amountFinancedCents: amountFinanced, totalOfPaymentsCents: calcMethod === "FIXED_PAYMENT" ? total : installments.reduce((s, i) => s + i.amountCents, 0),
          aprBasisPoints: apr, paymentAmountCents: payment, frequency, numberOfPayments: count, firstDueDate: dateOnly(firstDue), contractDate: dateOnly(contractDate), source: "MANUAL", createdByUserId: access.actor.id
        } });
        await tx.paymentSchedule.create({ data: { organizationId: org, contractId: contract.id, version: 1, reason: "Original schedule", createdByUserId: access.actor.id, installments: { create: installments.map(i => ({ number: i.number, dueDate: dateOnly(i.dueDate), amountCents: i.amountCents, principalCents: i.principalCents ?? null, interestCents: i.interestCents ?? null })) } } });
        await recordAccountEvent(tx, { organizationId: org, accountId, type: "LEDGER_CONTRACT_CREATED", userId: access.actor.id, after: { contractId: contract.id, calcMethod, frequency, numberOfPayments: count } });
        return { ok: true as const, message: `Shadow contract created with ${count} ${frequency.toLowerCase()} payments.` };
      }
      case "POST_LEDGER_TRANSACTION": {
        const contract = await tx.servicingContract.findUnique({ where: { accountId } });
        if (!contract) throw new CollectionsError("Create the servicing contract first.", 409);
        const type = (TX_TYPES as string[]).includes(String(input.type)) ? (input.type as LedgerTransactionType) : null;
        if (!type) throw new CollectionsError("Choose the kind of entry.");
        const amount = type === "PAYMENT_REVERSAL" || type === "RETURNED_PAYMENT" || type === "CHARGE_OFF" ? 0 : parseMoneyToCents(input.amount);
        if (amount === null || amount === undefined || (type !== "ADJUSTMENT" && type !== "CHARGE_OFF" && type !== "PAYMENT_REVERSAL" && type !== "RETURNED_PAYMENT" && amount <= 0)) throw new CollectionsError("Enter a valid amount.");
        const date = parseBusinessDate(input.effectiveDate) ?? chicagoToday();
        const memo = text(input.memo, 500);
        if (NEEDS_APPROVAL.includes(type) && memo.length < 5) throw new CollectionsError("Reversals, returned payments, adjustments, waivers, credits and charge-offs need a reason in the memo.");
        const source = (SOURCES as string[]).includes(String(input.source)) ? (input.source as LedgerTransactionSource) : "MANUAL";
        const result = await postLedgerTransaction(tx, {
          organizationId: org, contractId: contract.id, accountId, type, amountCents: amount, effectiveDate: date, source, referenceNumber: text(input.referenceNumber, 80) || null, memo,
          enteredByUserId: access.actor.id, approvedByUserId: NEEDS_APPROVAL.includes(type) ? access.actor.id : null, reversesTransactionId: text(input.reversesTransactionId, 100) || null, settings
        });
        await recordAccountEvent(tx, { organizationId: org, accountId, type: "LEDGER_TRANSACTION", userId: access.actor.id, after: { transactionId: result.transactionId, type, amountCents: amount, effectiveDate: date }, reason: memo });
        return { ok: true as const, message: `${type.toLowerCase().replaceAll("_", " ")} recorded in the shadow ledger.` };
      }
      case "RESCHEDULE": {
        // A due-date change / deferral: a new schedule version that moves unpaid installments from one number on (spec 25.2).
        const contract = await tx.servicingContract.findUnique({ where: { accountId } });
        if (!contract) throw new CollectionsError("Create the servicing contract first.", 409);
        const from = parseWholeNumber(input.fromInstallment), days = parseWholeNumber(input.shiftDays);
        const reason = text(input.reason, 500);
        if (!from || !days || days < 1 || days > 366) throw new CollectionsError("Choose the first payment to move and how many days to move it.");
        if (reason.length < 5) throw new CollectionsError("Give the reason (for example the approved extension).");
        const current = await tx.paymentSchedule.findFirstOrThrow({ where: { contractId: contract.id, isCurrent: true }, include: { installments: { orderBy: { number: "asc" } } } });
        await tx.paymentSchedule.update({ where: { id: current.id }, data: { isCurrent: false } });
        const next = await tx.paymentSchedule.create({ data: {
          organizationId: org, contractId: contract.id, version: current.version + 1, reason, approvedByUserId: access.actor.id, createdByUserId: access.actor.id,
          installments: { create: current.installments.map(i => ({ number: i.number, dueDate: i.number >= from ? new Date(i.dueDate.getTime() + days * 86_400_000) : i.dueDate, amountCents: i.amountCents, principalCents: i.principalCents, interestCents: i.interestCents })) }
        } });
        await recordAccountEvent(tx, { organizationId: org, accountId, type: "LEDGER_RESCHEDULED", userId: access.actor.id, before: { version: current.version }, after: { version: next.version, fromInstallment: from, shiftDays: days }, reason });
        return { ok: true as const, message: `Schedule version ${next.version}: payments from #${from} moved ${days} days.` };
      }
      default:
        throw new CollectionsError("Unknown ledger action.");
    }
  });
}

/** Account page: the shadow ledger, replayed to today. */
export async function getAccountLedger(actor: AuthenticatedUser | null, accountId: string) {
  const access = await collectionsAccess(actor, "VIEW");
  await findAccount(prisma, access, accountId);
  const settings = await loadCollectionsSettings(access.organizationId);
  const contract = await prisma.servicingContract.findUnique({ where: { accountId }, select: { id: true } });
  const base = { systemOfRecord: resolveSystemOfRecord(), canPost: access.role === "ADMIN" };
  if (!contract) return { ...base, contract: null };
  const l = await prisma.$transaction(tx => loadLedger(tx, contract.id, settings));
  const allocs = await prisma.ledgerAllocation.findMany({ where: { transaction: { contractId: contract.id } } });
  return {
    ...base,
    contract: { id: l.contract.id, calcMethod: l.contract.calcMethod, frequency: l.contract.frequency, numberOfPayments: l.contract.numberOfPayments, paymentAmountCents: l.contract.paymentAmountCents, aprBasisPoints: l.contract.aprBasisPoints, source: l.contract.source, status: l.contract.status },
    scheduleVersion: l.schedule?.version ?? null,
    state: { ...l.state, allocations: undefined },
    transactions: l.transactions.map(t => ({ id: t.id, type: t.type, amountCents: t.amountCents, effectiveDate: toYmd(t.effectiveDate), source: t.source, memo: t.memo, reversed: l.state.reversed.includes(t.id), reversesTransactionId: t.reversesTransactionId,
      split: (l.state.allocations[t.id] ?? allocs.filter(a => a.transactionId === t.id).map(a => ({ bucket: a.bucket, amountCents: a.amountCents, installmentNumber: a.installmentNumber ?? undefined }))) }))
  };
}
