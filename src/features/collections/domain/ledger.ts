/**
 * Servicing ledger engine (spec 25.1–25.3). Pure functions, integer cents only.
 *
 * - buildSchedule(): the payment schedule for a contract (weekly, biweekly, semimonthly or
 *   monthly; fixed-payment or simple-interest).
 * - replayLedger(): replays every transaction in order and returns the balance, amount past
 *   due, days past due and how each payment was split. Balances are always CALCULATED from
 *   the transactions, never stored as numbers someone can edit.
 *
 * Rules (each is a setting or documented choice; confirm with the accountant/attorney before
 * the ledger becomes the system of record):
 * - Payment order (default): fees -> late fees -> past-due installments (oldest first) ->
 *   current installment -> principal.
 * - Fixed-payment: money beyond the current installment pays future installments in order
 *   ("paid ahead"); money beyond the whole contract is UNAPPLIED.
 * - Simple-interest: interest accrues daily on the principal (actual days / 365) and is posted,
 *   rounded to the cent, whenever a transaction happens. Payments pay accrued interest, then
 *   principal. Extra principal shortens the loan but does not move the due dates.
 * - Reversals and returned payments cancel the original payment completely; the whole
 *   history is replayed, so later payments are re-split correctly.
 * - After a charge-off, money received is recovery and isn't applied to installments.
 */
import { addDays, daysBetween } from "./money-dates";

export type Frequency = "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";
export type CalcMethod = "FIXED_PAYMENT" | "SIMPLE_INTEREST";
export type WeekendRule = "NONE" | "NEXT_BUSINESS_DAY";

export type ContractTerms = {
  calcMethod: CalcMethod;
  frequency: Frequency;
  contractDate: string;
  firstDueDate: string;
  numberOfPayments: number;
  paymentAmountCents: number;
  /** Fixed-payment: the sum of all payments (sets the last payment). */
  totalOfPaymentsCents: number;
  /** Simple-interest: the starting principal. */
  amountFinancedCents: number;
  aprBasisPoints: number | null;
  sideNoteCents: number;
};

export type Installment = { number: number; dueDate: string; amountCents: number; principalCents?: number; interestCents?: number };

// ---------------- Due dates ----------------

function parts(ymd: string) { const [y, m, d] = ymd.split("-").map(Number); return { y, m, d }; }
function fmt(y: number, m: number, d: number) { return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function monthEnd(y: number, m: number) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function addMonths(y: number, m: number, k: number) { const t = y * 12 + (m - 1) + k; return { y: Math.floor(t / 12), m: (t % 12) + 1 }; }

/** Move Saturday/Sunday (and listed holidays) to the next business day. */
export function applyWeekendRule(ymd: string, rule: WeekendRule, holidays: string[] = []) {
  if (rule === "NONE") return ymd;
  let day = ymd;
  for (let i = 0; i < 10; i += 1) {
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6 && !holidays.includes(day)) return day;
    day = addDays(day, 1);
  }
  return day;
}

/** The n due dates for a frequency, anchored on the first due date. Month ends are clamped (Jan 31 -> Feb 28). */
export function dueDates(frequency: Frequency, firstDueDate: string, n: number, rule: WeekendRule = "NONE", holidays: string[] = []) {
  const out: string[] = [];
  const { y, m, d } = parts(firstDueDate);
  if (frequency === "WEEKLY" || frequency === "BIWEEKLY") {
    const step = frequency === "WEEKLY" ? 7 : 14;
    for (let k = 0; k < n; k += 1) out.push(addDays(firstDueDate, k * step));
  } else if (frequency === "MONTHLY") {
    for (let k = 0; k < n; k += 1) { const t = addMonths(y, m, k); out.push(fmt(t.y, t.m, Math.min(d, monthEnd(t.y, t.m)))); }
  } else {
    // Semimonthly: two dates a month, 15 days apart (for example the 1st and 16th, or the 15th and the 30th / month end).
    const early = d <= 15 ? d : d - 15, late = early + 15;
    let half = d <= 15 ? 0 : 1, cur = { y, m };
    for (let k = 0; k < n; k += 1) {
      const day = half === 0 ? early : Math.min(late, monthEnd(cur.y, cur.m));
      out.push(fmt(cur.y, cur.m, day));
      if (half === 1) cur = addMonths(cur.y, cur.m, 1);
      half = 1 - half;
    }
  }
  return out.map(day => applyWeekendRule(day, rule, holidays));
}

/** Interest for `days` days on `principalCents` at `aprBasisPoints` (actual/365), rounded half up to the cent. */
export function simpleInterestCents(principalCents: number, aprBasisPoints: number, days: number) {
  if (principalCents <= 0 || aprBasisPoints <= 0 || days <= 0) return 0;
  return Math.round((principalCents * aprBasisPoints * days) / (10_000 * 365));
}

export function buildSchedule(terms: ContractTerms, options: { weekendRule?: WeekendRule; holidays?: string[] } = {}): Installment[] {
  const n = terms.numberOfPayments;
  if (!Number.isInteger(n) || n < 1 || n > 1040) throw new Error("Number of payments must be between 1 and 1040.");
  if (terms.paymentAmountCents <= 0) throw new Error("Payment amount must be above $0.");
  const dates = dueDates(terms.frequency, terms.firstDueDate, n, options.weekendRule ?? "NONE", options.holidays ?? []);
  if (terms.calcMethod === "FIXED_PAYMENT") {
    const last = terms.totalOfPaymentsCents - terms.paymentAmountCents * (n - 1);
    if (last <= 0) throw new Error("Total of payments is too small for that payment amount and count.");
    return dates.map((dueDate, i) => ({ number: i + 1, dueDate, amountCents: i === n - 1 ? last : terms.paymentAmountCents }));
  }
  const apr = terms.aprBasisPoints ?? 0;
  let balance = terms.amountFinancedCents, prev = terms.contractDate;
  return dates.map((dueDate, i) => {
    const interest = simpleInterestCents(balance, apr, daysBetween(prev, dueDate));
    prev = dueDate;
    const isLast = i === n - 1;
    const amount = isLast ? balance + interest : terms.paymentAmountCents;
    const principal = Math.max(0, Math.min(balance, amount - interest));
    balance -= principal;
    return { number: i + 1, dueDate, amountCents: amount, principalCents: principal, interestCents: interest };
  });
}

// ---------------- Replay ----------------

export type LedgerTxType = "PAYMENT" | "PAYMENT_REVERSAL" | "RETURNED_PAYMENT" | "LATE_FEE" | "LATE_FEE_WAIVER" | "FEE" | "CREDIT" | "ADJUSTMENT" | "PAYOFF" | "CHARGE_OFF" | "RECOVERY" | "REPO_EXPENSE" | "SALE_PROCEEDS" | "SIDE_NOTE_PAYMENT" | "OPENING_BALANCE";
export type LedgerTx = { id: string; type: LedgerTxType; amountCents: number; effectiveDate: string; postedAt?: string; reversesTransactionId?: string | null };
export type AllocationBucket = "FEE" | "LATE_FEE" | "INTEREST" | "INSTALLMENT" | "PRINCIPAL" | "SIDE_NOTE" | "UNAPPLIED";
export type Allocation = { bucket: AllocationBucket; amountCents: number; installmentNumber?: number };
export type AllocationStep = "FEE" | "LATE_FEE" | "PAST_DUE" | "CURRENT" | "PRINCIPAL";
export const DEFAULT_ALLOCATION_ORDER: AllocationStep[] = ["FEE", "LATE_FEE", "PAST_DUE", "CURRENT", "PRINCIPAL"];

/** Money in: these are split across what's owed. */
export const PAYMENT_TYPES: LedgerTxType[] = ["PAYMENT", "PAYOFF", "RECOVERY", "SALE_PROCEEDS", "CREDIT"];
/** Types that can be cancelled by a reversal or a returned payment. */
export const REVERSIBLE_TYPES: LedgerTxType[] = ["PAYMENT", "PAYOFF", "RECOVERY", "SALE_PROCEEDS", "SIDE_NOTE_PAYMENT", "CREDIT"];
/** Types that need an approver when posted (spec 25.3). */
export const NEEDS_APPROVAL: LedgerTxType[] = ["PAYMENT_REVERSAL", "RETURNED_PAYMENT", "ADJUSTMENT", "LATE_FEE_WAIVER", "CHARGE_OFF", "CREDIT"];

export type InstallmentState = Installment & { paidCents: number; paidOn: string | null };

export type LedgerState = {
  asOf: string;
  installments: InstallmentState[];
  feesCents: number;
  lateFeesCents: number;
  sideNoteCents: number;
  /** Simple-interest only. */
  principalCents: number;
  accruedInterestCents: number;
  /** Fixed-payment: unpaid installments. Simple-interest: principal + accrued interest to `asOf`. */
  contractBalanceCents: number;
  /** Everything owed: contract balance + fees + late fees + side note. */
  totalBalanceCents: number;
  pastDueCents: number;
  daysPastDue: number;
  nextDue: { number: number; dueDate: string; amountCents: number } | null;
  /** Past due + fees + late fees + the next installment if due within one period (how DealerCenter shows "payment due"). */
  amountDueCents: number;
  unappliedCents: number;
  chargedOffCents: number;
  recoveredCents: number;
  paidOff: boolean;
  allocations: Record<string, Allocation[]>;
  reversed: string[];
  warnings: string[];
};

const PERIOD_DAYS: Record<Frequency, number> = { WEEKLY: 7, BIWEEKLY: 14, SEMIMONTHLY: 16, MONTHLY: 31 };

export function replayLedger(terms: ContractTerms, schedule: Installment[], transactions: LedgerTx[], asOf: string, order: AllocationStep[] = DEFAULT_ALLOCATION_ORDER): LedgerState {
  const warnings: string[] = [];
  const reversedIds = new Set<string>();
  for (const t of transactions) {
    if ((t.type === "PAYMENT_REVERSAL" || t.type === "RETURNED_PAYMENT") && t.reversesTransactionId) {
      const target = transactions.find(x => x.id === t.reversesTransactionId);
      if (!target) warnings.push(`Reversal ${t.id} points at a transaction that isn't on this contract.`);
      else if (!REVERSIBLE_TYPES.includes(target.type)) warnings.push(`Reversal ${t.id} points at a ${target.type}, which can't be reversed.`);
      else if (target.effectiveDate > asOf) continue;
      else reversedIds.add(target.id);
    }
  }
  const active = transactions
    .filter(t => t.effectiveDate <= asOf && !reversedIds.has(t.id) && t.type !== "PAYMENT_REVERSAL" && t.type !== "RETURNED_PAYMENT")
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate) || (a.postedAt ?? "").localeCompare(b.postedAt ?? "") || a.id.localeCompare(b.id));

  const inst: InstallmentState[] = schedule.map(i => ({ ...i, paidCents: 0, paidOn: null }));
  const si = terms.calcMethod === "SIMPLE_INTEREST";
  const apr = terms.aprBasisPoints ?? 0;
  let fees = 0, lateFees = 0, sideNote = terms.sideNoteCents, unapplied = 0, chargedOff = 0, recovered = 0;
  let principal = si ? terms.amountFinancedCents : 0, accrued = 0, lastAccrual = terms.contractDate, isChargedOff = false;
  const allocations: Record<string, Allocation[]> = {};

  const accrueTo = (date: string) => {
    if (!si || date <= lastAccrual) return;
    accrued += simpleInterestCents(principal, apr, daysBetween(lastAccrual, date));
    lastAccrual = date;
  };
  const unpaid = (i: InstallmentState) => i.amountCents - i.paidCents;
  const payInstallment = (i: InstallmentState, money: number, date: string, out: Allocation[], bucket: AllocationBucket = "INSTALLMENT") => {
    const take = Math.min(money, unpaid(i));
    if (take <= 0) return 0;
    i.paidCents += take;
    if (i.paidCents >= i.amountCents) i.paidOn = date;
    if (bucket === "INSTALLMENT") out.push({ bucket, amountCents: take, installmentNumber: i.number });
    return take;
  };
  /** Simple-interest: money toward installments pays accrued interest first, then principal. */
  const payInterestPrincipal = (money: number, out: Allocation[]) => {
    let left = money;
    const interest = Math.min(left, accrued); if (interest > 0) { accrued -= interest; left -= interest; out.push({ bucket: "INTEREST", amountCents: interest }); }
    const prin = Math.min(left, principal); if (prin > 0) { principal -= prin; left -= prin; out.push({ bucket: "PRINCIPAL", amountCents: prin }); }
    return money - left;
  };

  for (const t of active) {
    accrueTo(t.effectiveDate);
    const out: Allocation[] = [];
    allocations[t.id] = out;
    switch (t.type) {
      case "FEE": case "REPO_EXPENSE": fees += t.amountCents; break;
      case "LATE_FEE": lateFees += t.amountCents; break;
      case "LATE_FEE_WAIVER": {
        const w = Math.min(t.amountCents, lateFees); lateFees -= w;
        if (w < t.amountCents) warnings.push(`Waiver ${t.id} is larger than the late fees owed; the extra ${t.amountCents - w} cents was ignored.`);
        out.push({ bucket: "LATE_FEE", amountCents: w });
        break;
      }
      case "ADJUSTMENT": {
        if (t.amountCents >= 0) { fees += t.amountCents; out.push({ bucket: "FEE", amountCents: t.amountCents }); }
        else applyPayment(-t.amountCents, t.effectiveDate, out);
        break;
      }
      case "CHARGE_OFF": {
        accrueTo(t.effectiveDate);
        const state = totals(t.effectiveDate);
        chargedOff = state.total;
        isChargedOff = true;
        break;
      }
      case "OPENING_BALANCE": {
        // The remaining contract balance when the account moved over. Earlier installments are treated as paid.
        if (si) { principal = t.amountCents; accrued = 0; lastAccrual = t.effectiveDate; }
        let toCredit = inst.reduce((s, i) => s + unpaid(i), 0) - t.amountCents;
        if (!si && toCredit < 0) warnings.push("The opening balance is larger than the remaining schedule.");
        for (const i of inst) {
          if (si ? i.dueDate >= t.effectiveDate : toCredit <= 0) break;
          const take = si ? unpaid(i) : Math.min(unpaid(i), toCredit);
          i.paidCents += take; if (i.paidCents >= i.amountCents) i.paidOn = t.effectiveDate;
          toCredit -= take;
        }
        break;
      }
      case "SIDE_NOTE_PAYMENT": {
        const s = Math.min(t.amountCents, sideNote); sideNote -= s;
        if (s) out.push({ bucket: "SIDE_NOTE", amountCents: s });
        if (t.amountCents > s) { unapplied += t.amountCents - s; out.push({ bucket: "UNAPPLIED", amountCents: t.amountCents - s }); }
        break;
      }
      default: {
        if (!PAYMENT_TYPES.includes(t.type)) break;
        if (isChargedOff) { recovered += t.amountCents; out.push({ bucket: "UNAPPLIED", amountCents: t.amountCents }); break; }
        applyPayment(t.amountCents, t.effectiveDate, out);
      }
    }
  }

  function applyPayment(amount: number, date: string, out: Allocation[]) {
    let money = amount;
    for (const step of order) {
      if (money <= 0) break;
      if (step === "FEE") { const f = Math.min(money, fees); if (f) { fees -= f; money -= f; out.push({ bucket: "FEE", amountCents: f }); } }
      else if (step === "LATE_FEE") { const l = Math.min(money, lateFees); if (l) { lateFees -= l; money -= l; out.push({ bucket: "LATE_FEE", amountCents: l }); } }
      else if (step === "PAST_DUE" || step === "CURRENT") {
        const targets = step === "PAST_DUE" ? inst.filter(i => i.dueDate < date && unpaid(i) > 0) : inst.filter(i => i.dueDate >= date && unpaid(i) > 0).slice(0, 1);
        for (const i of targets) {
          if (money <= 0) break;
          if (si) {
            const want = Math.min(money, unpaid(i));
            const paid = payInterestPrincipal(want, out);
            payInstallment(i, paid, date, out, "PRINCIPAL");
            money -= paid;
            if (paid < want) break; // loan is fully paid
          } else money -= payInstallment(i, money, date, out);
        }
      } else if (step === "PRINCIPAL") {
        if (si) money -= payInterestPrincipal(money, out);
        else for (const i of inst.filter(x => unpaid(x) > 0)) { if (money <= 0) break; money -= payInstallment(i, money, date, out); }
      }
    }
    // Simple-interest: once principal and interest are fully paid, the loan is done; no later payments are owed.
    if (si && principal <= 0 && accrued <= 0) for (const i of inst) if (unpaid(i) > 0) { i.paidCents = i.amountCents; i.paidOn = date; }
    if (money > 0) { unapplied += money; out.push({ bucket: "UNAPPLIED", amountCents: money }); }
  }

  function totals(date: string) {
    const extraInterest = si ? simpleInterestCents(principal, apr, Math.max(0, daysBetween(lastAccrual, date))) : 0;
    const contract = si ? principal + accrued + extraInterest : inst.reduce((s, i) => s + unpaid(i), 0);
    return { contract, total: contract + fees + lateFees + sideNote, interest: accrued + extraInterest };
  }

  const t = isChargedOff ? { contract: 0, total: 0, interest: 0 } : totals(asOf);
  const due = isChargedOff ? [] : inst.filter(i => i.dueDate < asOf && unpaid(i) > 0);
  const oldest = due[0];
  const upcoming = isChargedOff ? undefined : inst.find(i => i.dueDate >= asOf && unpaid(i) > 0);
  const pastDue = due.reduce((s, i) => s + unpaid(i), 0);
  const upcomingSoon = upcoming && daysBetween(asOf, upcoming.dueDate) <= PERIOD_DAYS[terms.frequency] ? unpaid(upcoming) : 0;
  const allPaid = inst.every(i => unpaid(i) <= 0) && (!si || principal <= 0);
  return {
    asOf, installments: inst, feesCents: isChargedOff ? 0 : fees, lateFeesCents: isChargedOff ? 0 : lateFees, sideNoteCents: isChargedOff ? 0 : sideNote,
    principalCents: si && !isChargedOff ? principal : 0, accruedInterestCents: si ? t.interest : 0,
    contractBalanceCents: t.contract, totalBalanceCents: t.total,
    pastDueCents: pastDue, daysPastDue: oldest ? daysBetween(oldest.dueDate, asOf) : 0,
    nextDue: upcoming ? { number: upcoming.number, dueDate: upcoming.dueDate, amountCents: unpaid(upcoming) } : null,
    amountDueCents: isChargedOff ? 0 : pastDue + fees + lateFees + upcomingSoon,
    unappliedCents: unapplied, chargedOffCents: chargedOff, recoveredCents: recovered,
    paidOff: !isChargedOff && allPaid && fees === 0 && lateFees === 0 && sideNote === 0,
    allocations, reversed: [...reversedIds], warnings
  };
}

/** Plain-English label for an allocation row (receipts and the account page). */
export function allocationLabel(a: Allocation) {
  return a.bucket === "INSTALLMENT" ? `Payment #${a.installmentNumber}` : ({ FEE: "Fees", LATE_FEE: "Late fees", INTEREST: "Interest", PRINCIPAL: "Principal", SIDE_NOTE: "Side note", UNAPPLIED: "Unapplied (extra)" } as const)[a.bucket as Exclude<AllocationBucket, "INSTALLMENT">];
}
