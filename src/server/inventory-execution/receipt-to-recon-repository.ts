import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { RECEIPT_TO_RECON_STEPS, type normalizeReceiptToReconLaunch } from "./receipt-to-recon-domain";

type Launch = ReturnType<typeof normalizeReceiptToReconLaunch>;
export type ReceiptToReconRepository = ReturnType<typeof createReceiptToReconRepository>;
const ownerFor = (code: string, owners: Launch["owners"]) => code === "RECEIPT_IDENTITY_CUSTODY" || code === "INITIAL_CONDITION_EVIDENCE" ? owners.receipt : code === "INSPECTION" || code === "FINDINGS_TRIAGE" ? owners.inspection : owners.recon;

export function createReceiptToReconRepository(database: PrismaClient = prisma) {
  return {
    launch(command: EnterpriseCommandCommitInput, data: Launch & { actorUserId: string; ids: Array<{ packetId: string; taskId: string }>; now: Date; inventoryUnitId: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async tx => {
        const unit = await tx.inventoryUnit.findFirst({ where: { id: data.inventoryUnitId, organizationId: command.organizationId, closedAt: null }, include: { vehicle: { select: { id: true } } } });
        if (!unit) throw new Error("Open InventoryUnit was not found.");
        if (unit.version !== data.expectedInventoryVersion) throw new Error(`Expected InventoryUnit version ${data.expectedInventoryVersion}, but current version is ${unit.version}.`);
        const owners = [...new Set(Object.values(data.owners))], activeOwners = await tx.user.count({ where: { id: { in: owners }, isActive: true } });
        if (activeOwners !== owners.length) throw new Error("Every receipt-to-recon owner must be active.");
        const existing = await tx.inventoryWorkPacket.findFirst({ where: { organizationId: command.organizationId, vehicleId: unit.vehicleId, state: { notIn: ["COMPLETED", "CANCELLED"] } }, select: { id: true } });
        if (existing) throw new Error("Vehicle already has active Inventory EOS work.");
        const ready = data.readiness.vehiclePresent && data.readiness.keysPresent && data.readiness.custodySourceConfirmed;
        const created: Array<{ code: string; packetId: string; taskId: string; state: string }> = [];
        let previousTaskId: string | null = null;
        for (let index = 0; index < RECEIPT_TO_RECON_STEPS.length; index++) {
          const step = RECEIPT_TO_RECON_STEPS[index], ids = data.ids[index], targetAt = data.targets[step.code], ownerUserId = ownerFor(step.code, data.owners), boardDate = new Date(Date.UTC(targetAt.getUTCFullYear(), targetAt.getUTCMonth(), targetAt.getUTCDate())), board = await tx.boardDay.upsert({ where: { date: boardDate }, update: {}, create: { date: boardDate } }), state = index === 0 && ready ? "CURRENT" : "PLANNED";
          await tx.task.create({ data: { id: ids.taskId, boardDayId: board.id, title: step.title, description: step.purpose, assignedUserId: ownerUserId, status: "NOT_STARTED", priority: index === 0 ? "HIGH" : "MEDIUM", dueAt: targetAt, createdByUserId: data.actorUserId, requiresManagerApproval: true, vehicleReference: unit.vehicleId, vehicleId: unit.vehicleId, sourceType: "MANAGER", workflowArea: index < 2 ? "INVENTORY" : "SHOP", carryoverSourceTaskId: previousTaskId } });
          const readinessItems = index === 0 ? [{ code: "VEHICLE_PRESENT", label: "Vehicle physically present", required: true, satisfied: data.readiness.vehiclePresent, source: "Manager launch confirmation" }, { code: "KEYS_PRESENT", label: "Keys present", required: true, satisfied: data.readiness.keysPresent, source: "Manager launch confirmation" }, { code: "CUSTODY_SOURCE", label: "Custody source confirmed", required: true, satisfied: data.readiness.custodySourceConfirmed, source: "Manager launch confirmation" }] : [{ code: "PRIOR_HANDOFF", label: "Prior step completed and accepted", required: true, satisfied: false, source: "Inventory EOS handoff" }];
          const dependencies = index === 0 ? [] : [{ code: RECEIPT_TO_RECON_STEPS[index - 1].code, label: `${RECEIPT_TO_RECON_STEPS[index - 1].title} complete`, required: true, satisfied: false, source: "Inventory EOS work packet" }];
          const evidence = step.code === "INITIAL_CONDITION_EVIDENCE" ? [{ code: "RECEIPT_CONDITION_EVIDENCE", label: "Initial vehicle condition evidence", required: true, satisfied: false, source: "Vehicle evidence" }] : step.code === "INSPECTION" ? [{ code: "INSPECTION_FINDINGS", label: "Inspection findings and supporting evidence", required: true, satisfied: false, source: "Vehicle evidence" }] : [{ code: "STEP_COMPLETION", label: `${step.title} completion evidence`, required: true, satisfied: false, source: "Inventory EOS policy" }];
          const packet = await tx.inventoryWorkPacket.create({ data: { id: ids.packetId, organizationId: command.organizationId, taskId: ids.taskId, vehicleId: unit.vehicleId, inventoryUnitId: unit.id, locationId: unit.locationId, stageCode: step.code, state, purpose: step.purpose, nextAction: step.action, definitionOfDone: step.done, urgency: index === 0 ? "P1" : "P2", urgencyReason: index === 0 ? "Receipt and custody must be controlled before downstream work." : "Approved receipt-to-recon sequence.", readiness: index === 0 && ready ? "READY" : "NOT_READY", readinessSnapshot: toJson({ items: readinessItems }), dependencySnapshot: toJson({ items: dependencies }), evidenceRequirements: toJson({ items: evidence }), targetAt, estimatedMinutes: index === 0 ? 20 : index === 1 ? 15 : index === 2 ? 45 : 20, policyVersion: "inventory-eos-receipt-to-recon/v1", createdByUserId: data.actorUserId, version: 1 } });
          await tx.enterpriseAggregateVersion.create({ data: { organizationId: command.organizationId, locationId: unit.locationId, domain: "INVENTORY_EXECUTION", subjectType: "INVENTORY_WORK_PACKET", subjectId: packet.id, version: 1 } });
          created.push({ code: step.code, packetId: packet.id, taskId: ids.taskId, state }); previousTaskId = ids.taskId;
        }
        return { result: { inventoryUnitId: unit.id, vehicleId: unit.vehicleId, readyToStart: ready, steps: created, workbenchHref: `/vehicles/${unit.vehicleId}/workbench?inventoryUnitId=${unit.id}` } };
      });
    }
  };
}
