import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { runAccountAction } from "@/features/collections/server/action-router";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { getAccountLedger, postLedgerTransaction } from "@/features/collections/server/ledger-service";
import { loadCollectionsSettings } from "@/features/collections/server/settings-store";
import { addDays, chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections shadow ledger (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  let accountId = "";
  const today = chicagoToday();
  const act = (values: Record<string, unknown>, who?: AuthenticatedUser) => runAccountAction(who ?? ctx.owner, accountId, values) as Promise<{ message: string }>;
  const ledger = () => getAccountLedger(ctx.owner, accountId);

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    await commitCollectionsImport(ctx.owner, preview.runId);
    accountId = (await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1003" } })).id;
  });

  it("creates a shadow contract with its schedule; DealerCenter stays the official record", async () => {
    expect((await ledger()).contract).toBeNull();
    await act({ action: "CREATE_CONTRACT", calcMethod: "FIXED_PAYMENT", frequency: "WEEKLY", paymentAmount: "100", numberOfPayments: "10", contractDate: addDays(today, -30), firstDueDate: addDays(today, -21) });
    await expect(act({ action: "CREATE_CONTRACT", calcMethod: "FIXED_PAYMENT", frequency: "WEEKLY", paymentAmount: "100", numberOfPayments: "10", firstDueDate: today })).rejects.toThrow(/already/);
    const l = await ledger();
    expect(l.systemOfRecord).toBe("DEALERCENTER");
    expect(l.state.installments).toHaveLength(10);
    expect(l.state).toMatchObject({ daysPastDue: 21, pastDueCents: 30000 }); // 3 earlier weekly payments unpaid (the one due today isn't late yet)
  });

  it("posts payments, stores the split, and recalculates", async () => {
    await act({ action: "POST_LEDGER_TRANSACTION", type: "PAYMENT", amount: "250", effectiveDate: today, source: "ZELLE" });
    const l = await ledger();
    expect(l.state).toMatchObject({ pastDueCents: 5000, daysPastDue: 7 }); // $250 pays #1, #2 and half of #3
    const payment = l.transactions.find(t => t.type === "PAYMENT")!;
    const stored = await prisma.ledgerAllocation.findMany({ where: { transactionId: payment.id }, orderBy: { installmentNumber: "asc" } });
    expect(stored.map(a => [a.installmentNumber, a.amountCents])).toEqual([[1, 10000], [2, 10000], [3, 5000]]);
  });

  it("reversals need a reason, can't happen twice, and restore what was owed", async () => {
    const payment = (await ledger()).transactions.find(t => t.type === "PAYMENT")!;
    await expect(act({ action: "POST_LEDGER_TRANSACTION", type: "RETURNED_PAYMENT", reversesTransactionId: payment.id, memo: "" })).rejects.toThrow(/reason/);
    await act({ action: "POST_LEDGER_TRANSACTION", type: "RETURNED_PAYMENT", reversesTransactionId: payment.id, memo: "Bank returned it: insufficient funds" });
    await expect(act({ action: "POST_LEDGER_TRANSACTION", type: "PAYMENT_REVERSAL", reversesTransactionId: payment.id, memo: "Again by mistake" })).rejects.toThrow(/already/);
    const l = await ledger();
    expect(l.state).toMatchObject({ pastDueCents: 30000, daysPastDue: 21 });
    expect(l.transactions.find(t => t.id === payment.id)?.reversed).toBe(true);
    expect(await prisma.ledgerTransaction.count({ where: { accountId } })).toBe(2); // nothing deleted
  });

  it("the same import row is only posted once (idempotency key)", async () => {
    const contract = await prisma.servicingContract.findUniqueOrThrow({ where: { accountId } });
    const settings = await loadCollectionsSettings(ctx.organizationId);
    const post = () => prisma.$transaction(tx => postLedgerTransaction(tx, { organizationId: ctx.organizationId, contractId: contract.id, accountId, type: "PAYMENT", amountCents: 10000, effectiveDate: today, source: "IMPORT", enteredByUserId: null, idempotencyKey: `test-import-row-${ctx.suffix}`, settings }));
    expect((await post()).duplicate).toBe(false);
    expect((await post()).duplicate).toBe(true);
    await expect(prisma.$transaction(tx => postLedgerTransaction(tx, { organizationId: ctx.organizationId, contractId: contract.id, accountId, type: "ADJUSTMENT", amountCents: -500, effectiveDate: today, source: "SYSTEM", enteredByUserId: null, settings }))).rejects.toThrow(/approver/);
  });

  it("a reschedule is a new schedule version, and moves the due dates", async () => {
    const before = await ledger();
    await act({ action: "RESCHEDULE", fromInstallment: "2", shiftDays: "28", reason: "Approved extension: hospital stay" });
    const after = await ledger();
    expect(after.scheduleVersion).toBe(2);
    expect(after.state.daysPastDue).toBeLessThan(before.state.daysPastDue + 1);
    expect(await prisma.paymentSchedule.count({ where: { contract: { accountId } } })).toBe(2);
  });

  it("only admins can touch the ledger", async () => {
    const collector: AuthenticatedUser = { ...ctx.owner, roles: ["Collections"] };
    process.env.COLLECTIONS_MODULE = "LIVE";
    try {
      await expect(act({ action: "POST_LEDGER_TRANSACTION", type: "PAYMENT", amount: "10" }, collector)).rejects.toThrow();
      expect((await getAccountLedger(collector, accountId)).canPost).toBe(false);
    } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; }
  });
});
