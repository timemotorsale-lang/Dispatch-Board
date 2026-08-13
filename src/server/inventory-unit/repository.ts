import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";

type Tx = Prisma.TransactionClient;
type MutationResult = { result: unknown; previous?: unknown };
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }

async function executeInventoryMutation(database: PrismaClient, input: EnterpriseCommandCommitInput, mutate: (tx: Tx, version: number) => Promise<MutationResult>) {
  return database.$transaction(async (tx) => {
    const existing = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: input.organizationId, domain: input.domain, commandType: input.commandType, idempotencyKey: input.idempotencyKey } } });
    if (existing) {
      if (existing.requestHash !== input.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
      return { duplicate: true, result: existing.resultSnapshot, version: existing.resultingVersion ?? input.expectedVersion };
    }
    const key = { organizationId_domain_subjectType_subjectId: { organizationId: input.organizationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId } };
    const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key }); const currentVersion = aggregate?.version ?? 0;
    if (currentVersion !== input.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${input.expectedVersion}, but current version is ${currentVersion}.`, "VERSION_CONFLICT");
    const version = currentVersion + 1; const mutation = await mutate(tx, version);
    if (aggregate) await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version, locationId: input.locationId } });
    else await tx.enterpriseAggregateVersion.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, version } });
    const resultSnapshot = json(mutation.result);
    const command = await tx.enterpriseCommandLedger.create({ data: { organizationId: input.organizationId, locationId: input.locationId, actorUserId: input.actorUserId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, commandType: input.commandType, status: "SUCCEEDED", idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, correlationId: input.correlationId, expectedVersion: input.expectedVersion, resultingVersion: version, resultSnapshot, completedAt: new Date() } });
    const eventType = `${input.commandType}_COMPLETED`;
    const event = await tx.enterpriseDomainEvent.create({ data: { organizationId: input.organizationId, locationId: input.locationId, commandId: command.id, domain: input.domain, aggregateType: input.subjectType, aggregateId: input.subjectId, aggregateVersion: version, eventType, payload: json({ ...input.payload, reason: input.reason, result: mutation.result }) } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId: input.organizationId, locationId: input.locationId, actorUserId: input.actorUserId, commandId: command.id, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, eventType, reason: input.reason, priorValue: mutation.previous == null ? undefined : json(mutation.previous), newValue: resultSnapshot, metadata: json({ requestHash: input.requestHash }), correlationId: input.correlationId } });
    await tx.enterpriseOutboxMessage.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domainEventId: event.id, topic: "vehicle-operations.retail-inventory", messageKey: input.subjectId, payload: json({ aggregateId: input.subjectId, aggregateVersion: version, correlationId: input.correlationId, eventId: event.id, eventType }) } });
    return { duplicate: false, result: mutation.result, version };
  });
}

export type InventoryUnitCreateRecord = { acquisitionSource: "AUCTION" | "TRADE" | "DIRECT_PURCHASE" | "DEALER_TRANSFER" | "CONSIGNMENT" | "OTHER"; actorUserId: string; financialAcquiredAt: Date; inventoryNumber: string; locationId: string; nextAction: string; operatingState: "ACTIVE" | "WAITING" | "BLOCKED"; ownerUserId: string; stateReason: string | null; targetAt: Date; vehicleId: string };
export type InventoryUnitControlRecord = Omit<InventoryUnitCreateRecord, "financialAcquiredAt" | "inventoryNumber" | "vehicleId">;

const detailInclude = { vehicle: { select: { id: true, vehicleNumber: true, vin: true, vinRaw: true, stockNumber: true, year: true, make: true, model: true, color: true } }, ownerUser: { select: { id: true, name: true, email: true } }, location: { select: { id: true, code: true, name: true } }, stateEvents: { orderBy: { version: "desc" as const }, take: 100, include: { actorUser: { select: { id: true, name: true } }, ownerUser: { select: { id: true, name: true } }, location: { select: { id: true, code: true, name: true } } } } };

export function createInventoryUnitRepository(database: PrismaClient = prisma) {
  return {
    async search(organizationId: string, input: { page: number; pageSize: number; query: string; state?: string; stage?: string }) {
      const where: Prisma.InventoryUnitWhereInput = { organizationId, closedAt: null };
      if (input.state) where.operatingState = input.state as Prisma.EnumInventoryUnitOperatingStateFilter;
      if (input.stage) where.lifecycleStage = input.stage as Prisma.EnumInventoryUnitLifecycleStageFilter;
      if (input.query.trim()) where.AND = input.query.trim().split(/\s+/).map((token) => ({ OR: [{ inventoryNumber: { contains: token, mode: "insensitive" } }, { nextAction: { contains: token, mode: "insensitive" } }, { vehicle: { vehicleNumber: { contains: token, mode: "insensitive" } } }, { vehicle: { vin: { contains: token.toUpperCase() } } }, { vehicle: { stockNumber: { contains: token, mode: "insensitive" } } }, { vehicle: { make: { contains: token, mode: "insensitive" } } }, { vehicle: { model: { contains: token, mode: "insensitive" } } }, { ownerUser: { name: { contains: token, mode: "insensitive" } } }, { location: { name: { contains: token, mode: "insensitive" } } }] }));
      const [total, items] = await Promise.all([database.inventoryUnit.count({ where }), database.inventoryUnit.findMany({ where, orderBy: [{ targetAt: "asc" }, { inventoryNumber: "asc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { vehicle: { select: { id: true, vehicleNumber: true, vin: true, stockNumber: true, year: true, make: true, model: true } }, ownerUser: { select: { id: true, name: true } }, location: { select: { id: true, code: true, name: true } }, _count: { select: { stateEvents: true } } } })]);
      return { items, page: input.page, pageSize: input.pageSize, total, totalPages: Math.max(1, Math.ceil(total / input.pageSize)) };
    },
    getDetail(organizationId: string, id: string) { return database.inventoryUnit.findFirst({ where: { id, organizationId }, include: detailInclude }); },
    async getCreateOptions(organizationId: string) {
      const [vehicles, locations, users] = await Promise.all([
        database.vehicle.findMany({ where: { organizationId, status: "ACTIVE", mergedIntoVehicleId: null, inventoryUnits: { none: { closedAt: null } } }, orderBy: { vehicleNumber: "asc" }, select: { id: true, vehicleNumber: true, vin: true, stockNumber: true, year: true, make: true, model: true } }),
        database.location.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
        database.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } })
      ]);
      return { locations, users, vehicles };
    },
    create(command: EnterpriseCommandCommitInput, data: InventoryUnitCreateRecord) {
      return executeInventoryMutation(database, command, async (tx, version) => {
        const vehicle = await tx.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: command.organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true, registryRelationships: { where: { relationshipType: { in: ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"] }, effectiveFrom: { lte: data.financialAcquiredAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: data.financialAcquiredAt } }] }, select: { id: true } } } });
        if (!vehicle) throw new Error("Inventory vehicle must be active in the canonical registry.");
        const [location, owner, openUnit] = await Promise.all([tx.location.findFirst({ where: { id: data.locationId, organizationId: command.organizationId }, select: { id: true } }), tx.user.findFirst({ where: { id: data.ownerUserId, isActive: true }, select: { id: true } }), tx.inventoryUnit.findFirst({ where: { organizationId: command.organizationId, vehicleId: data.vehicleId, closedAt: null }, select: { id: true } })]);
        if (!location) throw new Error("Inventory location does not belong to the organization."); if (!owner) throw new Error("Inventory owner must be an active user."); if (openUnit) throw new Error("Vehicle already has an open inventory unit.");
        if (!vehicle.registryRelationships.length) {
          const relationshipType = data.acquisitionSource === "TRADE" ? "TRADE_IN" : data.acquisitionSource === "CONSIGNMENT" ? "CONSIGNMENT" : "DEALERSHIP_OWNED";
          await tx.vehicleRelationship.create({ data: { effectiveFrom: data.financialAcquiredAt, notes: `Created from staff inventory recon intake for ${data.inventoryNumber}.`, organizationId: command.organizationId, relationshipType, sourceCode: "INVENTORY_INTAKE", sourceReference: data.acquisitionSource, vehicleId: data.vehicleId } });
        }
        const unit = await tx.inventoryUnit.create({ data: { id: command.subjectId, organizationId: command.organizationId, vehicleId: data.vehicleId, inventoryNumber: data.inventoryNumber, lifecycleStage: "PURCHASED_OR_TRADE_IN", operatingState: data.operatingState, financialAcquiredAt: data.financialAcquiredAt, stageStartedAt: data.financialAcquiredAt, ownerUserId: data.ownerUserId, locationId: data.locationId, targetAt: data.targetAt, nextAction: data.nextAction, stateReason: data.stateReason, version } });
        await tx.inventoryUnitStateEvent.create({ data: { organizationId: command.organizationId, inventoryUnitId: unit.id, version, fromStage: null, toStage: unit.lifecycleStage, fromOperatingState: null, toOperatingState: unit.operatingState, ownerUserId: unit.ownerUserId, locationId: unit.locationId, targetAt: unit.targetAt, nextAction: unit.nextAction, reason: command.reason, source: "USER", actorUserId: data.actorUserId, correlationId: command.correlationId, occurredAt: data.financialAcquiredAt } });
        return { result: { id: unit.id, inventoryNumber: unit.inventoryNumber, lifecycleStage: unit.lifecycleStage, operatingState: unit.operatingState, version } };
      });
    },
    updateControl(command: EnterpriseCommandCommitInput, data: InventoryUnitControlRecord) {
      return executeInventoryMutation(database, command, async (tx, version) => {
        const previous = await tx.inventoryUnit.findFirstOrThrow({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null } });
        if (data.targetAt < previous.financialAcquiredAt) throw new Error("Stage target cannot be before financial acquisition.");
        const [location, owner] = await Promise.all([tx.location.findFirst({ where: { id: data.locationId, organizationId: command.organizationId }, select: { id: true } }), tx.user.findFirst({ where: { id: data.ownerUserId, isActive: true }, select: { id: true } })]);
        if (!location) throw new Error("Inventory location does not belong to the organization."); if (!owner) throw new Error("Inventory owner must be an active user.");
        const unit = await tx.inventoryUnit.update({ where: { id: previous.id }, data: { locationId: data.locationId, nextAction: data.nextAction, operatingState: data.operatingState, ownerUserId: data.ownerUserId, stateReason: data.stateReason, targetAt: data.targetAt, version } });
        await tx.inventoryUnitStateEvent.create({ data: { organizationId: command.organizationId, inventoryUnitId: unit.id, version, fromStage: previous.lifecycleStage, toStage: unit.lifecycleStage, fromOperatingState: previous.operatingState, toOperatingState: unit.operatingState, ownerUserId: unit.ownerUserId, locationId: unit.locationId, targetAt: unit.targetAt, nextAction: unit.nextAction, reason: command.reason, source: "USER", actorUserId: data.actorUserId, correlationId: command.correlationId } });
        return { previous, result: { id: unit.id, lifecycleStage: unit.lifecycleStage, operatingState: unit.operatingState, version } };
      });
    }
  };
}
export type InventoryUnitRepository = ReturnType<typeof createInventoryUnitRepository>;
