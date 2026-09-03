import { Prisma, PrismaClient, TaskSourceType, TaskStatus, TaskTemplatePriority, WorkflowArea } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { getDefaultAppSettings } from "@/server/validation/app-settings";
import { getBoardDateInTimeZone } from "@/server/validation/board-date";

type Transaction = Prisma.TransactionClient;

export type RepairOrderTaskProjection = {
  assignmentKey: string;
  assignedUserId: string;
  createdByUserId: string;
  customerId: string | null;
  customerReference: string | null;
  description: string;
  dueAt: Date;
  organizationId: string;
  repairJobId?: string | null;
  repairOrderId: string;
  repairOrderNumber: string;
  title: string;
  vehicleId: string;
  vehicleReference: string;
  desiredStatus?: TaskStatus;
  priority?: TaskTemplatePriority;
};

function truncate(value: string, maximum: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function boardDateValue(date: Date, timezone: string) {
  return new Date(`${getBoardDateInTimeZone(date, timezone)}T00:00:00.000Z`);
}

function nextTaskStatus(current: TaskStatus, desired: TaskStatus | undefined) {
  if (!desired) return current === TaskStatus.COMPLETED ? TaskStatus.NOT_STARTED : current;
  if (current === TaskStatus.COMPLETED) return desired;
  if (desired === TaskStatus.NOT_STARTED && current !== TaskStatus.NOT_STARTED) return current;
  return desired;
}

export function repairOrderVehicleReference(vehicle: {
  color?: string | null;
  make?: string | null;
  model?: string | null;
  vehicleNumber: string;
  year?: number | null;
}) {
  const description = [vehicle.year, vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" ");
  return description ? `${description} · ${vehicle.vehicleNumber}` : vehicle.vehicleNumber;
}

export async function upsertRepairOrderTaskProjection(tx: Transaction, input: RepairOrderTaskProjection) {
  const defaults = getDefaultAppSettings();
  const settings = await tx.appSetting.findUnique({ where: { id: defaults.id }, select: { timezone: true } });
  const date = boardDateValue(input.dueAt, settings?.timezone ?? defaults.timezone);
  const board = await tx.boardDay.upsert({ where: { date }, update: {}, create: { date }, select: { id: true } });
  const existing = await tx.repairOrderTaskLink.findUnique({
    where: {
      organizationId_repairOrderId_assignmentKey: {
        organizationId: input.organizationId,
        repairOrderId: input.repairOrderId,
        assignmentKey: input.assignmentKey
      }
    },
    include: { task: { select: { assignedUserId: true, boardDayId: true, status: true, blockerReason: true } } }
  });
  const metadata = {
    assignmentKey: input.assignmentKey,
    repairJobId: input.repairJobId ?? null,
    repairOrderId: input.repairOrderId,
    repairOrderNumber: input.repairOrderNumber,
    sourceHref: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(input.repairOrderId)}`
  } satisfies Prisma.InputJsonObject;

  if (existing) {
    const status = nextTaskStatus(existing.task.status, input.desiredStatus);
    const task = await tx.task.update({
      where: { id: existing.taskId },
      data: {
        assignedUserId: input.assignedUserId,
        boardDayId: board.id,
        blockerReason: status === TaskStatus.BLOCKED ? existing.task.blockerReason ?? truncate(input.description, 500) : null,
        ...(existing.task.status === TaskStatus.COMPLETED && status !== TaskStatus.COMPLETED
          ? { completedAt: null, reviewedByUserId: null, readyForReviewAt: null } : {}),
        customerId: input.customerId,
        customerReference: input.customerReference,
        description: truncate(input.description, 4000),
        dueAt: input.dueAt,
        priority: input.priority ?? TaskTemplatePriority.HIGH,
        sourceType: TaskSourceType.REPAIR_ORDER,
        status,
        templateSnapshot: metadata,
        title: truncate(input.title, 500),
        vehicleId: input.vehicleId,
        vehicleReference: input.vehicleReference,
        workflowArea: WorkflowArea.SHOP
      }
    });
    await tx.repairOrderTaskLink.update({ where: { id: existing.id }, data: { repairJobId: input.repairJobId ?? null } });
    if (existing.task.assignedUserId !== input.assignedUserId || existing.task.boardDayId !== board.id) {
      await tx.activityEvent.create({
        data: {
          actorUserId: input.createdByUserId,
          boardDayId: board.id,
          eventType: "repair_order.task_synchronized",
          message: `${input.repairOrderNumber} assignment synchronized to ${truncate(input.title, 160)}.`,
          metadata,
          taskId: task.id
        }
      });
    }
    return { created: false, taskId: task.id };
  }

  const task = await tx.task.create({
    data: {
      assignedUserId: input.assignedUserId,
      boardDayId: board.id,
      blockerReason: input.desiredStatus === TaskStatus.BLOCKED ? truncate(input.description, 500) : null,
      createdByUserId: input.createdByUserId,
      customerId: input.customerId,
      customerReference: input.customerReference,
      description: truncate(input.description, 4000),
      dueAt: input.dueAt,
      priority: input.priority ?? TaskTemplatePriority.HIGH,
      requiresManagerApproval: true,
      sourceType: TaskSourceType.REPAIR_ORDER,
      status: input.desiredStatus ?? TaskStatus.NOT_STARTED,
      templateSnapshot: metadata,
      title: truncate(input.title, 500),
      vehicleId: input.vehicleId,
      vehicleReference: input.vehicleReference,
      workflowArea: WorkflowArea.SHOP
    }
  });
  await tx.repairOrderTaskLink.create({
    data: {
      assignmentKey: input.assignmentKey,
      createdByUserId: input.createdByUserId,
      organizationId: input.organizationId,
      repairJobId: input.repairJobId ?? null,
      repairOrderId: input.repairOrderId,
      taskId: task.id
    }
  });
  await tx.activityEvent.create({
    data: {
      actorUserId: input.createdByUserId,
      boardDayId: board.id,
      eventType: "repair_order.task_created",
      message: `${input.repairOrderNumber} assignment created: ${truncate(input.title, 160)}.`,
      metadata,
      taskId: task.id
    }
  });
  return { created: true, taskId: task.id };
}

export async function setRepairOrderTaskStatus(
  tx: Transaction,
  input: {
    actorUserId: string;
    assignmentKey: string;
    blockerReason?: string | null;
    organizationId: string;
    repairOrderId: string;
    status: TaskStatus;
  }
) {
  const link = await tx.repairOrderTaskLink.findUnique({
    where: {
      organizationId_repairOrderId_assignmentKey: {
        organizationId: input.organizationId,
        repairOrderId: input.repairOrderId,
        assignmentKey: input.assignmentKey
      }
    },
    include: { task: { select: { boardDayId: true, status: true } } }
  });
  if (!link || link.task.status === TaskStatus.COMPLETED) return null;
  const now = new Date();
  await tx.task.update({
    where: { id: link.taskId },
    data: {
      blockerReason: input.status === TaskStatus.BLOCKED ? input.blockerReason ?? "Repair work is paused." : null,
      completedAt: input.status === TaskStatus.COMPLETED ? now : null,
      readyForReviewAt: input.status === TaskStatus.READY_FOR_REVIEW ? now : null,
      status: input.status
    }
  });
  await tx.activityEvent.create({
    data: {
      actorUserId: input.actorUserId,
      boardDayId: link.task.boardDayId,
      eventType: "repair_order.task_status_synchronized",
      message: `Repair assignment moved to ${input.status.replaceAll("_", " ").toLocaleLowerCase()}.`,
      metadata: { assignmentKey: input.assignmentKey, repairOrderId: input.repairOrderId },
      taskId: link.taskId
    }
  });
  return link.taskId;
}

export async function completeOpenRepairOrderTasks(
  tx: Transaction,
  input: { actorUserId: string; organizationId: string; repairOrderId: string; reason: string }
) {
  const links = await tx.repairOrderTaskLink.findMany({
    where: { organizationId: input.organizationId, repairOrderId: input.repairOrderId },
    include: { task: { select: { boardDayId: true, status: true } } }
  });
  const completedAt = new Date();
  for (const link of links) {
    if (link.task.status === TaskStatus.COMPLETED) continue;
    await tx.task.update({ where: { id: link.taskId }, data: { completedAt, status: TaskStatus.COMPLETED } });
    await tx.activityEvent.create({
      data: {
        actorUserId: input.actorUserId,
        boardDayId: link.task.boardDayId,
        eventType: "repair_order.task_closed",
        message: `Repair assignment closed because the repair order closed: ${input.reason}`,
        metadata: { assignmentKey: link.assignmentKey, repairOrderId: input.repairOrderId },
        taskId: link.taskId
      }
    });
  }
  return links.length;
}

function ownerTaskStatus(state: string) {
  if (state === "BLOCKED") return TaskStatus.BLOCKED;
  if (state === "WAITING") return TaskStatus.WAITING_ON_APPROVAL;
  return TaskStatus.NOT_STARTED;
}

export async function reconcileRepairOrderOwnerTask(
  organizationId: string,
  repairOrderId: string,
  actorUserId: string,
  database: PrismaClient = prisma
) {
  const order = await database.repairOrder.findFirst({
    where: { id: repairOrderId, organizationId, closedAt: null },
    include: {
      customer: { select: { displayName: true } },
      serviceVisit: { select: { concernSummary: true } },
      vehicle: { select: { color: true, make: true, model: true, vehicleNumber: true, year: true } }
    }
  });
  if (!order) return null;
  return database.$transaction((tx) => upsertRepairOrderTaskProjection(tx, {
    assignmentKey: "RO_OWNER",
    assignedUserId: order.ownerUserId,
    createdByUserId: actorUserId,
    customerId: order.customerId,
    customerReference: order.customer?.displayName ?? null,
    description: `${order.nextAction}\n\nConcern: ${order.serviceVisit.concernSummary}`,
    desiredStatus: ownerTaskStatus(order.operatingState),
    dueAt: order.targetAt,
    organizationId,
    priority: order.operatingState === "BLOCKED" || order.targetAt < new Date() ? TaskTemplatePriority.CRITICAL : TaskTemplatePriority.HIGH,
    repairOrderId: order.id,
    repairOrderNumber: order.repairOrderNumber,
    title: `${order.repairOrderNumber} · ${order.nextAction}`,
    vehicleId: order.vehicleId,
    vehicleReference: repairOrderVehicleReference(order.vehicle)
  }));
}

export async function reconcileRepairJobTask(
  organizationId: string,
  repairJobId: string,
  actorUserId: string,
  database: PrismaClient = prisma
) {
  const job = await database.repairJob.findFirst({
    where: { id: repairJobId, organizationId },
    include: {
      dispatches: { where: { status: { in: ["ACTIVE", "STAGED"] } }, orderBy: { createdAt: "desc" }, take: 1 },
      repairOrder: {
        include: {
          customer: { select: { displayName: true } },
          vehicle: { select: { color: true, make: true, model: true, vehicleNumber: true, year: true } }
        }
      }
    }
  });
  const assignment = job?.dispatches[0];
  if (!job || !assignment || job.repairOrder.closedAt) return null;
  return database.$transaction((tx) => upsertRepairOrderTaskProjection(tx, {
    assignmentKey: `REPAIR_JOB:${job.id}`,
    assignedUserId: assignment.technicianUserId,
    createdByUserId: actorUserId,
    customerId: job.repairOrder.customerId,
    customerReference: job.repairOrder.customer?.displayName ?? null,
    description: `${job.plannedCorrection}\n\nRepair job ${job.jobNumber} on ${job.repairOrder.repairOrderNumber}.`,
    desiredStatus: TaskStatus.NOT_STARTED,
    dueAt: assignment.scheduledEndAt,
    organizationId,
    priority: job.priority === "CRITICAL" ? TaskTemplatePriority.CRITICAL : TaskTemplatePriority.HIGH,
    repairJobId: job.id,
    repairOrderId: job.repairOrderId,
    repairOrderNumber: job.repairOrder.repairOrderNumber,
    title: `${job.repairOrder.repairOrderNumber} · ${job.jobNumber} · ${job.description}`,
    vehicleId: job.repairOrder.vehicleId,
    vehicleReference: repairOrderVehicleReference(job.repairOrder.vehicle)
  }));
}

export async function synchronizeRepairJobTaskStatus(
  organizationId: string,
  repairJobId: string,
  actorUserId: string,
  status: TaskStatus,
  blockerReason: string | null,
  database: PrismaClient = prisma
) {
  const job = await database.repairJob.findFirst({ where: { id: repairJobId, organizationId }, select: { repairOrderId: true } });
  if (!job) return null;
  return database.$transaction((tx) => setRepairOrderTaskStatus(tx, {
    actorUserId,
    assignmentKey: `REPAIR_JOB:${repairJobId}`,
    blockerReason,
    organizationId,
    repairOrderId: job.repairOrderId,
    status
  }));
}

export async function closeRepairOrderTasks(
  organizationId: string,
  repairOrderId: string,
  actorUserId: string,
  reason: string,
  database: PrismaClient = prisma
) {
  return database.$transaction((tx) => completeOpenRepairOrderTasks(tx, { actorUserId, organizationId, repairOrderId, reason }));
}
