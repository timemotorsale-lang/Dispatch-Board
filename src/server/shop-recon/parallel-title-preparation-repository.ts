import type { PrismaClient, ShopReconParallelOperationStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { emptyTitlePreparationChecklist, TITLE_PREPARATION_OPERATION, type normalizeTitlePreparationUpdate } from "./parallel-title-preparation-domain";

type UpdateData = ReturnType<typeof normalizeTitlePreparationUpdate>;

function contextInclude() {
  return { inventoryUnit: { select: { id: true } }, shopReconLifecycle: { include: { parallelOperations: { where: { operationCode: TITLE_PREPARATION_OPERATION }, take: 1 } } }, vehicle: { select: { id: true, vin: true } } };
}

export function createTitlePreparationRepository(database: PrismaClient = prisma) {
  return {
    getContext(organizationId: string, repairOrderId: string) {
      return database.repairOrder.findFirst({ where: { id: repairOrderId, organizationId, closedAt: null }, include: contextInclude() });
    },
    create(command: EnterpriseCommandCommitInput, data: { ownerUserId: string; now: Date; repairOrderId: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon-parallel", async tx => {
        const order = await tx.repairOrder.findFirst({ where: { id: data.repairOrderId, organizationId: command.organizationId, closedAt: null }, include: contextInclude() });
        if (!order) throw new Error("Repair order was not found.");
        if (order.origin !== "INVENTORY_RECON") throw new Error("Title preparation can only run beside an Inventory Recon vehicle.");
        if (!order.shopReconLifecycle) throw new Error("Save the current Shop & Recon stage once before starting parallel preparation.");
        const existing = order.shopReconLifecycle.parallelOperations[0];
        if (existing) return { result: existing };
        const operation = await tx.shopReconParallelOperation.create({ data: {
          id: command.subjectId, organizationId: command.organizationId, lifecycleId: order.shopReconLifecycle.id, repairOrderId: order.id,
          inventoryUnitId: order.inventoryUnit?.id ?? null, vehicleId: order.vehicle.id, operationCode: TITLE_PREPARATION_OPERATION,
          ownerUserId: data.ownerUserId, sourceVin: order.vehicle.vin, sourceScopeVersion: order.shopReconLifecycle.scopeVersion,
          checklist: toJson(emptyTitlePreparationChecklist()), evidenceReferences: toJson([]), lastValidatedAt: data.now,
        } });
        return { result: operation };
      });
    },
    update(command: EnterpriseCommandCommitInput, data: UpdateData, status: ShopReconParallelOperationStatus, now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon-parallel", async tx => {
        const previous = await tx.shopReconParallelOperation.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!previous) throw new Error("Parallel title preparation was not found.");
        if (["CANCELLED", "READY_FOR_INVENTORY_REVIEW"].includes(previous.status)) throw new Error("Submitted or cancelled preparation cannot be changed.");
        const operation = await tx.shopReconParallelOperation.update({ where: { id: previous.id }, data: {
          status, checklist: toJson(data.checklist), evidenceReferences: toJson(data.evidenceReferences),
          blockerNote: data.action === "RESUME" ? null : data.blockerNote, handoffNote: data.handoffNote,
          submittedAt: data.action === "SUBMIT_FOR_REVIEW" ? now : null, lastValidatedAt: now, version: command.expectedVersion + 1,
        } });
        return { previous, result: operation };
      });
    },
    requireRevalidation(command: EnterpriseCommandCommitInput, reasons: string[], now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon-parallel", async tx => {
        const previous = await tx.shopReconParallelOperation.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!previous) throw new Error("Parallel title preparation was not found.");
        const operation = await tx.shopReconParallelOperation.update({ where: { id: previous.id }, data: { status: "REVALIDATION_REQUIRED", blockerNote: `Source binding changed: ${reasons.join(", ")}`, lastValidatedAt: now, version: command.expectedVersion + 1 } });
        return { previous, result: operation };
      });
    },
  };
}
