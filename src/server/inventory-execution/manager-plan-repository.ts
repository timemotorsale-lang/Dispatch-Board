import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import type { normalizeManagerPlan } from "./manager-plan-domain";

type Plan = ReturnType<typeof normalizeManagerPlan>;
export type ManagerPlanRepository = ReturnType<typeof createManagerPlanRepository>;

export function createManagerPlanRepository(database: PrismaClient = prisma) {
  return {
    getContext(organizationId: string, packetId: string) { return database.inventoryWorkPacket.findFirst({ where: { id: packetId, organizationId }, include: { task: { select: { id: true, boardDayId: true, vehicleId: true } }, closeout: true, managerPlan: true } }); },
    publish(command: EnterpriseCommandCommitInput, data: Plan & { managerId: string; managerPlanId: string; nextPacketId: string | null; nextTaskId: string | null; now: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async (tx, version) => {
        const current = await tx.inventoryWorkPacket.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId }, include: { closeout: true, managerPlan: true, task: true } }); if (!current?.closeout) throw new Error("Technician closeout is required before manager review."); if (current.managerPlan) throw new Error("Manager next plan already exists for this work packet.");
        if (data.publishNextWork && data.nextWork) { const owner = await tx.user.findFirst({ where: { id: data.nextWork.assignedUserId, isActive: true }, select: { id: true } }); if (!owner) throw new Error("Next task owner must be active."); const staged = await tx.inventoryWorkPacket.findFirst({ where: { organizationId: command.organizationId, vehicleId: current.vehicleId, state: "STAGED" }, select: { id: true } }); if (staged) throw new Error("Vehicle already has staged work."); }
        let nextTaskId: string | null = null, nextPacketId: string | null = null;
        if (data.publishNextWork && data.nextWork && data.nextTaskId && data.nextPacketId) {
          const boardDate = new Date(Date.UTC(data.nextWork.dueAt.getUTCFullYear(), data.nextWork.dueAt.getUTCMonth(), data.nextWork.dueAt.getUTCDate())), board = await tx.boardDay.upsert({ where: { date: boardDate }, update: {}, create: { date: boardDate } });
          const task = await tx.task.create({ data: { id: data.nextTaskId, boardDayId: board.id, title: data.nextWork.title, description: data.nextWork.description, assignedUserId: data.nextWork.assignedUserId, status: "NOT_STARTED", priority: data.nextWork.priority, dueAt: data.nextWork.dueAt, createdByUserId: data.managerId, requiresManagerApproval: data.nextWork.requiresManagerApproval, vehicleReference: current.vehicleId, vehicleId: current.vehicleId, sourceType: "MANAGER", workflowArea: data.nextWork.workflowArea, carryoverSourceTaskId: current.taskId } });
          const packet = data.nextWork.packet, created = await tx.inventoryWorkPacket.create({ data: { id: data.nextPacketId, organizationId: command.organizationId, taskId: task.id, vehicleId: current.vehicleId, inventoryUnitId: current.inventoryUnitId, repairOrderId: current.repairOrderId, repairJobId: current.repairJobId, locationId: current.locationId, stageCode: packet.stageCode, state: "STAGED", purpose: packet.purpose, nextAction: packet.nextAction, definitionOfDone: packet.definitionOfDone, urgency: packet.urgency, urgencyReason: packet.urgencyReason, readiness: packet.readiness, readinessSnapshot: toJson(packet.readinessSnapshot), dependencySnapshot: toJson(packet.dependencySnapshot), evidenceRequirements: toJson(packet.evidenceRequirements), targetAt: packet.targetAt, nextCheckAt: packet.nextCheckAt, escalationAt: packet.escalationAt, estimatedMinutes: packet.estimatedMinutes, policyVersion: packet.policyVersion, version: 1, createdByUserId: data.managerId } });
          await tx.enterpriseAggregateVersion.create({ data: { organizationId: command.organizationId, locationId: current.locationId, domain: "INVENTORY_EXECUTION", subjectType: "INVENTORY_WORK_PACKET", subjectId: created.id, version: 1 } }); nextTaskId = task.id; nextPacketId = created.id;
        }
        const plan = await tx.inventoryManagerPlan.create({ data: { id: data.managerPlanId, organizationId: command.organizationId, workPacketId: current.id, decision: data.decision, direction: data.direction, internalNote: data.internalNote, nextWorkSnapshot: data.nextWork ? toJson(data.nextWork) : undefined, publishedTaskId: nextTaskId, publishedWorkPacketId: nextPacketId, decidedByUserId: data.managerId, decidedAt: data.now } });
        const approved = data.decision === "APPROVE_COMPLETE", returned = data.decision === "RETURN_FOR_REWORK" || data.decision === "REQUIRE_DIAGNOSIS", nextState = approved ? "COMPLETED" : returned ? "BLOCKED" : data.decision === "CANCEL" ? "CANCELLED" : "WAITING";
        await tx.inventoryWorkPacket.update({ where: { id: current.id }, data: { state: nextState, version } }); await tx.task.update({ where: { id: current.taskId }, data: { status: approved ? "COMPLETED" : returned ? "BLOCKED" : data.decision === "CANCEL" ? "COMPLETED" : "WAITING_ON_APPROVAL", completedAt: approved || data.decision === "CANCEL" ? data.now : null, reviewedByUserId: data.managerId, blockerReason: returned ? data.direction : null } });
        return { previous: current, result: { decision: plan.decision, managerPlanId: plan.id, nextPacketId, nextTaskId, packetState: nextState, version } };
      });
    }
  };
}
