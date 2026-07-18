import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";

type Stage = "CANDIDATE_REVIEW" | "APPRAISAL" | "CHANNEL_PRICING" | "APPROVAL" | "ACTIVATION" | "OFFERS_BIDS" | "SALE_TRANSFER" | "SETTLEMENT" | "CLOSED";
type State = "ACTIVE" | "WAITING" | "BLOCKED" | "DEFERRED" | "DISMISSED" | "CANCELLED" | "CLOSED";
type SnapshotField = "candidateSnapshot" | "appraisalVersions" | "proposalVersions" | "approvalSnapshot" | "activationSnapshot" | "offerVersions" | "completionSnapshot" | "settlementSnapshot" | "recommendationSnapshot" | "exceptionSnapshot";

export function createDispositionWholesaleRepository(database: PrismaClient = prisma) {
  return {
    async aggregateVersion(organizationId: string, subjectId: string) {
      const row = await database.enterpriseAggregateVersion.findUnique({ where: { organizationId_domain_subjectType_subjectId: { organizationId, domain: "INVENTORY_LIFECYCLE", subjectType: "INVENTORY_DISPOSITION_CASE", subjectId } }, select: { version: true } });
      return row?.version ?? 0;
    },

    async overview(organizationId: string) {
      const [cases, candidateUnits, users, locations] = await Promise.all([
        database.inventoryDispositionCase.findMany({ where: { organizationId }, orderBy: [{ operatingState: "asc" }, { targetAt: "asc" }], include: { inventoryUnit: { include: { vehicle: { select: { vehicleNumber: true, year: true, make: true, model: true, vin: true } }, costEntries: { orderBy: { observedAt: "desc" } }, titleReadiness: { orderBy: { version: "desc" }, take: 1 } } }, location: { select: { id: true, name: true } }, ownerUser: { select: { id: true, name: true } }, events: { orderBy: { version: "desc" }, take: 30, include: { actorUser: { select: { name: true } } } } } }),
        database.inventoryUnit.findMany({ where: { organizationId, closedAt: null, lifecycleStage: { notIn: ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] }, dispositionCase: null }, orderBy: { financialAcquiredAt: "asc" }, take: 500, include: { vehicle: { select: { vehicleNumber: true, year: true, make: true, model: true, vin: true } }, costEntries: { orderBy: { observedAt: "desc" } }, titleReadiness: { orderBy: { version: "desc" }, take: 1 }, location: { select: { id: true, name: true } }, ownerUser: { select: { id: true, name: true } } } }),
        database.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        database.location.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ]);
      return { candidateUnits, cases, locations, users };
    },

    create(command: EnterpriseCommandCommitInput, data: { inventoryUnitId: string; ownerUserId: string; reasonCodes: string[]; targetAt: Date; occurredAt: Date; recommendation: unknown }) {
      return executeAggregateMutation(database, command, "vehicle-operations.disposition", async (tx, version) => {
        const unit = await tx.inventoryUnit.findFirst({ where: { id: data.inventoryUnitId, organizationId: command.organizationId, closedAt: null, lifecycleStage: { notIn: ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] }, dispositionCase: null }, include: { vehicle: { select: { vehicleNumber: true, vin: true } }, costEntries: true, titleReadiness: { orderBy: { version: "desc" }, take: 1 } } });
        if (!unit) throw new Error("Eligible inventory unit without an active disposition case was not found.");
        const owner = await tx.user.findFirst({ where: { id: data.ownerUserId, isActive: true } });
        if (!owner) throw new Error("Active disposition owner was not found.");
        const candidateSnapshot = { costExposureCents: unit.costEntries.reduce((sum, item) => sum + item.amountCents, 0), financialAcquiredAt: unit.financialAcquiredAt, inventoryNumber: unit.inventoryNumber, lifecycleStage: unit.lifecycleStage, locationId: unit.locationId, recommendation: data.recommendation, titleReadiness: unit.titleReadiness[0] ?? null, vehicleNumber: unit.vehicle.vehicleNumber, vin: unit.vehicle.vin };
        const record = await tx.inventoryDispositionCase.create({ data: { id: command.subjectId, organizationId: command.organizationId, inventoryUnitId: unit.id, locationId: unit.locationId, ownerUserId: owner.id, reasonCodes: toJson(data.reasonCodes), candidateSnapshot: toJson([candidateSnapshot]), appraisalVersions: toJson([]), proposalVersions: toJson([]), approvalSnapshot: toJson({}), activationSnapshot: toJson({}), offerVersions: toJson([]), completionSnapshot: toJson({}), settlementSnapshot: toJson({}), recommendationSnapshot: toJson(data.recommendation), exceptionSnapshot: toJson([]), targetAt: data.targetAt, nextAction: "Review candidate evidence and accept, dismiss, or defer", version } });
        await tx.inventoryDispositionCaseEvent.create({ data: { organizationId: command.organizationId, dispositionCaseId: record.id, version, toStage: record.stage, toOperatingState: record.operatingState, commandType: command.commandType, snapshot: toJson(candidateSnapshot), actorUserId: command.actorUserId, reason: command.reason, correlationId: command.correlationId, occurredAt: data.occurredAt } });
        return { result: { id: record.id, inventoryUnitId: unit.id, stage: record.stage, operatingState: record.operatingState, version } };
      });
    },

    apply(command: EnterpriseCommandCommitInput, data: { append: boolean; close?: boolean; deferredUntil?: Date | null; nextAction: string; operatingState: State; snapshot: unknown; snapshotField: SnapshotField; stage: Stage; stateReason?: string | null; targetAt?: Date; updateInventoryStage?: boolean }) {
      return executeAggregateMutation(database, command, "vehicle-operations.disposition", async (tx, version) => {
        const record = await tx.inventoryDispositionCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!record) throw new Error("Disposition case was not found.");
        const current = record[data.snapshotField] as unknown;
        const snapshot = data.append ? [...(Array.isArray(current) ? current : []), data.snapshot] : data.snapshot;
        const occurredAt = (data.snapshot && typeof data.snapshot === "object" && "occurredAt" in data.snapshot) ? new Date(String((data.snapshot as Record<string, unknown>).occurredAt)) : new Date();
        const next = await tx.inventoryDispositionCase.update({ where: { id: record.id }, data: { [data.snapshotField]: toJson(snapshot), stage: data.stage, operatingState: data.operatingState, nextAction: data.nextAction, stateReason: data.stateReason ?? null, deferredUntil: data.deferredUntil, targetAt: data.targetAt, closedAt: data.close ? occurredAt : record.closedAt, version } as never });
        if (data.updateInventoryStage) await tx.inventoryUnit.update({ where: { id: record.inventoryUnitId }, data: { lifecycleStage: "WHOLESALED_OR_OTHER_DISPOSITION", operatingState: data.close ? "CLOSED" : "ACTIVE", closedAt: data.close ? occurredAt : null, nextAction: data.close ? "Disposition settled and reconciled" : "Complete disposition settlement", version: { increment: 1 } } });
        await tx.inventoryDispositionCaseEvent.create({ data: { organizationId: command.organizationId, dispositionCaseId: record.id, version, fromStage: record.stage, toStage: next.stage, fromOperatingState: record.operatingState, toOperatingState: next.operatingState, commandType: command.commandType, snapshot: toJson(data.snapshot), actorUserId: command.actorUserId, reason: command.reason, correlationId: command.correlationId, occurredAt } });
        return { previous: record, result: { id: next.id, stage: next.stage, operatingState: next.operatingState, nextAction: next.nextAction, version } };
      });
    },
  };
}

export type DispositionWholesaleRepository = ReturnType<typeof createDispositionWholesaleRepository>;
