/**
 * DealerCenter history import into the shadow ledger (spec 26). One-time and re-runnable:
 * every row gets a fingerprint, so importing the same file again adds nothing.
 *
 *  1. CONTRACTS file -> a servicing contract + schedule for each matching account (accounts
 *     that already have one are left alone).
 *  2. PAYMENTS file (optional) -> historical ledger entries.
 *  3. Or, without payment history: OPENING BALANCES from the latest DealerCenter import, so
 *     every account starts from DealerCenter's own numbers.
 *
 * Each step has a dry run ("Check file") that changes nothing.
 */
import { createHash } from "node:crypto";

import type { LedgerTransactionType } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { CollectionsError } from "../config/permissions";
import { buildSchedule, type ContractTerms, type Installment } from "../domain/ledger";
import { chicagoToday, dateOnly, toYmd } from "../domain/money-dates";
import { HISTORY_PROFILES, historyTxType, parseAprBasisPoints, parseCalcMethod, parseFrequency, withColumnMap, type HistoryKind } from "../import/history-profiles";
import { MAX_IMPORT_BYTES, parseTable, readTable, type ParsedRow } from "../import/parse";
import { collectionsAccess, recordAccountEvent } from "./access";
import { loadCollectionsSettings } from "./settings-store";


export type MigrationReport = {
  kind: HistoryKind | "OPENING_BALANCES";
  dryRun: boolean;
  headers: string[];
  mapping: Record<string, string | null>;
  rows: number;
  matchedAccounts: number;
  unmatchedAccounts: string[];
  created: number;
  skipped: Array<{ account: string; reason: string }>;
  errors: string[];
};

const fingerprint = (...parts: unknown[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);

export async function importHistory(actor: AuthenticatedUser | null, input: { kind: HistoryKind; fileName: string; bytes: Uint8Array; columnMap?: Record<string, string>; dryRun: boolean }): Promise<MigrationReport> {
  const access = await collectionsAccess(actor, "APPROVE_MONEY");
  if (input.bytes.byteLength > MAX_IMPORT_BYTES) throw new CollectionsError("The file is larger than 10 MB.", 413);
  const settings = await loadCollectionsSettings(access.organizationId);
  const profile = withColumnMap(HISTORY_PROFILES[input.kind], input.columnMap ?? {});
  const table = await readTable(input.bytes, input.fileName);
  const parsed = parseTable(table, profile);
  const norm = (h: string) => h.trim().toLowerCase();
  const mapping = Object.fromEntries(profile.fields.map(f => [f.field, table.headers.find(h => f.columns.map(norm).includes(norm(String(h)))) ?? null]));
  const report: MigrationReport = { kind: input.kind, dryRun: input.dryRun, headers: table.headers.map(String), mapping, rows: parsed.rows.length, matchedAccounts: 0, unmatchedAccounts: [], created: 0, skipped: [], errors: parsed.errors.slice(0, 50).map(e => e.message) };
  if (parsed.missingColumns.length) return report;

  const externals = [...new Set(parsed.rows.map(r => String(r.values.externalAccountId)))];
  const accounts = await prisma.collectionAccount.findMany({ where: { organizationId: access.organizationId, externalAccountId: { in: externals } }, select: { id: true, externalAccountId: true, accountType: true, contractDate: true, servicingContract: { select: { id: true } } } });
  const byExternal = new Map(accounts.map(a => [a.externalAccountId, a]));
  report.unmatchedAccounts = externals.filter(e => !byExternal.has(e)).slice(0, 200);
  report.matchedAccounts = externals.length - externals.filter(e => !byExternal.has(e)).length;

  if (input.kind === "CONTRACTS") {
    const plans: Array<{ account: (typeof accounts)[number]; terms: ContractTerms; schedule: Installment[]; row: ParsedRow }> = [];
    for (const row of parsed.rows) {
      const v = row.values, ext = String(v.externalAccountId);
      const account = byExternal.get(ext);
      if (!account) continue;
      if (account.servicingContract) { report.skipped.push({ account: ext, reason: "already has a contract" }); continue; }
      const frequency = parseFrequency(v.frequency);
      if (!frequency) { report.skipped.push({ account: ext, reason: `payment frequency "${v.frequency ?? ""}" not recognized` }); continue; }
      const calcMethod = parseCalcMethod(v.calcMethod);
      const apr = parseAprBasisPoints(v.apr);
      const payment = Number(v.paymentAmount), count = Number(v.numberOfPayments);
      const terms: ContractTerms = {
        calcMethod, frequency, contractDate: String(v.contractDate ?? toYmd(account.contractDate) ?? v.firstDueDate), firstDueDate: String(v.firstDueDate),
        numberOfPayments: count, paymentAmountCents: payment, totalOfPaymentsCents: Number(v.totalOfPayments ?? 0) || payment * count,
        amountFinancedCents: Number(v.amountFinanced ?? 0), aprBasisPoints: apr, sideNoteCents: Number(v.sideNote ?? 0)
      };
      if (calcMethod === "SIMPLE_INTEREST" && (!apr || !terms.amountFinancedCents)) { report.skipped.push({ account: ext, reason: "simple-interest contract needs APR and amount financed" }); continue; }
      try { plans.push({ account, terms, schedule: buildSchedule(terms, { weekendRule: settings.ledger.weekendRule, holidays: settings.ledger.holidays }), row }); }
      catch (e) { report.skipped.push({ account: ext, reason: e instanceof Error ? e.message : "terms don't work" }); }
    }
    if (input.dryRun) { report.created = plans.length; return report; }
    await prisma.$transaction(async tx => {
      for (const p of plans) {
        if (await tx.servicingContract.findUnique({ where: { accountId: p.account.id }, select: { id: true } })) continue;
        const v = p.row.values;
        const contract = await tx.servicingContract.create({ data: {
          organizationId: access.organizationId, accountId: p.account.id, accountType: p.account.accountType, calcMethod: p.terms.calcMethod,
          cashPriceCents: Number(v.cashPrice ?? 0), downPaymentCents: Number(v.downPayment ?? 0), sideNoteCents: p.terms.sideNoteCents,
          amountFinancedCents: p.terms.amountFinancedCents, totalOfPaymentsCents: p.schedule.reduce((s, i) => s + i.amountCents, 0), aprBasisPoints: p.terms.aprBasisPoints,
          paymentAmountCents: p.terms.paymentAmountCents, frequency: p.terms.frequency, numberOfPayments: p.terms.numberOfPayments,
          firstDueDate: dateOnly(p.terms.firstDueDate), contractDate: dateOnly(p.terms.contractDate), source: "DMS_MIGRATION", createdByUserId: access.actor.id
        } });
        await tx.paymentSchedule.create({ data: { organizationId: access.organizationId, contractId: contract.id, version: 1, reason: "Imported from DealerCenter", createdByUserId: access.actor.id,
          installments: { create: p.schedule.map(i => ({ number: i.number, dueDate: dateOnly(i.dueDate), amountCents: i.amountCents, principalCents: i.principalCents ?? null, interestCents: i.interestCents ?? null })) } } });
        report.created += 1;
      }
      await recordAccountEvent(tx, { organizationId: access.organizationId, type: "LEDGER_MIGRATION", userId: access.actor.id, after: { kind: "CONTRACTS", fileName: input.fileName, created: report.created } });
    }, { timeout: 300_000 });
    return report;
  }

  // PAYMENTS: historical entries, bulk-inserted; the fingerprint makes re-imports a no-op.
  const contracts = await prisma.servicingContract.findMany({ where: { organizationId: access.organizationId, accountId: { in: accounts.map(a => a.id) } }, select: { id: true, accountId: true } });
  const contractByAccount = new Map(contracts.map(c => [c.accountId, c.id]));
  type Row = { contractId: string; accountId: string; type: LedgerTransactionType; amountCents: number; date: string; reference: string | null; method: string | null; key: string };
  const rows: Row[] = [];
  for (const row of parsed.rows) {
    const v = row.values, ext = String(v.externalAccountId);
    const account = byExternal.get(ext);
    if (!account) continue;
    const contractId = contractByAccount.get(account.id);
    if (!contractId) { report.skipped.push({ account: ext, reason: "no contract yet: import the contracts file first" }); continue; }
    const amount = Number(v.amount);
    const type = historyTxType(v.type, amount) as LedgerTransactionType;
    rows.push({ contractId, accountId: account.id, type, amountCents: Math.abs(amount), date: String(v.date), reference: v.reference ? String(v.reference) : null, method: v.method ? String(v.method) : null, key: `hist:${access.organizationId}:${fingerprint(ext, v.date, v.amount, v.type ?? "", v.reference ?? "", row.rowNumber)}` });
  }
  if (input.dryRun) { report.created = rows.length; return report; }
  await prisma.$transaction(async tx => {
    // Returned payments point at the latest earlier payment of the same amount on that contract.
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const inserted: Array<{ id: string; contractId: string; type: string; amountCents: number; date: string }> = [];
    for (const r of sorted) {
      if (await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: r.key }, select: { id: true } })) continue;
      let reverses: string | null = null;
      if (r.type === "RETURNED_PAYMENT") {
        const reversedIds = new Set((await tx.ledgerTransaction.findMany({ where: { contractId: r.contractId, reversesTransactionId: { not: null } }, select: { reversesTransactionId: true } })).map(x => x.reversesTransactionId));
        const pool = [...inserted, ...(await tx.ledgerTransaction.findMany({ where: { contractId: r.contractId, type: "PAYMENT", amountCents: r.amountCents }, select: { id: true, contractId: true, type: true, amountCents: true, effectiveDate: true } })).map(t => ({ ...t, date: toYmd(t.effectiveDate)! }))];
        const target = pool.filter(t => t.contractId === r.contractId && t.type === "PAYMENT" && t.amountCents === r.amountCents && t.date <= r.date && !reversedIds.has(t.id)).sort((a, b) => b.date.localeCompare(a.date))[0];
        if (!target) { report.skipped.push({ account: r.accountId, reason: `returned payment on ${r.date} has no matching earlier payment` }); continue; }
        reverses = target.id;
      }
      const created = await tx.ledgerTransaction.create({ data: {
        organizationId: access.organizationId, contractId: r.contractId, accountId: r.accountId, type: r.type, amountCents: r.amountCents, effectiveDate: dateOnly(r.date),
        source: "IMPORT", referenceNumber: r.reference, memo: `Imported from DealerCenter history${r.method ? ` (${r.method})` : ""}`, enteredByUserId: access.actor.id,
        approvedByUserId: ["RETURNED_PAYMENT", "LATE_FEE_WAIVER", "CREDIT"].includes(r.type) ? access.actor.id : null, reversesTransactionId: reverses, idempotencyKey: r.key
      }, select: { id: true } });
      inserted.push({ id: created.id, contractId: r.contractId, type: r.type, amountCents: r.amountCents, date: r.date });
      report.created += 1;
    }
    await recordAccountEvent(tx, { organizationId: access.organizationId, type: "LEDGER_MIGRATION", userId: access.actor.id, after: { kind: "PAYMENTS", fileName: input.fileName, created: report.created } });
  }, { timeout: 300_000 });
  return report;
}

/**
 * Start every contract that has no entries yet from DealerCenter's latest numbers: an opening
 * balance (balance minus late and other fees) plus those fees, dated the import's "as of" day.
 */
export async function loadOpeningBalances(actor: AuthenticatedUser | null, input: { dryRun: boolean }): Promise<MigrationReport> {
  const access = await collectionsAccess(actor, "APPROVE_MONEY");
  const contracts = await prisma.servicingContract.findMany({
    where: { organizationId: access.organizationId, transactions: { none: {} } },
    select: { id: true, accountId: true, account: { select: { externalAccountId: true, snapshots: { orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], take: 1, select: { id: true, asOfDate: true, totalBalanceCents: true, lateCents: true, otherCents: true } } } } }
  });
  const report: MigrationReport = { kind: "OPENING_BALANCES", dryRun: input.dryRun, headers: [], mapping: {}, rows: contracts.length, matchedAccounts: contracts.length, unmatchedAccounts: [], created: 0, skipped: [], errors: [] };
  const ready = contracts.filter(c => { if (!c.account.snapshots[0]) report.skipped.push({ account: c.account.externalAccountId, reason: "no DealerCenter import yet" }); return Boolean(c.account.snapshots[0]); });
  if (input.dryRun) { report.created = ready.length; return report; }
  await prisma.$transaction(async tx => {
    for (const c of ready) {
      const s = c.account.snapshots[0];
      const date = toYmd(s.asOfDate)!;
      const contractBalance = Math.max(0, s.totalBalanceCents - s.lateCents - s.otherCents);
      const base = { organizationId: access.organizationId, contractId: c.id, accountId: c.accountId, effectiveDate: dateOnly(date), source: "IMPORT" as const, enteredByUserId: access.actor.id, memo: `Opening balance from the DealerCenter import of ${date}` };
      await tx.ledgerTransaction.create({ data: { ...base, type: "OPENING_BALANCE", amountCents: contractBalance, idempotencyKey: `open:${c.id}` } });
      if (s.lateCents > 0) await tx.ledgerTransaction.create({ data: { ...base, type: "LATE_FEE", amountCents: s.lateCents, idempotencyKey: `open-late:${c.id}` } });
      if (s.otherCents > 0) await tx.ledgerTransaction.create({ data: { ...base, type: "FEE", amountCents: s.otherCents, idempotencyKey: `open-other:${c.id}` } });
      report.created += 1;
    }
    await recordAccountEvent(tx, { organizationId: access.organizationId, type: "LEDGER_MIGRATION", userId: access.actor.id, after: { kind: "OPENING_BALANCES", created: report.created, asOf: chicagoToday() } });
  }, { timeout: 300_000 });
  return report;
}
