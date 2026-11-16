import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { afterImportCommitted } from "@/features/collections/server/after-import";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { getAccountLedger } from "@/features/collections/server/ledger-service";
import { importHistory, loadOpeningBalances } from "@/features/collections/server/migration-service";
import { addReconciliationNote, getReconciliation, likelyCauses, runReconciliationNow } from "@/features/collections/server/reconciliation-service";
import { historyTxType, parseAprBasisPoints, parseCalcMethod, parseFrequency } from "@/features/collections/import/history-profiles";
import { addDays, chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, csvWith, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

const enc = (text: string) => new TextEncoder().encode(text);

describe("history file helpers (no database)", () => {
  it("reads DealerCenter-style frequencies, methods, rates and transaction types", () => {
    expect(["Weekly", "W", "BI-WEEKLY", "Every 2 weeks", "Semi-Monthly", "Twice a month", "Monthly"].map(parseFrequency)).toEqual(["WEEKLY", "WEEKLY", "BIWEEKLY", "BIWEEKLY", "SEMIMONTHLY", "SEMIMONTHLY", "MONTHLY"]);
    expect(parseFrequency("quarterly")).toBeNull();
    expect(parseCalcMethod("Simple Interest")).toBe("SIMPLE_INTEREST");
    expect(parseCalcMethod("Precomputed")).toBe("FIXED_PAYMENT");
    expect([parseAprBasisPoints("18%"), parseAprBasisPoints("0.18"), parseAprBasisPoints("")]).toEqual([1800, 1800, null]);
    expect(["Payment", "NSF Return", "Late Charge", "Late Fee Waived", "Payoff", "Repo Fee", "Returned Check Fee"].map(t => historyTxType(t, 100))).toEqual(["PAYMENT", "RETURNED_PAYMENT", "LATE_FEE", "LATE_FEE_WAIVER", "PAYOFF", "FEE", "FEE"]);
  });
  it("explains likely causes in plain English", () => {
    const causes = likelyCauses([{ field: "daysPastDue", dms: 8, module: 7, difference: 1 }, { field: "amountDue", dms: 30000, module: 15000, difference: 15000 }], { nextDueCents: 15000, lateDms: 0, inferredOnly: false });
    expect(causes.join(" ")).toMatch(/off by one.*upcoming payment/s);
  });
});

describe.skipIf(!RUN_COLLECTIONS_DB)("history import, shadow posting and reconciliation (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  const today = chicagoToday();
  const id = async (ext: string) => (await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: ext } })).id;
  // FAKE-1001: $4,000 balance, $150 due -> 27 weekly payments of $150 (last $100), first due today: should match exactly.
  // FAKE-1002: $4,133.37 balance -> first due a week ago, so the ledger says 7 days late where DealerCenter says 0.
  const contracts = enc([
    "AccountId,Pmt Freq,NumberOfPayments,PaymentAmount,TotalOfPayments,FirstPaymentDate,DealDate",
    `FAKE-1001,Weekly,27,$150.00,"$4,000.00",${today},${addDays(today, -60)}`,
    `FAKE-1002,Weekly,24,$175.00,"$4,200.00",${addDays(today, -7)},${addDays(today, -60)}`,
    `FAKE-1004,Weekly,30,$225.00,"$6,750.00",${addDays(today, -21)},${addDays(today, -40)}`,
    `NOT-AN-ACCOUNT,Weekly,10,$100.00,"$1,000.00",${today},${today}`,
    `FAKE-1005,Quarterly,4,$100.00,$400.00,${today},${today}`
  ].join("\n"));

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    await afterImportCommitted(ctx.owner, await commitCollectionsImport(ctx.owner, preview.runId));
  });

  it("checks the contracts file first, lets a person map a column, and imports once", async () => {
    const first = await importHistory(ctx.owner, { kind: "CONTRACTS", fileName: "contracts.csv", bytes: contracts, dryRun: true });
    expect(first.errors.join(" ")).toMatch(/missing required column/); // "Pmt Freq" isn't a known name
    const map = { frequency: "Pmt Freq" };
    const check = await importHistory(ctx.owner, { kind: "CONTRACTS", fileName: "contracts.csv", bytes: contracts, columnMap: map, dryRun: true });
    expect(check).toMatchObject({ created: 3, matchedAccounts: 4, unmatchedAccounts: ["NOT-AN-ACCOUNT"] });
    expect(check.skipped).toEqual([{ account: "FAKE-1005", reason: 'payment frequency "Quarterly" not recognized' }]);
    expect(await prisma.servicingContract.count({ where: { organizationId: ctx.organizationId } })).toBe(0); // dry run changed nothing
    expect((await importHistory(ctx.owner, { kind: "CONTRACTS", fileName: "contracts.csv", bytes: contracts, columnMap: map, dryRun: false })).created).toBe(3);
    const again = await importHistory(ctx.owner, { kind: "CONTRACTS", fileName: "contracts.csv", bytes: contracts, columnMap: map, dryRun: false });
    expect(again.created).toBe(0);
    expect(again.skipped.filter(s => s.reason === "already has a contract")).toHaveLength(3);
  });

  it("imports payment history once, linking a returned payment to the payment it cancels", async () => {
    const history = enc([
      "AccountId,PaymentDate,Amount,Type,Reference",
      `FAKE-1004,${addDays(today, -21)},$225.00,Payment,R1`,
      `FAKE-1004,${addDays(today, -14)},$225.00,Payment,R2`,
      `FAKE-1004,${addDays(today, -12)},$225.00,NSF Return,R2-NSF`,
      `FAKE-1004,${addDays(today, -12)},$25.00,Returned Check Fee,F1`
    ].join("\n"));
    expect((await importHistory(ctx.owner, { kind: "PAYMENTS", fileName: "payments.csv", bytes: history, dryRun: false })).created).toBe(4);
    expect((await importHistory(ctx.owner, { kind: "PAYMENTS", fileName: "payments.csv", bytes: history, dryRun: false })).created).toBe(0);
    const ledger = await getAccountLedger(ctx.owner, await id("FAKE-1004"));
    expect(ledger.transactions.filter(t => t.reversed).map(t => t.amountCents)).toEqual([22500]);
    expect(ledger.state).toMatchObject({ feesCents: 2500, daysPastDue: 14 }); // payment 2 bounced: #2 (due 14 days ago) is unpaid
  });

  it("opening balances start the other contracts from DealerCenter's numbers; reconciliation compares them", async () => {
    const check = await loadOpeningBalances(ctx.owner, { dryRun: true });
    expect(check.created).toBe(2); // FAKE-1004 already has history
    await loadOpeningBalances(ctx.owner, { dryRun: false });
    expect((await loadOpeningBalances(ctx.owner, { dryRun: false })).created).toBe(0);
    await runReconciliationNow(ctx.owner);
    const all = await getReconciliation(ctx.owner, "ALL");
    const r1 = all.rows.find(r => r.externalAccountId === "FAKE-1001")!;
    const r2 = all.rows.find(r => r.externalAccountId === "FAKE-1002")!;
    expect(r1.status).toBe("MATCHED");
    expect(r2.status).toBe("DIFFERENT");
    expect(r2.compared.find(c => c.field === "totalBalance")!.difference).toBe(0); // opening balance = DealerCenter's
    expect(r2.causes.join(" ")).toMatch(/Due dates differ/);
    expect(all.counts.noContract).toBeGreaterThan(20);
    expect(all.systemOfRecord).toBe("DEALERCENTER");
    expect(all.history[0]).toMatchObject({ date: today });
    expect(all.gate).toMatchObject({ met: false, lockedInRelease1: true });
  });

  it("each daily import posts what changed (inferred) exactly once, and stays matched", async () => {
    const [y, m, d] = addDays(today, 1).split("-");
    const bytes = csvWith(rows => rows.map(row => (row[0] === "FAKE-1001" ? row.map((cell, i) => (i === 20 ? "$3,850.00" : cell)) : row)));
    const preview = await previewCollectionsImport(ctx.owner, { fileName: `Active Accounts ${Number(m)}-${Number(d)}-${y}.csv`, bytes });
    await afterImportCommitted(ctx.owner, await commitCollectionsImport(ctx.owner, preview.runId));
    await runReconciliationNow(ctx.owner);
    const ledger = await getAccountLedger(ctx.owner, await id("FAKE-1001"));
    const inferred = ledger.transactions.filter(t => t.memo.startsWith("Inferred"));
    expect(inferred.map(t => [t.type, t.amountCents])).toEqual([["PAYMENT", 15000]]);
    const row = (await getReconciliation(ctx.owner, "ALL")).rows.find(r => r.externalAccountId === "FAKE-1001")!;
    expect(row.status).toBe("MATCHED");
  });

  it("an owner note explains a difference; collectors can't import or add notes", async () => {
    await expect(addReconciliationNote(ctx.owner, await id("FAKE-1002"), "short")).rejects.toThrow(/at least 10/);
    await addReconciliationNote(ctx.owner, await id("FAKE-1002"), "DealerCenter moved the first due date; confirmed with the deal jacket");
    expect((await getReconciliation(ctx.owner, "DIFFERENT")).rows.find(r => r.externalAccountId === "FAKE-1002")?.note).toMatch(/deal jacket/);
    const collector: AuthenticatedUser = { ...ctx.owner, roles: ["Collections"] };
    process.env.COLLECTIONS_MODULE = "LIVE";
    try {
      await expect(importHistory(collector, { kind: "CONTRACTS", fileName: "c.csv", bytes: contracts, dryRun: true })).rejects.toThrow();
      expect((await getReconciliation(collector, "ALL")).canAct).toBe(false);
    } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; }
  });
});
