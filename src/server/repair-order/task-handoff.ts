import { randomUUID } from "node:crypto";
import { INITIAL_MINNEAPOLIS_LOCATION as location, INITIAL_ORGANIZATION as organization } from "@/server/appointments/location-foundation";
import { toAuthenticatedUser, type AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { isManager } from "@/server/policies/access";
import { getBoardDateInTimeZone } from "@/server/validation/board-date";
import { acceptRepairHandoff, recordHandoffActivity, RepairHandoffError } from "./task-handoff-record";

function activeActor(actor: AuthenticatedUser | null) {
  if (!actor?.isActive) throw new RepairHandoffError("Sign in to manage the Service handoff.", 401);
  return actor;
}

async function canManageRepair(actor: AuthenticatedUser, locationId: string) {
  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(actor.id, organization.id);
  return evaluateVehicleCapability({ actor, grants, capability: "REPAIR_ORDER_MANAGE", locationId }).allowed &&
    evaluateVehicleCapability({ actor, grants, capability: "REPAIR_ORDER_VIEW", locationId }).allowed;
}

function isServiceReceiver(actor: AuthenticatedUser) {
  return actor.roles.includes("Service Advisor") || isManager(actor);
}

async function localMembers(userId?: string) {
  const today = new Date(getBoardDateInTimeZone(new Date(), location.timezone));
  return prisma.userLocationAccess.findMany({
    where: {
      locationId: location.id, ...(userId ? { userId } : {}), canParticipate: true,
      validFrom: { lte: today }, OR: [{ validTo: null }, { validTo: { gte: today } }], user: { isActive: true }
    },
    include: { user: { include: {
      userRoles: { include: { role: { include: { roleDuties: { include: { duty: true } } } } } },
      userDuties: { include: { duty: true } }
    } } },
    orderBy: { user: { name: "asc" } }
  });
}

function canRequest(actor: AuthenticatedUser, task: { assignedUserId: string; ownerUserId: string | null }) {
  return isManager(actor) || actor.id === task.assignedUserId || actor.id === task.ownerUserId;
}

const taskSelect = {
  id: true, title: true, description: true, status: true, boardDayId: true,
  ownerUserId: true, assignedUserId: true, vehicleId: true, customerId: true,
  repairOrderLinks: { select: { id: true }, take: 1 },
  inventoryWorkPacket: { select: { repairOrderId: true } },
  serviceHandoff: { include: { repairOrder: { select: { repairOrderNumber: true } } } }
} as const;

function isEligibleTask(task: { status: string; repairOrderLinks: unknown[]; inventoryWorkPacket: { repairOrderId: string | null } | null }) {
  return task.status !== "COMPLETED" && !task.repairOrderLinks.length && !task.inventoryWorkPacket?.repairOrderId;
}

export async function getTaskRepairHandoff(actor: AuthenticatedUser, taskId: string, includeReceivers = false) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: taskSelect });
  if (!task) return null;
  const handoff = task.serviceHandoff;
  const canEdit = canRequest(actor, task);
  if (!canEdit && (actor.id !== handoff?.receiverUserId && actor.id !== handoff?.acceptedByUserId ||
      !handoff || !isServiceReceiver(actor) || !await canManageRepair(actor, handoff.locationId))) return null;
  if (!handoff && (!isEligibleTask(task) || !(await localMembers(actor.id)).length)) return null;
  const members = includeReceivers && !handoff ? await localMembers() : [];
  const receivers = await Promise.all(members.map(async ({ user }) => {
    const candidate = toAuthenticatedUser(user);
    return isServiceReceiver(candidate) && await canManageRepair(candidate, location.id) ? { id: user.id, name: user.name } : null;
  }));
  const receiver = handoff ? await prisma.user.findUnique({ where: { id: handoff.receiverUserId }, select: { name: true } }) : null;
  const canAccept = Boolean(handoff && !handoff.repairOrderId && isEligibleTask(task) &&
    isServiceReceiver(actor) && (actor.id === handoff.receiverUserId || isManager(actor)) && await canManageRepair(actor, handoff.locationId));
  return {
    canCancel: Boolean(canEdit && handoff && !handoff.repairOrderId), canAccept,
    canRequest: canEdit && !handoff && isEligibleTask(task), receivers: receivers.filter(value => value !== null),
    concern: handoff?.concern ?? (task.description.trim() || task.title).slice(0, 2000),
    receiverName: receiver?.name ?? null, pending: Boolean(handoff && !handoff.repairOrderId),
    repairOrderId: handoff?.repairOrderId ?? null,
    repairOrderNumber: handoff?.repairOrder?.repairOrderNumber ?? null,
    cancellationToken: canEdit && handoff && !handoff.repairOrderId ? handoff.requestToken : null
  };
}

export function textField(value: unknown, label: string, length = 120) {
  if (typeof value !== "string" || !value.trim() || value.length > length) {
    throw new RepairHandoffError(`Enter a valid ${label}.`, 400);
  }
  return value.trim();
}

export async function requestTaskRepairHandoff(actor: AuthenticatedUser | null, taskId: string, receiverValue: unknown, concernValue: unknown) {
  const user = activeActor(actor);
  const receiverUserId = textField(receiverValue, "receiving Service advisor");
  const concern = textField(concernValue, "customer concern", 2000);
  if (!(await localMembers(user.id)).length) throw new RepairHandoffError("Service location access is required.", 403);
  const [member] = await localMembers(receiverUserId);
  const receiver = member ? toAuthenticatedUser(member.user) : null;
  if (!receiver || !isServiceReceiver(receiver) || !await canManageRepair(receiver, location.id)) {
    throw new RepairHandoffError("Choose an active advisor authorized for this Service location.", 403);
  }
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Task" WHERE "id" = ${taskId} FOR NO KEY UPDATE`;
    const task = await tx.task.findUnique({ where: { id: taskId }, select: taskSelect });
    if (!task || !canRequest(user, task)) throw new RepairHandoffError("Only the task owner, assignee, or manager can request a handoff.", 403);
    if (!isEligibleTask(task)) throw new RepairHandoffError("This task has already been completed or belongs to a repair order.");
    for (const [id, record] of [[task.vehicleId, task.vehicleId ? await tx.vehicle.findFirst({ where: { id: task.vehicleId, organizationId: organization.id }, select: { id: true } }) : null],
      [task.customerId, task.customerId ? await tx.customer.findFirst({ where: { id: task.customerId, organizationId: organization.id }, select: { id: true } }) : null]] as const) {
      if (id && !record) throw new RepairHandoffError("The task’s customer or vehicle belongs to another organization.", 403);
    }
    if (task.serviceHandoff) {
      if (!task.serviceHandoff.repairOrderId && task.serviceHandoff.receiverUserId === receiverUserId && task.serviceHandoff.concern === concern) return;
      throw new RepairHandoffError("This task already has a Service handoff.");
    }
    await tx.taskRepairHandoff.create({ data: {
      taskId, requestToken: randomUUID(), organizationId: organization.id, locationId: location.id,
      receiverUserId, requestedByUserId: user.id, concern
    } });
    await tx.task.update({ where: { id: taskId }, data: { updatedAt: new Date() } });
    await recordHandoffActivity(tx, task, user.id, "requested", { receiverUserId, locationId: location.id });
  }, { isolationLevel: "Serializable" });
}

export async function cancelTaskRepairHandoff(actor: AuthenticatedUser | null, taskId: string, token: unknown) {
  const user = activeActor(actor);
  const requestToken = textField(token, "handoff reference");
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId }, select: taskSelect });
    if (!task || !canRequest(user, task)) throw new RepairHandoffError("You can’t cancel this handoff.", 403);
    const result = await tx.taskRepairHandoff.deleteMany({
      where: { taskId, organizationId: organization.id, requestToken, repairOrderId: null }
    });
    if (!result.count) throw new RepairHandoffError("There is no pending handoff to cancel.");
    await recordHandoffActivity(tx, task, user.id, "cancelled", {});
  }, { isolationLevel: "Serializable" });
}

export async function getServiceHandoffIntake(actor: AuthenticatedUser | null, taskId: string) {
  const user = activeActor(actor);
  const handoff = await prisma.taskRepairHandoff.findFirst({
    where: { taskId, organizationId: organization.id },
    include: { task: { select: { title: true, status: true, vehicleId: true, customerId: true } } }
  });
  if (!handoff || !isServiceReceiver(user) || (handoff.receiverUserId !== user.id && !isManager(user)) || !await canManageRepair(user, handoff.locationId)) {
    throw new RepairHandoffError("This handoff is available to the receiving advisor and repair-authorized managers.", 403);
  }
  if (handoff.task.status === "COMPLETED" && !handoff.repairOrderId) throw new RepairHandoffError("Reopen the source task before accepting the handoff.");
  return handoff;
}

export async function listPendingServiceHandoffs(actor: AuthenticatedUser) {
  if (!actor.isActive || !isServiceReceiver(actor) || !await canManageRepair(actor, location.id)) return [];
  return prisma.taskRepairHandoff.findMany({
    where: {
      organizationId: organization.id, locationId: location.id, repairOrderId: null,
      task: { status: { not: "COMPLETED" } },
      ...(isManager(actor) ? {} : { receiverUserId: actor.id })
    },
    orderBy: { requestedAt: "asc" }, take: 50, select: { taskId: true, task: { select: { title: true } } }
  });
}

export async function listServiceHandoffOrders(actor: AuthenticatedUser | null, taskId: string, vehicleValue: unknown) {
  const handoff = await getServiceHandoffIntake(actor, taskId);
  const vehicleId = textField(vehicleValue, "vehicle");
  if (handoff.task.vehicleId && handoff.task.vehicleId !== vehicleId) {
    throw new RepairHandoffError("Select the vehicle already confirmed on the source task.");
  }
  return prisma.repairOrder.findMany({
    where: { organizationId: handoff.organizationId, locationId: handoff.locationId, origin: "CUSTOMER_REPAIR", closedAt: null, vehicleId },
    orderBy: { openedAt: "asc" },
    select: {
      id: true, repairOrderNumber: true, openedAt: true, closedAt: true, operatingState: true, stage: true, version: true,
      customer: { select: { displayName: true } }, serviceVisit: { select: { concernSummary: true } },
      vehicle: { select: { id: true, vehicleNumber: true, year: true, make: true, model: true } }
    }
  });
}

export async function linkExistingServiceOrder(actor: AuthenticatedUser | null, taskId: string, body: Record<string, unknown>) {
  const user = activeActor(actor);
  const handoff = await getServiceHandoffIntake(user, taskId);
  const orderId = textField(body.repairOrderId, "repair order");
  const requestToken = textField(body.requestToken, "handoff reference");
  const vehicleId = textField(body.vehicleId, "confirmed vehicle");
  const customerId = textField(body.customerId, "confirmed customer");
  if (body.confirmSameVisit !== true) throw new RepairHandoffError("Confirm the existing order covers this visit.", 400);
  return prisma.$transaction(async (tx) => {
    const order = await tx.repairOrder.findFirst({
      where: {
        id: orderId, organizationId: handoff.organizationId, locationId: handoff.locationId,
        origin: "CUSTOMER_REPAIR", closedAt: null, vehicleId, customerId
      },
      select: { id: true, repairOrderNumber: true, locationId: true, vehicleId: true, customerId: true }
    });
    if (!order) throw new RepairHandoffError("Choose an open order for this customer, vehicle, and Service location.");
    await acceptRepairHandoff(tx, {
      taskId, requestToken, organizationId: handoff.organizationId, locationId: handoff.locationId,
      actorUserId: user.id, canAcceptForReceiver: isManager(user)
    }, order);
    return order;
  }, { isolationLevel: "Serializable" });
}
