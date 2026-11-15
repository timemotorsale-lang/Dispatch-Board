import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnterpriseCommandConflictError, hashEnterpriseCommand } from "@/server/enterprise-command/domain";
const mocks = vi.hoisted(() => ({ access: vi.fn(), db: {} as Record<string, unknown>, receipt: vi.fn(), identity: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: mocks.db }));
vi.mock("@/server/service-billing/service", () => ({ billingAccess: mocks.access }));
vi.mock("@/server/repair-order/service-documents", () => ({ recordServiceDocument: mocks.receipt, serviceIdentity: mocks.identity, invoiceReceiptIdentity: mocks.identity }));
import { executeRepairDeposit, getRepairDepositView } from "@/server/service-billing/deposits";
import type { Prisma } from "@prisma/client";
const identity = { repairOrderNumber: "RO-1", customer: "Synthetic Customer" };
const actor = { id: "staff", name: "Staff", email: "staff@test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const command = { action: "DEPOSIT", amountCents: 20000, expectedVersion: 0, occurredAt: "2026-01-20T12:00:00Z", idempotencyKey: "deposit-test", reason: "Verified synthetic deposit", reference: "check-test", evidence: ["Synthetic teller verification"], method: "CHECK" };
function createTransaction() {
  const order = { locationId: "store", openedAt: new Date("2026-01-01"), closedAt: null, origin: "CUSTOMER_REPAIR", customerId: "customer" };
  return {
    repairOrder: { findFirst: vi.fn().mockResolvedValue(order) }, repairEstimateVersion: { findFirst: vi.fn().mockResolvedValue({ totalCents: 50000, presentedAt: new Date("2026-01-10") }) },
    serviceInvoice: { findFirst: vi.fn().mockResolvedValue(null), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    serviceInvoiceEntry: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockImplementation(async ({ data }) => data) },
    enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    enterpriseCommandLedger: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "command" }) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event" }) }, enterpriseAuditEvent: { create: vi.fn() }, enterpriseOutboxMessage: { create: vi.fn() },
    serviceDocument: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    $queryRaw: vi.fn().mockResolvedValue([]), $executeRaw: vi.fn(),
  };
}
let tx: ReturnType<typeof createTransaction>;
beforeEach(() => {
  vi.resetAllMocks();
  tx = createTransaction();
  Object.assign(mocks.db, tx, { $transaction: vi.fn(async (callback: (db: unknown) => unknown) => callback(tx)) });
  mocks.access.mockResolvedValue(actor); mocks.identity.mockResolvedValue(identity); mocks.receipt.mockResolvedValue({ id: "exact-receipt" });
});
function application() {
  const source = { id: "collection", kind: "COLLECTION", amountCents: 20000, method: "CHECK", invoiceId: null, invoiceEntryId: null, relatedEntryId: null, occurredAt: new Date("2026-01-20") };
  tx.$queryRaw.mockResolvedValue([source]);
  const content = { identity };
  tx.serviceDocument.findFirst.mockResolvedValue({ content, templateVersion: "v1", sha256: hashEnterpriseCommand({ templateVersion: "v1", content }) });
  tx.serviceInvoice.findFirst.mockResolvedValue({ id: "invoice", invoiceNumber: "INV-1", version: 1, status: "POSTED", totalCents: 50000, issuedAt: new Date("2026-02-01"), ledger: { identity } });
  tx.enterpriseAggregateVersion.findUnique.mockImplementation(async ({ where }: { where: { organizationId_domain_subjectType_subjectId: { subjectType: string } } }) => where.organizationId_domain_subjectType_subjectId.subjectType === "SERVICE_NATIVE_INVOICE" ? { id: "invoice-aggregate", version: 1 } : null);
  return { ...command, action: "APPLY_DEPOSIT", occurredAt: "2026-02-02T12:00:00Z", relatedEntryId: "collection", invoiceId: "invoice", invoiceExpectedVersion: 1 };
}
describe("repair deposit commands", () => {
  it("records no invoice for a deposit and returns an exact immutable receipt", async () => {
    const result = await executeRepairDeposit(actor, "ro", command, "org");
    expect(result.result).toMatchObject({ documentId: "exact-receipt", balance: { availableCents: 20000 } });
    expect(mocks.access).toHaveBeenCalledWith(actor, "store", true, "org", true, 20000);
    expect(mocks.receipt).toHaveBeenCalledWith(tx, expect.objectContaining({ kind: "DEPOSIT", content: expect.objectContaining({ title: "Repair deposit", receipt: expect.objectContaining({ invoiceNumber: "RO-1", referenceLabel: "Repair order", balanceLabel: "Unapplied deposit" }) }) }));
    expect(tx.serviceInvoiceEntry.create).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("returns the original receipt for an unchanged retry and rejects a changed retry", async () => {
    const first = await executeRepairDeposit(actor, "ro", command, "org");
    const recorded = tx.enterpriseCommandLedger.create.mock.calls[0][0].data;
    tx.enterpriseCommandLedger.findUnique.mockResolvedValue(recorded);
    const retry = await executeRepairDeposit(actor, "ro", command, "org");
    expect(retry).toMatchObject({ duplicate: true, result: first.result });
    expect(mocks.receipt).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    await expect(executeRepairDeposit(actor, "ro", { ...command, amountCents: 1 }, "org")).rejects.toThrow("different request");
  });
  it("applies funds once with an invoice balance and version compare-and-set", async () => {
    const result = await executeRepairDeposit(actor, "ro", application(), "org");
    expect(result.result).toMatchObject({ invoiceVersion: 2, invoiceBalance: { balanceCents: 30000 }, balance: { availableCents: 0, appliedCents: 20000 } });
    expect(tx.serviceInvoiceEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kind: "PAYMENT", evidence: expect.objectContaining({ depositTransfer: true }) }) });
    expect(tx.serviceInvoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ version: 1, organizationId: "org", repairOrderId: "ro" }) }));
  });
  it("rejects a concurrent invoice change before committing the deposit event or receipt", async () => {
    const input = application(); tx.serviceInvoice.updateMany.mockResolvedValue({ count: 0 });
    await expect(executeRepairDeposit(actor, "ro", input, "org")).rejects.toBeInstanceOf(EnterpriseCommandConflictError);
    expect(tx.$executeRaw).not.toHaveBeenCalled(); expect(mocks.receipt).not.toHaveBeenCalled();
  });
  it.each(["invoice", "aggregate"])("returns a typed conflict for stale %s versions", async target => {
    const input = application();
    if (target === "invoice") input.invoiceExpectedVersion = 2;
    else tx.enterpriseAggregateVersion.findUnique.mockResolvedValue(null);
    await expect(executeRepairDeposit(actor, "ro", input, "org")).rejects.toBeInstanceOf(EnterpriseCommandConflictError);
    expect(tx.serviceInvoiceEntry.create).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("rejects over-collection and overpayment", async () => {
    await expect(executeRepairDeposit(actor, "ro", { ...command, amountCents: 50001 }, "org")).rejects.toThrow("remaining current estimate");
    const input = application(); tx.serviceInvoice.findFirst.mockResolvedValue({ id: "invoice", version: 1, status: "POSTED", totalCents: 19999, issuedAt: new Date("2026-02-01") });
    await expect(executeRepairDeposit(actor, "ro", input, "org")).rejects.toThrow("exceeds the open balance");
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("does not touch the financial transaction after store/rollout denial", async () => {
    mocks.access.mockRejectedValue(new Error("Vehicle capability required: SERVICE_BILLING_MANAGE"));
    await expect(executeRepairDeposit(actor, "ro", command, "org")).rejects.toThrow("SERVICE_BILLING_MANAGE");
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("keeps pre-migration invoice reads available but does not hide other database errors", async () => {
    tx.$queryRaw.mockRejectedValue({ code: "P2010", meta: { code: "42P01", message: 'relation "ServiceRepairDepositEntry" does not exist' } });
    expect(await getRepairDepositView(tx as unknown as Prisma.TransactionClient, "org", "ro")).toMatchObject({ storageReady: false, collectionAvailability: { allowed: false } });
    tx.$queryRaw.mockRejectedValue(new Error("connection failed"));
    await expect(getRepairDepositView(tx as unknown as Prisma.TransactionClient, "org", "ro")).rejects.toThrow("connection failed");
  });
});
