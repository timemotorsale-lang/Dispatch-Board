import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { promiseAction, resolveOutcomes } from "@/features/collections/server/promise-service";
import { DEFAULT_COLLECTIONS_SETTINGS } from "@/features/collections/domain/settings";
import { chicagoToday, addDays } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, csvWith, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections promises, plans and reported payments (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  const today = chicagoToday();
  const accountId = async (external: string) => (await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: external } })).id;
  const resolve = (on: string) => prisma.$transaction(tx => resolveOutcomes(tx, ctx.organizationId, DEFAULT_COLLECTIONS_SETTINGS, on));
  // Re-import with a file dated `asOf`, applying an edit to specific accounts' DaysPastDue (col 23) and TotalPaymentDueAmount (col 25).
  async function reimport(asOf: string, edits: Record<string, { dpd?: string; due?: string }>) {
    const [y, m, d] = asOf.split("-");
    const bytes = csvWith(rows => rows.map(row => {
      const e = edits[row[0]];
      return e ? row.map((cell, i) => (i === 23 && e.dpd !== undefined ? e.dpd : i === 25 && e.due !== undefined ? e.due : cell)) : row;
    }));
    const preview = await previewCollectionsImport(ctx.owner, { fileName: `Active Accounts ${Number(m)}-${Number(d)}-${y}.csv`, bytes });
    await commitCollectionsImport(ctx.owner, preview.runId);
  }

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    await commitCollectionsImport(ctx.owner, preview.runId);
  });

  it("records a promise with a contact log and status change", async () => {
    const id = await accountId("FAKE-1017");
    const result = await promiseAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "$200", promisedDate: addDays(today, 2) });
    expect(result.ok).toBe(true);
    expect(await prisma.collectionContactAttempt.count({ where: { accountId: id, outcome: "PROMISE_MADE" } })).toBe(1);
    await expect(promiseAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "0", promisedDate: addDays(today, 2) })).rejects.toThrow(/above \$0/);
    await expect(promiseAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "50", promisedDate: addDays(today, -1) })).rejects.toThrow(/past/);
  });

  it("marks a promise kept when the next import shows the improvement", async () => {
    const id = await accountId("FAKE-1017");
    await reimport(addDays(today, 1), { "FAKE-1017": { dpd: "0", due: "$0.00" } });
    const summary = await resolve(addDays(today, 1));
    expect(summary.promisesKept).toBeGreaterThanOrEqual(1);
    const promise = await prisma.paymentPromise.findFirstOrThrow({ where: { accountId: id, source: "MANUAL" } });
    expect(promise.status).toBe("KEPT");
    // Running again changes nothing (idempotent).
    expect((await resolve(addDays(today, 1))).promisesKept).toBe(0);
  });

  it("marks a promise broken after the deadline", async () => {
    const id = await accountId("FAKE-1018");
    await promiseAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "100", promisedDate: today });
    const summary = await resolve(addDays(today, 2));
    expect(summary.brokenAccountIds).toContain(id);
    expect((await prisma.paymentPromise.findFirstOrThrow({ where: { accountId: id, source: "MANUAL" } })).status).toBe("BROKEN");
  });

  it("creates a plan that replaces open promises, and breaks with an installment", async () => {
    const id = await accountId("FAKE-1019");
    await promiseAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "50", promisedDate: addDays(today, 5) });
    await expect(promiseAction(ctx.owner, id, { action: "CREATE_PLAN", reason: "Catch up", installments: [{ date: addDays(today, 1), amount: "100" }] })).rejects.toThrow(/between 2 and 52/);
    await promiseAction(ctx.owner, id, { action: "CREATE_PLAN", reason: "Catch up over two weeks", installments: [{ date: today, amount: "100" }, { date: addDays(today, 7), amount: "100" }] });
    expect((await prisma.collectionAccount.findUniqueOrThrow({ where: { id } })).status).toMatch(/PLAN_ACTIVE|DISABLE_ELIGIBLE/);
    expect(await prisma.paymentPromise.count({ where: { accountId: id, planId: null, status: "SUPERSEDED" } })).toBe(1);
    const summary = await resolve(addDays(today, 2));
    expect(summary.plansBroken).toBeGreaterThanOrEqual(1);
    const plan = await prisma.paymentPlan.findFirstOrThrow({ where: { accountId: id } });
    expect(plan.status).toBe("BROKEN");
  });

  it("confirms a reported payment from a later import, and flags one that never shows", async () => {
    const paid = await accountId("FAKE-1021");
    const notPaid = await accountId("FAKE-1022");
    await promiseAction(ctx.owner, paid, { action: "REPORT_PAYMENT", amount: "150", method: "ZELLE", paidDate: today });
    await promiseAction(ctx.owner, notPaid, { action: "REPORT_PAYMENT", amount: "150", method: "CASH_AT_STORE", paidDate: today });
    await reimport(addDays(today, 2), { "FAKE-1021": { dpd: "0", due: "$0.00" } });
    const summary = await resolve(addDays(today, 3));
    expect(summary.reportedConfirmed).toBeGreaterThanOrEqual(1);
    expect(summary.notFoundAccountIds).toContain(notPaid);
    expect((await prisma.customerReportedPayment.findFirstOrThrow({ where: { accountId: paid } })).status).toBe("CONFIRMED_BY_IMPORT");
  });

  it("refuses arrangements on a bankruptcy-frozen account", async () => {
    const id = await accountId("FAKE-1025");
    await prisma.collectionFlag.create({ data: { organizationId: ctx.organizationId, accountId: id, type: "BANKRUPTCY", setReason: "test", setByUserId: ctx.owner.id } });
    await expect(promiseAction(ctx.owner, id, { action: "RECORD_PROMISE", amount: "50", promisedDate: addDays(today, 3) })).rejects.toThrow(/bankruptcy/i);
  });
});
