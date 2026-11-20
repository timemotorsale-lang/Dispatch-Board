import type { Prisma } from "@prisma/client";

export class RepairHandoffError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

export type HandoffClaim = {
  taskId: string;
  requestToken: string;
  organizationId: string;
  locationId: string;
  actorUserId: string;
  canAcceptForReceiver: boolean;
};

export async function recordHandoffActivity(
  tx: Prisma.TransactionClient,
  task: { id: string; boardDayId: string },
  actorUserId: string,
  action: "requested" | "accepted" | "cancelled",
  metadata: Prisma.InputJsonObject
) {
  await tx.activityEvent.create({ data: {
    boardDayId: task.boardDayId, taskId: task.id, actorUserId,
    eventType: `task.repair_handoff_${action}`,
    message: action === "accepted" ? "Service accepted the task into a repair order."
      : action === "requested" ? "Requested a handoff to Service." : "Cancelled the pending Service handoff.",
    metadata
  } });
}

export async function acceptRepairHandoff(
  tx: Prisma.TransactionClient,
  claim: HandoffClaim,
  order: { id: string; repairOrderNumber: string; locationId: string; vehicleId: string; customerId: string | null }
) {
  const handoff = await tx.taskRepairHandoff.findFirst({
    where: { taskId: claim.taskId, requestToken: claim.requestToken, organizationId: claim.organizationId, locationId: claim.locationId },
    include: { task: { select: { id: true, boardDayId: true, status: true, vehicleId: true, customerId: true } } }
  });
  if (!handoff || handoff.locationId !== order.locationId) throw new RepairHandoffError("The handoff or location changed. Reopen it from Service.");
  if (handoff.receiverUserId !== claim.actorUserId && !claim.canAcceptForReceiver) {
    throw new RepairHandoffError("Only the receiving advisor or a repair-authorized manager can accept this handoff.", 403);
  }
  if (handoff.repairOrderId === order.id) return;
  if (handoff.repairOrderId || handoff.task.status === "COMPLETED") throw new RepairHandoffError("This handoff is no longer pending.");
  if (!order.customerId || (handoff.task.customerId && handoff.task.customerId !== order.customerId) ||
      (handoff.task.vehicleId && handoff.task.vehicleId !== order.vehicleId)) {
    throw new RepairHandoffError("The repair order must match the task’s confirmed customer and vehicle.");
  }
  const accepted = await tx.taskRepairHandoff.updateMany({
    where: { taskId: claim.taskId, requestToken: claim.requestToken, repairOrderId: null, task: { status: { not: "COMPLETED" } } },
    data: { repairOrderId: order.id, acceptedAt: new Date(), acceptedByUserId: claim.actorUserId }
  });
  if (!accepted.count) throw new RepairHandoffError("This handoff changed. Reopen it to see the current repair order.");
  await recordHandoffActivity(tx, handoff.task, claim.actorUserId, "accepted", {
    repairOrderId: order.id, repairOrderNumber: order.repairOrderNumber,
    requestedByUserId: handoff.requestedByUserId, receiverUserId: handoff.receiverUserId
  });
}
