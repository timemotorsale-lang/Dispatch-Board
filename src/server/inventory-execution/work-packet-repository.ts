import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import type { normalizeInventoryWorkPacketCreate, InventoryWorkPacketState } from "./work-packet-domain";

type CreateData = ReturnType<typeof normalizeInventoryWorkPacketCreate> & { createdByUserId: string; id: string };

export type InventoryWorkPacketRepository = {
  create(command: EnterpriseCommandCommitInput, data: CreateData): Promise<{ duplicate: boolean; result: unknown; version: number }>;
  find(organizationId: string, id: string): Promise<unknown | null>;
  setPosition(command: EnterpriseCommandCommitInput, state: "PLANNED" | "CURRENT" | "STAGED" | "CANCELLED"): Promise<{ duplicate: boolean; result: unknown; version: number }>;
};

function result(packet: { id: string; taskId: string; vehicleId: string; state: InventoryWorkPacketState; version: number }) {
  return { id: packet.id, taskId: packet.taskId, vehicleId: packet.vehicleId, state: packet.state, version: packet.version };
}

export function createInventoryWorkPacketRepository(database: PrismaClient = prisma): InventoryWorkPacketRepository {
  return {
    async find(organizationId, id) {
      return database.inventoryWorkPacket.findFirst({ where: { id, organizationId }, include: { task: { select: { id: true, title: true, status: true, assignedUserId: true, vehicleId: true, dueAt: true } } } });
    },
    create(command, data) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async (tx) => {
        const task = await tx.task.findUnique({ where: { id: data.taskId }, select: { id: true, vehicleId: true, assignedUser: { select: { isActive: true } }, inventoryWorkPacket: { select: { id: true } } } });
        if (!task || task.vehicleId !== data.vehicleId) throw new Error("Inventory Work Packet task must belong to the selected vehicle.");
        if (!task.assignedUser.isActive) throw new Error("Inventory Work Packet task owner must be active.");
        if (task.inventoryWorkPacket) throw new Error("Task already has an Inventory Work Packet.");
        const vehicle = await tx.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: command.organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true } });
        if (!vehicle) throw new Error("Vehicle is unavailable in this organization.");
        if (data.locationId) {
          const location = await tx.location.findFirst({ where: { id: data.locationId, organizationId: command.organizationId }, select: { id: true } });
          if (!location) throw new Error("Location is unavailable in this organization.");
        }
        if (data.inventoryUnitId) {
          const unit = await tx.inventoryUnit.findFirst({ where: { id: data.inventoryUnitId, organizationId: command.organizationId, vehicleId: data.vehicleId }, select: { id: true } });
          if (!unit) throw new Error("Inventory unit does not belong to this vehicle.");
        }
        if (data.repairOrderId) {
          const order = await tx.repairOrder.findFirst({ where: { id: data.repairOrderId, organizationId: command.organizationId, vehicleId: data.vehicleId }, select: { id: true } });
          if (!order) throw new Error("Repair order does not belong to this vehicle.");
        }
        if (data.state === "CURRENT" || data.state === "STAGED") {
          const occupied = await tx.inventoryWorkPacket.findFirst({ where: { organizationId: command.organizationId, vehicleId: data.vehicleId, state: data.state }, select: { id: true } });
          if (occupied) throw new Error(`Vehicle already has ${data.state === "CURRENT" ? "current" : "staged"} work.`);
        }
        const packet = await tx.inventoryWorkPacket.create({ data: {
          id: data.id, organizationId: command.organizationId, taskId: data.taskId, vehicleId: data.vehicleId,
          inventoryUnitId: data.inventoryUnitId, repairOrderId: data.repairOrderId, repairJobId: data.repairJobId,
          locationId: data.locationId, stageCode: data.stageCode, state: data.state, purpose: data.purpose,
          nextAction: data.nextAction, definitionOfDone: data.definitionOfDone, urgency: data.urgency,
          urgencyReason: data.urgencyReason, readiness: data.readiness, readinessSnapshot: toJson(data.readinessSnapshot),
          dependencySnapshot: toJson(data.dependencySnapshot), evidenceRequirements: toJson(data.evidenceRequirements),
          targetAt: data.targetAt, nextCheckAt: data.nextCheckAt, escalationAt: data.escalationAt,
          estimatedMinutes: data.estimatedMinutes, policyVersion: data.policyVersion, version: 1, createdByUserId: data.createdByUserId
        } });
        return { result: result(packet) };
      });
    },
    setPosition(command, state) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async (tx) => {
        const previous = await tx.inventoryWorkPacket.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!previous) throw new Error("Inventory Work Packet was not found.");
        if (["COMPLETED", "CANCELLED"].includes(previous.state)) throw new Error("Terminal Inventory Work Packets cannot be repositioned.");
        if (state === "CURRENT" || state === "STAGED") {
          const occupied = await tx.inventoryWorkPacket.findFirst({ where: { organizationId: command.organizationId, vehicleId: previous.vehicleId, state, id: { not: previous.id } }, select: { id: true } });
          if (occupied) throw new Error(`Vehicle already has ${state === "CURRENT" ? "current" : "staged"} work.`);
        }
        const packet = await tx.inventoryWorkPacket.update({ where: { id: previous.id }, data: { state, version: command.expectedVersion + 1 } });
        return { previous, result: result(packet) };
      });
    }
  };
}
