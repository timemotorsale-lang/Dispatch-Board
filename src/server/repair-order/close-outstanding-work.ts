import type { Prisma } from "@prisma/client";

export class RepairOrderCloseBlockedError extends Error {
  constructor(message: string, readonly action: { label: string; href: string }, readonly code: string) { super(message); }
}

export class RepairOrderCloseSyncPendingError extends Error {
  constructor(cause: unknown) { super("The RO closed, but its task list is still synchronizing. Retry the same close request to finish.", { cause }); }
}

// Administrative closure ends future assignments; it does not certify repairs or QC.
export async function closeOutstandingRepairWork(tx: Prisma.TransactionClient, input: { organizationId: string; repairOrderId: string; actorUserId: string; reason: string; correlationId: string; occurredAt: Date }) {
  const { organizationId, repairOrderId, actorUserId, reason, correlationId, occurredAt } = input;
  const jobs = await tx.repairJob.findMany({ where: { organizationId, repairOrderId, status: { notIn: ["QC_PASSED", "CANCELLED"] } }, select: { id: true, jobNumber: true, status: true } });
  const clocks = await tx.repairJobLaborClock.findMany({ where: { organizationId, repairJob: { repairOrderId, organizationId }, state: "RUNNING" } });
  for (const clock of clocks) {
    if (!clock.lastResumedAt || occurredAt < clock.lastResumedAt) throw new Error("A labor clock has an invalid start time. Review its time record before closing.");
    const accumulatedMinutes = clock.accumulatedMinutes + Math.max(0, Math.round((occurredAt.getTime() - clock.lastResumedAt.getTime()) / 60000));
    await tx.repairJobLaborClock.update({ where: { id: clock.id }, data: { state: "PAUSED", lastResumedAt: null, accumulatedMinutes, version: { increment: 1 } } });
    await tx.repairJobLaborEvent.create({ data: { organizationId, repairJobId: clock.repairJobId, technicianUserId: clock.technicianUserId, eventType: "PAUSE", occurredAt, actorUserId, correlationId, reason: `RO closed: ${reason}` } });
  }
  const assignments = await tx.repairJobDispatch.updateMany({ where: { organizationId, repairJob: { organizationId, repairOrderId }, status: { in: ["ACTIVE", "STAGED"] } }, data: { status: "CANCELLED", reason: `RO closed: ${reason}`, version: { increment: 1 } } });
  const reservations = await tx.partReservation.findMany({ where: { organizationId, demand: { organizationId, repairOrderId }, status: "ACTIVE" } });
  for (const reservation of reservations) {
    const balance = await tx.partStockBalance.updateMany({ where: { partId: reservation.partId, stockLocationId: reservation.stockLocationId, allocatedQuantity: { gte: reservation.quantity } }, data: { allocatedQuantity: { decrement: reservation.quantity }, availableQuantity: { increment: reservation.quantity }, version: { increment: 1 } } });
    if (balance.count !== 1) throw new RepairOrderCloseBlockedError("A reserved part does not match its stock balance. Review the parts record to close this RO.", { label: "Review parts", href: `/prototype/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}&step=parts` }, "PARTS_RECONCILIATION_REQUIRED");
    await tx.partReservation.update({ where: { id: reservation.id }, data: { status: "RELEASED", releasedAt: occurredAt } });
    await tx.partStockLedgerEntry.create({ data: { organizationId, partId: reservation.partId, stockLocationId: reservation.stockLocationId, movementType: "RELEASE", quantityDelta: 0, allocatedDelta: -reservation.quantity, unitCostCents: 0, sourceType: "PART_RESERVATION_RELEASE", sourceId: reservation.id, actorUserId, reason: `RO closed: ${reason}`, correlationId } });
    await tx.repairPartDemand.update({ where: { id: reservation.demandId }, data: { quantityReserved: { decrement: reservation.quantity }, version: { increment: 1 } } });
  }
  // Issued parts, purchase orders, invoices and historical evidence are retained.
  const demands = await tx.repairPartDemand.updateMany({ where: { organizationId, repairOrderId, status: { in: ["OPEN", "PARTIALLY_RESERVED", "RESERVED"] }, quantityReserved: 0 }, data: { status: "CANCELLED", version: { increment: 1 } } });
  if (await tx.repairPartDemand.count({ where: { organizationId, repairOrderId, status: { in: ["OPEN", "PARTIALLY_RESERVED", "RESERVED"] }, quantityReserved: { gt: 0 } } })) throw new RepairOrderCloseBlockedError("Some reserved parts need reconciliation before this RO can close.", { label: "Review parts", href: `/prototype/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}&step=parts` }, "PARTS_RECONCILIATION_REQUIRED");
  if (jobs.length) await tx.repairJob.updateMany({ where: { organizationId, repairOrderId, id: { in: jobs.map(job => job.id) }, status: { notIn: ["QC_PASSED", "CANCELLED"] } }, data: { status: "CANCELLED", executionBlockerReason: `RO closed: ${reason}`, version: { increment: 1 } } });
  return { endedJobs: jobs.map(job => ({ id: job.id, jobNumber: job.jobNumber, previousStatus: job.status })), pausedClocks: clocks.length, releasedAssignments: assignments.count, releasedReservations: reservations.length, endedPartDemands: demands.count };
}
