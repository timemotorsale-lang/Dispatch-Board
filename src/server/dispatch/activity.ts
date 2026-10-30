import type { Prisma } from "@prisma/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";

export async function syncDispatchTaskStatus(tx: Prisma.TransactionClient, input: {
  id: string; title: string; boardDayId: string; assignedUserId: string; ownerUserId?: string | null;
  status: string; blockerReason: string | null;
}, actorUserId: string, businessDate: string, previousStatus: string, now = new Date()) {
  const primary = await tx.dispatchPresence.findUnique({ where: { userId: input.assignedUserId } });
  if (input.status === "IN_PROGRESS" || primary?.primaryTaskId === input.id) {
    const state = input.status === "IN_PROGRESS" ? "WORKING" : ["BLOCKED", "WAITING_ON_PARTS", "WAITING_ON_APPROVAL"].includes(input.status) ? "BLOCKED" : "UNKNOWN";
    const data = { organizationId: INITIAL_ORGANIZATION.id, businessDate, state,
      primaryTaskId: state === "UNKNOWN" ? null : input.id, primaryFocusId: null,
      startedAt: input.status === "IN_PROGRESS" && previousStatus !== "IN_PROGRESS" ? now : primary?.startedAt ?? now,
      nextAction: input.blockerReason ?? "", updatedAt: now };
    await tx.dispatchPresence.upsert({ where: { userId: input.assignedUserId },
      create: { ...data, userId: input.assignedUserId, version: 1 }, update: { ...data, version: { increment: 1 } } });
  }
  await tx.activityEvent.create({ data: {
    actorUserId, boardDayId: input.boardDayId, taskId: input.id,
    eventType: `task.${input.status.toLowerCase()}`, message: `${input.title}: ${input.status.replaceAll("_", " ").toLowerCase()}`,
    metadata: { personId: input.assignedUserId, ownerUserId: input.ownerUserId ?? input.assignedUserId,
      title: input.title, taskId: input.id, previousStatus, nextStatus: input.status, businessDate,
      occurredAt: now.toISOString(), recordedAt: now.toISOString(), blockerReason: input.blockerReason },
    createdAt: now,
  } });
}
