/**
 * Shadow posting and reconciliation (spec 26). DealerCenter is the system of record in
 * Release 1 (SYSTEM_OF_RECORD is locked), so this only *checks* the app's own ledger
 * against DealerCenter; it never changes DealerCenter or what a customer owes.
 *
 * Shadow posting: each daily Active Accounts import is compared with the one before it.
 *   - late-fee balance went up  -> LATE_FEE of the increase
 *   - other-fee balance went up -> FEE of the increase
 *   - total balance went down (after those fees) -> PAYMENT of the difference
 * These are clearly marked "inferred". A real payment-history import (migration-service) is
 * more exact; inference only runs for imports after the last imported history entry.
 *
 * Reconciliation: for every account with a contract, the ledger replayed to the import's
 * date is compared with DealerCenter's total balance, amount due, days past due and late fees.
 */
import { accountRefs } from "../domain/account-ref";
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { resolveSystemOfRecord } from "../config/flags";
import { CollectionsError } from "../config/permissions";
import { addDays, chicagoToday, toYmd } from "../domain/money-dates";
import type { CollectionsSettings } from "../domain/settings";
import { collectionsAccess, recordAccountEvent } from "./access";
import { findAccount, text, visibilityWhere } from "./account-service";
import { loadLedger, postLedgerTransaction } from "./ledger-service";
import { loadCollectionsSettings } from "./settings-store";

type Db = Prisma.TransactionClient;

export type Compared = { field: "totalBalance" | "amountDue" | "daysPastDue" | "lateFees"; dms: number; module: number; difference: number };
export type ReconRow = { accountId: string; externalAccountId: string; refs: string; name: string; asOfDate: string | null; status: "MATCHED" | "DIFFERENT" | "NO_CONTRACT" | "NO_IMPORT"; compared: Compared[]; causes: string[]; note: string | null };

/** Allowed rounding difference, in cents. */
export const MONEY_TOLERANCE_CENTS = 1;

/** Plain-English guess at why the numbers differ. Only a hint for the person checking. */
export function likelyCauses(compared: Compared[], context: { nextDueCents: number; lateDms: number; inferredOnly: boolean }) {
  const causes: string[] = [];
  const d = Object.fromEntries(compared.map(c => [c.field, c])) as Record<Compared["field"], Compared>;
  if (d.daysPastDue && Math.abs(d.daysPastDue.difference) === 1) causes.push("Days past due off by one: DealerCenter may count the due date itself.");
  else if (d.daysPastDue && d.daysPastDue.difference !== 0) causes.push("Due dates differ: check the payment frequency and first due date on the contract.");
  if (d.lateFees && d.lateFees.difference !== 0) causes.push(d.lateFees.difference > 0 ? "DealerCenter charged a late fee the ledger doesn't have." : "The ledger has a late fee DealerCenter doesn't show (paid or waived there?).");
  if (d.amountDue && context.nextDueCents && Math.abs(Math.abs(d.amountDue.difference) - context.nextDueCents) <= MONEY_TOLERANCE_CENTS) causes.push("Amount due differs by one payment: DealerCenter may include (or leave out) the upcoming payment.");
  if (d.totalBalance && d.totalBalance.difference !== 0 && d.lateFees && Math.abs(d.totalBalance.difference - d.lateFees.difference) <= MONEY_TOLERANCE_CENTS && d.lateFees.difference !== 0) causes.push("The balance difference is the late-fee difference.");
  if (d.totalBalance && d.totalBalance.difference !== 0 && context.inferredOnly) causes.push("Payments were inferred from daily imports; importing DealerCenter's payment history would be more exact.");
  if (!causes.length && compared.some(c => c.difference !== 0)) causes.push("Not sure: compare the account's payment history in DealerCenter with the shadow ledger entries.");
  return causes;
}

/** Post the changes implied by consecutive DealerCenter imports into the shadow ledger. Idempotent per import. */
export async function shadowPostFromImports(db: Db, organizationId: string, settings: CollectionsSettings) {
  const contracts = await db.servicingContract.findMany({ where: { organizationId, status: "ACTIVE" }, select: { id: true, accountId: true } });
  let posted = 0;
  for (const c of contracts) {
    const lastHistory = await db.ledgerTransaction.findFirst({ where: { contractId: c.id, source: "IMPORT", NOT: { idempotencyKey: { startsWith: "shadow:" } } }, orderBy: { effectiveDate: "desc" }, select: { effectiveDate: true } });
    if (!lastHistory) continue; // the ledger needs a starting point (history or opening balance) first
    const from = toYmd(lastHistory.effectiveDate)!;
    const snaps = await db.collectionAccountSnapshot.findMany({ where: { accountId: c.accountId, asOfDate: { gte: new Date(`${from}T00:00:00Z`) } }, orderBy: [{ asOfDate: "asc" }, { createdAt: "asc" }], select: { id: true, asOfDate: true, totalBalanceCents: true, lateCents: true, otherCents: true } });
    for (let i = 1; i < snaps.length; i += 1) {
      const prev = snaps[i - 1], now = snaps[i];
      if (toYmd(now.asOfDate)! <= from) continue;
      const date = toYmd(now.asOfDate)!;
      const late = now.lateCents - prev.lateCents, other = now.otherCents - prev.otherCents;
      const payment = prev.totalBalanceCents - now.totalBalanceCents + Math.max(0, late) + Math.max(0, other);
      const base = { organizationId, contractId: c.id, accountId: c.accountId, effectiveDate: date, source: "IMPORT" as const, enteredByUserId: null, settings };
      const memo = `Inferred from the DealerCenter import of ${date}`;
      for (const [type, amount, suffix] of [["LATE_FEE", late, "late"], ["FEE", other, "fee"], ["PAYMENT", payment, "pay"]] as const) {
        if (amount <= 0) continue;
        const r = await postLedgerTransaction(db, { ...base, type, amountCents: amount, memo, idempotencyKey: `shadow:${now.id}:${suffix}` });
        if (!r.duplicate) posted += 1;
      }
    }
  }
  return { posted };
}

/** Compare every contract with its latest DealerCenter import; store the day's summary and each difference. */
export async function reconcileOrganization(db: Db, organizationId: string, settings: CollectionsSettings, today = chicagoToday()) {
  const rows = await buildRows(db, organizationId, settings, {});
  const counted = rows.filter(r => r.status === "MATCHED" || r.status === "DIFFERENT");
  const matched = counted.filter(r => r.status === "MATCHED").length;
  for (const r of rows.filter(x => x.status === "DIFFERENT")) {
    const exists = await db.collectionAccountEvent.findFirst({ where: { organizationId, accountId: r.accountId, type: "RECONCILIATION_DIFF", reason: today }, select: { id: true } });
    if (!exists) await db.collectionAccountEvent.create({ data: { organizationId, accountId: r.accountId, type: "RECONCILIATION_DIFF", reason: today, after: { compared: r.compared, causes: r.causes } as unknown as Prisma.InputJsonValue } });
  }
  const summary = { date: today, accounts: counted.length, matched, differences: counted.length - matched, noContract: rows.filter(r => r.status === "NO_CONTRACT").length, matchRatePercent: counted.length ? Math.round((matched / counted.length) * 1000) / 10 : null };
  await db.collectionAccountEvent.create({ data: { organizationId, type: "RECONCILIATION_SUMMARY", reason: today, after: summary } });
  return summary;
}

async function buildRows(db: Db, organizationId: string, settings: CollectionsSettings, where: Prisma.CollectionAccountWhereInput): Promise<ReconRow[]> {
  const accounts = await db.collectionAccount.findMany({
    where: { organizationId, closedStatus: null, archivedAt: null, ...where }, orderBy: { buyerNameRaw: "asc" },
    select: { id: true, externalAccountId: true, dealNumber: true, stockNumberRaw: true, vin: true, buyerNameRaw: true, servicingContract: { select: { id: true } }, snapshots: { orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], take: 1, select: { asOfDate: true, totalBalanceCents: true, amountDueCents: true, daysPastDue: true, lateCents: true } } }
  });
  const notes = await db.collectionAccountEvent.findMany({ where: { organizationId, type: "RECONCILIATION_NOTE", accountId: { in: accounts.map(a => a.id) } }, orderBy: { occurredAt: "desc" }, select: { accountId: true, reason: true } });
  const noteBy = new Map<string, string>();
  for (const n of notes) if (n.accountId && !noteBy.has(n.accountId)) noteBy.set(n.accountId, n.reason);
  const out: ReconRow[] = [];
  for (const a of accounts) {
    const snap = a.snapshots[0];
    const row: ReconRow = { accountId: a.id, externalAccountId: a.externalAccountId, refs: accountRefs(a), name: a.buyerNameRaw, asOfDate: toYmd(snap?.asOfDate ?? null), status: "NO_CONTRACT", compared: [], causes: [], note: noteBy.get(a.id) ?? null };
    if (!a.servicingContract) { out.push(row); continue; }
    if (!snap) { out.push({ ...row, status: "NO_IMPORT" }); continue; }
    const { state, transactions } = await loadLedger(db, a.servicingContract.id, settings, toYmd(snap.asOfDate)!);
    const compared: Compared[] = [
      { field: "totalBalance", dms: snap.totalBalanceCents, module: state.totalBalanceCents, difference: snap.totalBalanceCents - state.totalBalanceCents },
      { field: "amountDue", dms: snap.amountDueCents, module: state.amountDueCents, difference: snap.amountDueCents - state.amountDueCents },
      { field: "daysPastDue", dms: snap.daysPastDue, module: state.daysPastDue, difference: snap.daysPastDue - state.daysPastDue },
      { field: "lateFees", dms: snap.lateCents, module: state.lateFeesCents, difference: snap.lateCents - state.lateFeesCents }
    ];
    const isOff = (c: Compared) => (c.field === "daysPastDue" ? c.difference !== 0 : Math.abs(c.difference) > MONEY_TOLERANCE_CENTS);
    const different = compared.some(isOff);
    const inferredOnly = transactions.some(t => t.idempotencyKey?.startsWith("shadow:")) && !transactions.some(t => t.idempotencyKey?.startsWith("hist:"));
    out.push({ ...row, status: different ? "DIFFERENT" : "MATCHED", compared, causes: different ? likelyCauses(compared, { nextDueCents: state.nextDue?.amountCents ?? 0, lateDms: snap.lateCents, inferredOnly }) : [] });
  }
  return out;
}

/** Reconciliation screen: today's comparison, the daily match-rate history and the cutover gate. */
export async function getReconciliation(actor: AuthenticatedUser | null, filter: "ALL" | "DIFFERENT" | "MATCHED" | "NO_CONTRACT" = "DIFFERENT") {
  const access = await collectionsAccess(actor, "VIEW_DASHBOARD");
  const settings = await loadCollectionsSettings(access.organizationId);
  const rows = await prisma.$transaction(tx => buildRows(tx, access.organizationId, settings, {}), { timeout: 120_000 }).then(async all => {
    const visible = await visibilityWhere(access);
    if (!Object.keys(visible).length) return all;
    const ids = new Set((await prisma.collectionAccount.findMany({ where: { organizationId: access.organizationId, ...visible }, select: { id: true } })).map(a => a.id));
    return all.filter(r => ids.has(r.accountId));
  });
  const history = await prisma.collectionAccountEvent.findMany({ where: { organizationId: access.organizationId, type: "RECONCILIATION_SUMMARY" }, orderBy: { occurredAt: "desc" }, take: 400, select: { after: true } });
  const byDate = new Map<string, { date: string; accounts: number; matched: number; differences: number; matchRatePercent: number | null }>();
  for (const h of history) { const s = h.after as { date: string; accounts: number; matched: number; differences: number; matchRatePercent: number | null }; if (!byDate.has(s.date)) byDate.set(s.date, s); }
  const days = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  // Cutover gate (spec 26): every account matched on every daily import for 2 full monthly cycles, or each exception has a note.
  const windowStart = addDays(chicagoToday(), -62);
  const diffs = await prisma.collectionAccountEvent.findMany({ where: { organizationId: access.organizationId, type: "RECONCILIATION_DIFF", reason: { gte: windowStart } }, select: { accountId: true } });
  const unexplained = new Set(diffs.map(d => d.accountId).filter((id): id is string => Boolean(id) && !rows.find(r => r.accountId === id)?.note));
  const daysCovered = days.filter(d => d.date >= windowStart).length;
  const counts = { all: rows.length, matched: rows.filter(r => r.status === "MATCHED").length, different: rows.filter(r => r.status === "DIFFERENT").length, noContract: rows.filter(r => r.status === "NO_CONTRACT" || r.status === "NO_IMPORT").length };
  return {
    systemOfRecord: resolveSystemOfRecord(),
    counts,
    matchRatePercent: counts.matched + counts.different ? Math.round((counts.matched / (counts.matched + counts.different)) * 1000) / 10 : null,
    rows: rows.filter(r => filter === "ALL" || (filter === "NO_CONTRACT" ? r.status === "NO_CONTRACT" || r.status === "NO_IMPORT" : r.status === filter)),
    filter, history: days.slice(0, 90),
    gate: { daysCovered, daysNeeded: 60, unexplainedAccounts: unexplained.size, met: daysCovered >= 60 && unexplained.size === 0 && counts.noContract === 0, lockedInRelease1: true },
    canAct: access.role === "ADMIN"
  };
}

/** An owner note explaining a difference (counts toward the cutover gate). */
export async function addReconciliationNote(actor: AuthenticatedUser | null, accountId: string, note: string) {
  const access = await collectionsAccess(actor, "APPROVE_MONEY");
  await findAccount(prisma, access, accountId);
  const reason = text(note, 1000);
  if (reason.trim().length === 0) throw new CollectionsError("Explain the difference.");
  await recordAccountEvent(prisma, { organizationId: access.organizationId, accountId, type: "RECONCILIATION_NOTE", userId: access.actor.id, reason });
  return { ok: true as const, message: "Note saved." };
}

/** Run shadow posting and reconciliation now (also part of the automations). */
export async function runReconciliationNow(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "APPROVE_MONEY");
  const settings = await loadCollectionsSettings(access.organizationId);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collections-automation:${access.organizationId}`}))`;
    const shadow = await shadowPostFromImports(tx, access.organizationId, settings);
    const summary = await reconcileOrganization(tx, access.organizationId, settings);
    return { ok: true as const, message: `Checked ${summary.accounts} accounts: ${summary.matched} match, ${summary.differences} differ. ${shadow.posted} entries posted from imports.`, summary };
  }, { timeout: 300_000 });
}
