import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getMoneyResources, moneyCommand } from "@/server/money-resources/service";
import type { AuthenticatedUser } from "@/server/auth/store";
import { moneyToday } from "@/lib/money-resources";
import { attachMoneyReceipt, readMoneyReceipt } from "@/server/money-resources/receipts";

describe.skipIf(process.env.RUN_MONEY_DB_TESTS !== "1")("isolated money accountability database", () => {
  const suffix = randomUUID(), organizationId = `money-org-${suffix}`, otherOrg = `money-other-${suffix}`;
  const actor = (id: string, manager: boolean): AuthenticatedUser => ({ id, name: id, email: `${id}@example.test`, isActive: true, roles: manager ? ["General Manager"] : [], duties: { all: [], direct: [], roleDefaults: [] } });
  const manager = actor(`money-manager-${suffix}`, true), worker = actor(`money-worker-${suffix}`, false), outsider = actor(`money-outsider-${suffix}`, true);
  const command = (user: AuthenticatedUser, value: Record<string, unknown>) => moneyCommand(user, { ...value, idempotencyKey: randomUUID() }) as Promise<Record<string, unknown>>;
  const current = (id: unknown) => prisma.moneyEntry.findUniqueOrThrow({ where: { id: String(id) } });
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.startsWith('/money_review_')) throw new Error("Money tests require a separate loopback money_review database.");
    for (const org of [organizationId, otherOrg]) {
      await prisma.organization.create({ data: { id: org, name: org, code: org } });
      await prisma.location.create({ data: { id: `location-${org}`, organizationId: org, code: org, name: org, city: "Review", region: "MN", timezone: "America/Chicago" } });
    }
    for (const person of [manager, worker, outsider]) {
      await prisma.user.create({ data: { id: person.id, name: person.name, email: person.email, passwordHash: "isolated-test-only" } });
      await prisma.userLocationAccess.create({ data: { userId: person.id, locationId: `location-${person === outsider ? otherOrg : organizationId}`, validFrom: new Date("2020-01-01") } });
    }
  });
  it("records, reviews, issues, spends, returns and settles the same $200 without double counting", async () => {
    const cash = await command(manager, { action: "CREATE_ACCOUNT", kind: "CASH", label: "Review cash", opening: "500" });
    const request = await command(worker, { action: "REQUEST", amount: "200", purpose: "Parts and fuel", businessDate: moneyToday() });
    await command(manager, { action: "REVIEW", id: request.id, version: 1, decision: "APPROVED", note: "Approved for parts and fuel" });
    const issue = await command(manager, { action: "ISSUE", id: request.id, version: 2, accountId: cash.id, reference: "Cash handed over in review fixture" });
    await expect(command(manager, { action: "ISSUE", id: request.id, version: 2, accountId: cash.id, reference: "Duplicate" })).rejects.toThrow("already issued");
    for (const amount of ["125", "40"]) {
      const purchase = await command(worker, { action: "RECORD", amount, purpose: "Review parts or fuel", merchant: "Review merchant", paymentMethod: "CASH", accountId: cash.id, advanceId: issue.id, businessDate: moneyToday() });
      await expect(command(manager, { action: "REVIEW", id: purchase.id, version: 1, decision: "APPROVED", note: "Review" })).rejects.toThrow("receipt");
      await command(worker, { action: "EXPLAIN", id: purchase.id, version: 1, note: "Receipt missing; independently reviewed fixture exception." });
      await command(manager, { action: "REVIEW", id: purchase.id, version: 2, decision: "APPROVED", note: "Exception reviewed" });
    }
    const returned = await command(worker, { action: "RETURN", id: issue.id, version: 1, amount: "35", note: "Unused cash physically returned" });
    await expect(command(worker, { action: "REVIEW", id: returned.id, version: 1, decision: "APPROVED", note: "Self confirmation" })).rejects.toThrow();
    await expect(command(manager, { action: "SETTLE", id: issue.id, version: 1, note: "Premature" })).rejects.toThrow();
    await command(manager, { action: "REVIEW", id: returned.id, version: 1, decision: "APPROVED", note: "35 dollars actually received" });
    await command(manager, { action: "SETTLE", id: issue.id, version: 1, note: "All evidence reviewed and zero balance" });
    const close = await command(manager, { action: "CLOSE", accountId: cash.id, amount: "335", businessDate: moneyToday(), note: "Counted fixture cash" });
    expect(close.differenceCents).toBe(0); expect(close.expectedCents).toBe(33500);
    expect((await getMoneyResources(worker)).advances).toHaveLength(0);
  });
  it("retains idempotent spending and prevents self approval, cross-organization access and rewritten history", async () => {
    const body = { action: "RECORD", amount: "12.34", purpose: "Recorded once", merchant: "Review shop", paymentMethod: "PERSONAL", businessDate: moneyToday(), idempotencyKey: randomUUID() };
    const [first, retry] = await Promise.all([moneyCommand(worker, body), moneyCommand(worker, body)]) as Array<{ id: string }>;
    expect(first.id).toBe(retry.id);
    await expect(moneyCommand(worker, { ...body, amount: "12.35" })).rejects.toThrow("different action");
    await expect(command(outsider, { action: "EXPLAIN", id: first.id, version: 1, note: "Not my organization" })).rejects.toThrow("not available");
    await expect(prisma.moneyEntry.update({ where: { id: first.id }, data: { amountCents: 99999 } })).rejects.toThrow("cannot be overwritten");
    const audit = await prisma.moneyAudit.findFirstOrThrow({ where: { subjectId: first.id } });
    await expect(prisma.moneyAudit.delete({ where: { id: audit.id } })).rejects.toThrow("append-only");
    const own = await command(manager, { action: "RECORD", amount: "10", purpose: "Manager purchase", paymentMethod: "PERSONAL", businessDate: moneyToday() });
    await expect(command(manager, { action: "REVIEW", id: own.id, version: 1, decision: "APPROVED", note: "Self approval" })).rejects.toThrow("different manager");
  });
  it("imports statement lines once and requires exact approved one-to-one matches", async () => {
    const card = await command(manager, { action: "CREATE_ACCOUNT", kind: "CARD", label: "Assigned review card", employeeId: worker.id, lastFour: "1234", limit: "50" });
    const spending = await command(worker, { action: "RECORD", amount: "100", purpose: "Actual card purchase", merchant: "Card merchant", paymentMethod: "CARD", accountId: card.id, businessDate: moneyToday() });
    await command(worker, { action: "EXPLAIN", id: spending.id, version: 1, note: "Receipt exception for isolated review" });
    await command(manager, { action: "REVIEW", id: spending.id, version: 2, decision: "APPROVED", note: "Reviewed purchase and policy exception" });
    const csv = `transaction_id,date,merchant,amount\nposted-1,${moneyToday()},Card merchant,100.00`;
    expect((await command(manager, { action: "IMPORT", accountId: card.id, csv })).imported).toBe(1);
    expect((await command(manager, { action: "IMPORT", accountId: card.id, csv })).skipped).toBe(1);
    const charge = await prisma.moneyCardCharge.findFirstOrThrow({ where: { accountId: String(card.id) } });
    await command(manager, { action: "MATCH", id: spending.id, version: 3, chargeId: charge.id, chargeVersion: charge.version });
    await expect(command(manager, { action: "MATCH", id: spending.id, version: 3, chargeId: charge.id, chargeVersion: charge.version })).rejects.toThrow();
    expect((await current(spending.id)).reconciledAt).not.toBeNull();
    await expect(command(manager, { action: "CORRECT", id: spending.id, version: 4, amount: "90", note: "Cannot rewrite reconciled purchase" })).rejects.toThrow();
  });
  it("corrects an unmatched entry by replacement without reviving the old record", async () => {
    const original = await command(worker, { action: "RECORD", amount: "20", purpose: "Typo in actual purchase", paymentMethod: "PERSONAL", businessDate: moneyToday() });
    const corrected = await command(manager, { action: "CORRECT", id: original.id, version: 1, amount: "12", note: "Receipt shows twelve dollars" });
    expect((await current(original.id)).approvalStatus).toBe("SUPERSEDED");
    expect((await current(corrected.id)).amountCents).toBe(1200);
    await expect(command(worker, { action: "EXPLAIN", id: original.id, version: 2, note: "Try to revive" })).rejects.toThrow("replaced");
  });
  it("lets management record a cardholder's purchase while keeping entry and independent review accountable", async () => {
    const card = await command(manager, { action: "CREATE_ACCOUNT", kind: "CARD", label: "Cardholder purchase entry", employeeId: worker.id, lastFour: "7788" });
    expect((await getMoneyResources(manager)).accounts.some(source => source.id === card.id)).toBe(true);
    const purchase = await command(manager, { action: "RECORD", amount: "108", purpose: "Fender bought for staff", merchant: "Parts supplier", paymentMethod: "CARD", accountId: card.id });
    expect((await current(purchase.id)).employeeId).toBe(worker.id);
    const audit = await prisma.moneyAudit.findFirstOrThrow({ where: { subjectId: String(purchase.id), action: "RECORD" } });
    expect(audit.actorUserId).toBe(manager.id);
    expect((await getMoneyResources(worker)).entries.some(item => item.id === purchase.id)).toBe(true);
    await command(worker, { action: "EXPLAIN", id: purchase.id, version: 1, note: "Receipt pending supplier confirmation" });
    await expect(command(manager, { action: "REVIEW", id: purchase.id, version: 2, decision: "APPROVED", note: "Cannot approve own proxy entry" })).rejects.toThrow("different manager");
    const reviewer = actor(`money-reviewer-${suffix}`, true);
    await prisma.user.create({ data: { id: reviewer.id, name: reviewer.name, email: reviewer.email, passwordHash: "isolated-test-only" } });
    await prisma.userLocationAccess.create({ data: { userId: reviewer.id, locationId: `location-${organizationId}`, validFrom: new Date("2020-01-01") } });
    await command(reviewer, { action: "REVIEW", id: purchase.id, version: 2, decision: "APPROVED", note: "Independently verified staff purchase" });
    const privateCard = await command(manager, { action: "CREATE_ACCOUNT", kind: "CARD", label: "Manager-only card", employeeId: manager.id, lastFour: "9900" });
    expect((await getMoneyResources(worker)).accounts.some(source => source.id === privateCard.id)).toBe(false);
    await expect(command(worker, { action: "RECORD", amount: "1", purpose: "Cannot use someone else's card", paymentMethod: "CARD", accountId: privateCard.id })).rejects.toThrow("available funding source");
    await expect(command(outsider, { action: "RECORD", amount: "1", purpose: "Cross organization blocked", paymentMethod: "CARD", accountId: card.id })).rejects.toThrow("available funding source");
    await expect(command(worker, { action: "RECORD", amount: "1", purpose: "Cannot spoof employee", employeeId: manager.id, paymentMethod: "CARD", accountId: card.id })).rejects.toThrow("responsible employee");
  });
  it("stores and verifies private receipt bytes under Document Library with scoped, audited access", async () => {
    const purchase = await command(worker, { action: "RECORD", amount: "9.99", purpose: "Receipt storage fixture", paymentMethod: "PERSONAL", businessDate: moneyToday() });
    const file = new File(["%PDF-1.4\nIsolated receipt fixture\n%%EOF"], "review-receipt.pdf", { type: "application/pdf" });
    const saved = await attachMoneyReceipt(worker, String(purchase.id), file);
    const document = await prisma.documentLibraryDocument.findUniqueOrThrow({ where: { id: saved.documentId! } });
    expect(document.ownerType).toBe("MONEY_ENTRY"); expect(document.organizationId).toBe(organizationId); expect(document.sensitivity).toBe("RESTRICTED");
    expect((await attachMoneyReceipt(worker, String(purchase.id), file)).duplicate).toBe(true);
    expect((await readMoneyReceipt(worker, String(purchase.id))).bytes.toString()).toContain("Isolated receipt fixture");
    await expect(readMoneyReceipt(outsider, String(purchase.id))).rejects.toThrow("not available");
    expect(await prisma.moneyAudit.count({ where: { subjectId: String(purchase.id), action: "VIEW_RECEIPT" } })).toBe(1);
    await expect(attachMoneyReceipt(worker, String(purchase.id), new File(["not a PDF"], "bad.pdf", { type: "application/pdf" }))).rejects.toThrow("contents");
  });
  it("prevents concurrent duplicate reimbursements and does not treat payment as another expense", async () => {
    const purchase = await command(worker, { action: "RECORD", amount: "45", purpose: "Personal-funds purchase", paymentMethod: "PERSONAL", businessDate: moneyToday() });
    await command(worker, { action: "EXPLAIN", id: purchase.id, version: 1, note: "Receipt independently reviewed offline" });
    await command(manager, { action: "REVIEW", id: purchase.id, version: 2, decision: "APPROVED", note: "Approved reimbursement evidence" });
    const outcomes = await Promise.allSettled([1,2].map(index => command(manager, { action: "REIMBURSE", id: purchase.id, version: 3, amount: "45", reference: `Actual transfer ${index}` })));
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.moneyEntry.count({ where: { parentId: String(purchase.id), kind: "REIMBURSEMENT" } })).toBe(1);
    expect((await current(purchase.id)).approvalStatus).toBe("SETTLED");
  });
  it("defends tenant-linked accounts and immutable funding facts in the database", async () => {
    const source = await command(manager, { action: "CREATE_ACCOUNT", kind: "CASH", label: "Immutable source", opening: "20" });
    await expect(prisma.moneyAccount.update({ where: { id: String(source.id) }, data: { openingBalanceCents: 99999 } })).rejects.toThrow("cannot be reassigned");
    await expect(prisma.moneyEntry.create({ data: { organizationId: otherOrg, employeeId: outsider.id, kind: "EXPENSE", amountCents: 100, businessDate: moneyToday(), merchant: "Cross tenant", purpose: "Invalid account", category: "Other", paymentMethod: "CASH", accountId: String(source.id) } })).rejects.toThrow("scope mismatch");
  });
});
