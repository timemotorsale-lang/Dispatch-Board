import { describe, expect, it, vi } from "vitest";
import { closeOutstandingRepairWork } from "@/server/repair-order/close-outstanding-work";
import { createRepairOrderRepository } from "@/server/repair-order/repository";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";

const at = new Date("2026-10-29T15:00:00Z");
const command = normalizeEnterpriseCommand({ organizationId: "org-1", actorUserId: "advisor", domain: "SHOP_OPERATIONS", subjectType: "REPAIR_ORDER", subjectId: "ro-1", commandType: "CLOSE_REPAIR_ORDER_NO_FURTHER_WORK", expectedVersion: 4, idempotencyKey: "close-1", locationId: "loc-1", reason: "The vehicle is already fixed and delivered.", payload: { occurredAt: at.toISOString() } });
const input = { organizationId: "org-1", repairOrderId: "ro-1", actorUserId: "advisor", reason: command.reason, correlationId: command.correlationId, occurredAt: at };
function fixture() {
  const previous = { id: "ro-1", organizationId: "org-1", repairJobs: [{ id: "job-1", jobNumber: "J001", status: "AUTHORIZED" }, { id: "job-passed", jobNumber: "J002", status: "QC_PASSED" }], vendorWorks: [], shopReconLifecycle: null, stage: "REPAIR", operatingState: "ACTIVE", ownerUserId: "advisor", locationId: "loc-1", targetAt: at };
  const tx = {
    repairJob: { findMany: vi.fn().mockResolvedValue([previous.repairJobs[0]]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    repairJobLaborClock: { findMany: vi.fn().mockResolvedValue([{ id: "clock-1", repairJobId: "job-1", technicianUserId: "tech", lastResumedAt: new Date("2026-10-29T14:50:00Z"), accumulatedMinutes: 20 }]), update: vi.fn() },
    repairJobLaborEvent: { create: vi.fn() },
    repairJobDispatch: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    partReservation: { findMany: vi.fn().mockResolvedValue([{ id: "reservation-1", demandId: "demand-1", partId: "part-1", stockLocationId: "shelf-1", quantity: 2 }]), update: vi.fn() },
    partStockBalance: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    partStockLedgerEntry: { create: vi.fn() },
    repairPartDemand: { update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }), count: vi.fn().mockResolvedValue(0) },
    repairOrder: { findFirstOrThrow: vi.fn().mockResolvedValue(previous), findFirst: vi.fn().mockResolvedValue({ version: 4 }), update: vi.fn().mockImplementation(async ({ data }) => ({ ...previous, ...data })) },
    serviceInvoice: { findFirst: vi.fn().mockResolvedValue(null) },
    shopReconLifecycle: { update: vi.fn() },
    repairOrderStateEvent: { create: vi.fn() },
    enterpriseCommandLedger: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "ledger-1" }) },
    enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue({ id: "aggregate-1", version: 4 }), update: vi.fn(), create: vi.fn() },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseOutboxMessage: { create: vi.fn() },
  };
  const db = { $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
  return { db, tx, previous };
}
describe("graceful repair-order closure", () => {
  it("closes with active jobs in one audited transaction while keeping QC-passed work", async () => {
    const { db, tx } = fixture();
    const result = await createRepairOrderRepository(db as never).closeNoWork(command, { actorUserId: "advisor", occurredAt: at, reason: input.reason });
    expect(result.result).toMatchObject({ id: "ro-1", operatingState: "CLOSED", closedAt: at, endedJobs: [{ jobNumber: "J001", previousStatus: "AUTHORIZED" }] });
    expect(tx.repairJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ["job-1"] }, status: { notIn: ["QC_PASSED", "CANCELLED"] } }), data: expect.objectContaining({ status: "CANCELLED" }) }));
    expect(tx.repairOrderStateEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: "advisor", reason: input.reason }) }));
    expect(tx.enterpriseAuditEvent.create).toHaveBeenCalled();
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("stops the live clock without claiming finished labor and releases assignments and unused stock", async () => {
    const { tx } = fixture();
    await closeOutstandingRepairWork(tx as never, input);
    expect(tx.repairJobLaborClock.update).toHaveBeenCalledWith({ where: { id: "clock-1" }, data: { state: "PAUSED", accumulatedMinutes: 30, lastResumedAt: null, version: { increment: 1 } } });
    expect(tx.repairJobLaborEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: "PAUSE", actorUserId: "advisor", occurredAt: at }) }));
    expect(tx.repairJobDispatch.updateMany.mock.calls[0][0].where.status).toEqual({ in: ["ACTIVE", "STAGED"] });
    expect(tx.partStockBalance.updateMany.mock.calls[0][0].data).toMatchObject({ allocatedQuantity: { decrement: 2 }, availableQuantity: { increment: 2 } });
    expect(tx.partStockLedgerEntry.create.mock.calls[0][0].data).toMatchObject({ movementType: "RELEASE", quantityDelta: 0, allocatedDelta: -2, sourceId: "reservation-1" });
    expect(tx.partReservation.findMany.mock.calls[0][0].where.status).toBe("ACTIVE");
  });
  it("returns an actionable invoice hold before touching jobs, clocks or parts", async () => {
    const { db, tx } = fixture();
    tx.serviceInvoice.findFirst.mockResolvedValue({ id: "invoice-1" });
    await expect(createRepairOrderRepository(db as never).closeNoWork(command, { actorUserId: "advisor", occurredAt: at, reason: input.reason })).rejects.toMatchObject({ code: "INVOICE_CLOSEOUT_REQUIRED", action: { label: "Open invoice closeout", href: "/prototype/repair-workbench?repairOrderId=ro-1&step=handoff" } });
    expect(tx.repairJob.findMany).not.toHaveBeenCalled();
    expect(tx.repairOrder.update).not.toHaveBeenCalled();
  });
  it("links directly to real vendor closeout instead of dropping outside-work records", async () => {
    const { db, tx, previous } = fixture();
    tx.repairOrder.findFirstOrThrow.mockResolvedValue({ ...previous, vendorWorks: [{ vendorName: "Body shop", status: "AT_VENDOR" }] });
    await expect(createRepairOrderRepository(db as never).closeNoWork(command, { actorUserId: "advisor", occurredAt: at, reason: input.reason })).rejects.toMatchObject({ code: "VENDOR_CLOSEOUT_REQUIRED", action: { href: "/vehicles/repair-workbench?repairOrderId=ro-1&fullDetails=1#vendor-repair-progress" } });
    expect(tx.repairOrder.update).not.toHaveBeenCalled();
  });
  it("refuses inconsistent stock without closing the RO", async () => {
    const { db, tx } = fixture();
    tx.partStockBalance.updateMany.mockResolvedValue({ count: 0 });
    await expect(createRepairOrderRepository(db as never).closeNoWork(command, { actorUserId: "advisor", occurredAt: at, reason: input.reason })).rejects.toMatchObject({ code: "PARTS_RECONCILIATION_REQUIRED" });
    expect(tx.repairOrder.update).not.toHaveBeenCalled();
    expect(tx.repairJob.updateMany).not.toHaveBeenCalled();
  });
  it("replays a successful close without ending jobs or releasing stock twice", async () => {
    const { db, tx } = fixture();
    tx.enterpriseCommandLedger.findUnique.mockResolvedValue({ requestHash: command.requestHash, resultSnapshot: { id: "ro-1", closedAt: at.toISOString(), version: 5 }, resultingVersion: 5 });
    expect(await createRepairOrderRepository(db as never).closeNoWork(command, { actorUserId: "advisor", occurredAt: at, reason: input.reason })).toMatchObject({ duplicate: true, version: 5 });
    expect(tx.repairJob.findMany).not.toHaveBeenCalled();
    expect(tx.repairOrder.update).not.toHaveBeenCalled();
  });
  it("rejects stale versions before making changes", async () => {
    const { db, tx } = fixture();
    tx.enterpriseAggregateVersion.findUnique.mockResolvedValue({ id: "aggregate-1", version: 7 });
    await expect(createRepairOrderRepository(db as never).closeNoWork(command, { actorUserId: "advisor", occurredAt: at, reason: input.reason })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(tx.repairJob.findMany).not.toHaveBeenCalled();
  });
});
