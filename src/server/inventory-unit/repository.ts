import { InventoryUnitLifecycleStage, Prisma, type InventoryUnitOperatingState, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { allocateInventoryNumber } from "./number-allocation";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import type { normalizeCostRecord } from "./cost-domain";
import { comparePricing, type normalizePricing } from "./pricing-domain";

type Tx = Prisma.TransactionClient;
type MutationResult = { result: unknown; previous?: unknown };
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }

export async function executeInventoryMutation(database: PrismaClient, input: EnterpriseCommandCommitInput, mutate: (tx: Tx, version: number) => Promise<MutationResult>) {
  return database.$transaction(async (tx) => {
    if (["CREATE_INVENTORY_UNIT", "RECORD_INVENTORY_COST", "VOID_INVENTORY_COST", "SAVE_INVENTORY_PRICING", "SAVE_INVENTORY_INTAKE", "CONFIRM_INVENTORY_INTAKE"].includes(input.commandType)) {
      const retryScope = JSON.stringify([input.organizationId, input.domain, input.commandType, input.idempotencyKey]);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${retryScope}))`;
    }
    // Serialize version decisions before reading the ledger or mutable aggregate.
    const aggregateScope = JSON.stringify([input.organizationId, input.domain, input.subjectType, input.subjectId]);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${aggregateScope}))`;
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

export type InventoryUnitCreateRecord = { acquisitionSource: "AUCTION" | "TRADE" | "DIRECT_PURCHASE" | "DEALER_TRANSFER" | "CONSIGNMENT" | "OTHER"; actorUserId: string; financialAcquiredAt: Date; inventoryNumber: string | null; locationId: string; nextAction: string; operatingState: "ACTIVE" | "WAITING" | "BLOCKED"; ownerUserId: string; stateReason: string | null; targetAt: Date; vehicleId: string; intakeDraftRequired?: boolean };
export type InventoryUnitControlRecord = Omit<InventoryUnitCreateRecord, "acquisitionSource" | "financialAcquiredAt" | "inventoryNumber" | "vehicleId">;

const detailInclude = { vehicle: { select: { id: true, vehicleNumber: true, vin: true, vinRaw: true, stockNumber: true, year: true, make: true, model: true, color: true } }, ownerUser: { select: { id: true, name: true, email: true } }, location: { select: { id: true, code: true, name: true } }, stateEvents: { orderBy: { version: "desc" as const }, take: 100, include: { actorUser: { select: { id: true, name: true } }, ownerUser: { select: { id: true, name: true } }, location: { select: { id: true, code: true, name: true } } } } };

export function createInventoryUnitRepository(database: PrismaClient = prisma) {
  return {
    async search(organizationId: string, input: { page: number; pageSize: number; query: string; state?: InventoryUnitOperatingState; stage?: InventoryUnitLifecycleStage; locationId?: string; overdue?: boolean; sort?: "target" | "location"; now: Date }) {
      const where: Prisma.InventoryUnitWhereInput = { organizationId, closedAt: null };
      if (input.state) where.operatingState = input.state;
      if (input.stage) where.lifecycleStage = input.stage;
      if (input.locationId) where.locationId = input.locationId;
      if (input.overdue) where.targetAt = { lt: input.now };
      if (input.query.trim()) where.AND = input.query.trim().split(/\s+/).map((token) => ({ OR: [{ inventoryNumber: { contains: token, mode: "insensitive" } }, { nextAction: { contains: token, mode: "insensitive" } }, { vehicle: { vehicleNumber: { contains: token, mode: "insensitive" } } }, { vehicle: { vin: { contains: token.toUpperCase() } } }, { vehicle: { stockNumber: { contains: token, mode: "insensitive" } } }, { vehicle: { make: { contains: token, mode: "insensitive" } } }, { vehicle: { model: { contains: token, mode: "insensitive" } } }, { ownerUser: { name: { contains: token, mode: "insensitive" } } }, { location: { name: { contains: token, mode: "insensitive" } } }] }));
      return database.$transaction(async tx => {
        const total = await tx.inventoryUnit.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
        const page = Math.min(input.page, totalPages);
        const items = await tx.inventoryUnit.findMany({ where, orderBy: [...(input.sort === "location" ? [{ location: { name: "asc" as const } }] : []), { targetAt: "asc" }, { inventoryNumber: "asc" }, { id: "asc" }], skip: (page - 1) * input.pageSize, take: input.pageSize, include: { vehicle: { select: { id: true, vehicleNumber: true, vin: true, stockNumber: true, year: true, make: true, model: true } }, ownerUser: { select: { id: true, name: true } }, location: { select: { id: true, code: true, name: true } }, _count: { select: { stateEvents: true } } } });
        const groups = await tx.inventoryUnit.groupBy({ by: ["locationId", "operatingState", "lifecycleStage"], where, _count: { _all: true } });
        const overdueWhere = { ...where, targetAt: { lt: input.now } };
        const overdueGroups = await tx.inventoryUnit.groupBy({ by: ["locationId"], where: overdueWhere, _count: { _all: true } });
        const oldestOverdue = await tx.inventoryUnit.findFirst({ where: overdueWhere, orderBy: [{ targetAt: "asc" }, { id: "asc" }], select: { id: true, inventoryNumber: true, targetAt: true, vehicle: { select: { year: true, make: true, model: true } } } });
        const locations = await tx.location.findMany({ where: { organizationId }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, code: true, name: true } });
        const countState = (state: InventoryUnitOperatingState, locationId?: string) => groups.filter(group => group.operatingState === state && (!locationId || group.locationId === locationId)).reduce((sum, group) => sum + group._count._all, 0);
        const summary = {
          asOf: input.now.toISOString(), total,
          active: countState("ACTIVE"), waiting: countState("WAITING"), blocked: countState("BLOCKED"),
          overdue: overdueGroups.reduce((sum, group) => sum + group._count._all, 0), oldestOverdue,
          stages: Object.values(InventoryUnitLifecycleStage).map(stage => ({ stage, total: groups.filter(group => group.lifecycleStage === stage).reduce((sum, group) => sum + group._count._all, 0) })),
          locations: locations.map(location => ({ ...location, total: groups.filter(group => group.locationId === location.id).reduce((sum, group) => sum + group._count._all, 0), active: countState("ACTIVE", location.id), waiting: countState("WAITING", location.id), blocked: countState("BLOCKED", location.id), overdue: overdueGroups.find(group => group.locationId === location.id)?._count._all ?? 0 }))
        };
        return { items, page, pageSize: input.pageSize, total, totalPages, summary };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    },
    getDetail(organizationId: string, id: string) { return database.inventoryUnit.findFirst({ where: { id, organizationId }, include: detailInclude }); },
    getCostDetail(organizationId: string, vehicleId: string) {
      return database.inventoryUnit.findFirst({ where: { organizationId, vehicleId, closedAt: null }, include: { vehicle: { select: { id: true, vehicleNumber: true, year: true, make: true, model: true } }, costEntries: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] } } });
    },
    getPricingDetail(organizationId: string, vehicleId: string) {
      return database.inventoryUnit.findFirst({ where: { organizationId, vehicleId, closedAt: null }, include: { vehicle: { select: { id: true, vehicleNumber: true, year: true, make: true, model: true } }, costEntries: true, intakeRevisions: { where: { status: "CONFIRMED" }, orderBy: { version: "desc" }, take: 1, select: { details: true } }, pricingProposals: { orderBy: { inventoryVersion: "desc" }, take: 51 } } });
    },
    savePricing(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizePricing>) {
      return executeInventoryMutation(database, command, async (tx, version) => {
        await tx.$executeRaw`SELECT 1 FROM "InventoryUnit" WHERE id = ${command.subjectId} AND "organizationId" = ${command.organizationId} FOR UPDATE`;
        const unit = await tx.inventoryUnit.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: { costEntries: true } });
        if (!unit) throw new Error("Open inventory unit was not found.");
        if (unit.version !== command.expectedVersion || unit.locationId !== command.locationId) throw new EnterpriseCommandConflictError("Inventory changed; reload before changing price.", "VERSION_CONFLICT");
        const comparison = comparePricing(unit.costEntries, data);
        if (data.marginMode !== "OFF" && !comparison.known) throw new Error("Margin enforcement requires recorded acquisition cost and a complete supported cost basis.");
        if (data.marginMode !== "OFF" && !comparison.meetsThreshold) throw new Error("Proposed price does not meet the selected minimum margin.");
        const previous = await tx.inventoryPricingProposal.findFirst({ where: { organizationId: command.organizationId, inventoryUnitId: unit.id }, orderBy: { inventoryVersion: "desc" } });
        const proposal = await tx.inventoryPricingProposal.create({ data: { organizationId: command.organizationId, inventoryUnitId: unit.id, actorUserId: command.actorUserId, inventoryVersion: version, priceCents: data.priceCents, packEnabled: data.packEnabled, packCents: data.packCents, includeEstimates: data.includeEstimates, marginMode: data.marginMode, threshold: data.threshold, comparisonSnapshot: json(comparison), reason: data.reason } });
        await tx.inventoryUnit.update({ where: { id: unit.id }, data: { version } });
        await tx.inventoryUnitStateEvent.create({ data: { organizationId: command.organizationId, inventoryUnitId: unit.id, version, fromStage: unit.lifecycleStage, toStage: unit.lifecycleStage, fromOperatingState: unit.operatingState, toOperatingState: unit.operatingState, ownerUserId: unit.ownerUserId, locationId: unit.locationId, targetAt: unit.targetAt, nextAction: unit.nextAction, reason: command.reason, source: "USER", actorUserId: command.actorUserId, correlationId: command.correlationId } });
        return { previous, result: { id: unit.id, proposalId: proposal.id, version, priceCents: proposal.priceCents, comparison } };
      });
    },
    recordCost(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizeCostRecord>) {
      return executeInventoryMutation(database, command, async (tx, version) => {
        await tx.$executeRaw`SELECT 1 FROM "InventoryUnit" WHERE id = ${command.subjectId} AND "organizationId" = ${command.organizationId} FOR UPDATE`;
        const unit = await tx.inventoryUnit.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null } });
        if (!unit) throw new Error("Open inventory unit was not found.");
        if (unit.version !== command.expectedVersion || unit.locationId !== command.locationId) throw new EnterpriseCommandConflictError("Inventory changed; reload before recording costs.", "VERSION_CONFLICT");
        let previous;
        let cost;
        if (data.action === "VOID_COST") {
          previous = await tx.inventoryUnitCost.findFirst({ where: { id: data.costId, organizationId: command.organizationId, inventoryUnitId: unit.id, source: "MANUAL_STAFF_REPORT", status: { in: ["ESTIMATED", "INCURRED"] } } });
          if (!previous) throw new Error("Active manual cost record was not found.");
          cost = await tx.inventoryUnitCost.update({ where: { id: previous.id }, data: { status: "VOID" } });
        } else {
          const duplicate = await tx.inventoryUnitCost.findFirst({ where: { organizationId: command.organizationId, inventoryUnitId: unit.id, source: "MANUAL_STAFF_REPORT", reference: { equals: data.reference, mode: "insensitive" }, status: { in: ["ESTIMATED", "INCURRED"] } } });
          if (duplicate) throw new Error("This reference already has an active manual cost. Void the prior entry before correcting it.");
          cost = await tx.inventoryUnitCost.create({ data: { organizationId: command.organizationId, inventoryUnitId: unit.id, category: data.category, status: data.status, amountCents: data.amountCents, currency: data.currency, observedAt: data.observedAt, incurredAt: data.status === "INCURRED" ? data.observedAt : null, reference: data.reference, notes: data.notes, source: "MANUAL_STAFF_REPORT", confidence: "MEDIUM", createdByUserId: command.actorUserId } });
        }
        await tx.inventoryUnit.update({ where: { id: unit.id }, data: { version } });
        await tx.inventoryUnitStateEvent.create({ data: { organizationId: command.organizationId, inventoryUnitId: unit.id, version, fromStage: unit.lifecycleStage, toStage: unit.lifecycleStage, fromOperatingState: unit.operatingState, toOperatingState: unit.operatingState, ownerUserId: unit.ownerUserId, locationId: unit.locationId, targetAt: unit.targetAt, nextAction: unit.nextAction, reason: command.reason, source: "USER", actorUserId: command.actorUserId, correlationId: command.correlationId } });
        return { previous, result: { id: unit.id, costId: cost.id, status: cost.status, version } };
      });
    },
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
        const vehicleScope = JSON.stringify([command.organizationId, "OPEN_INVENTORY_UNIT", data.vehicleId]);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vehicleScope}))`;
        const vehicle = await tx.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: command.organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true, vin: true, registryRelationships: { where: { relationshipType: { in: ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"] }, effectiveFrom: { lte: data.financialAcquiredAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: data.financialAcquiredAt } }] }, select: { id: true } } } });
        if (!vehicle) throw new Error("Inventory vehicle must be active in the canonical registry.");
        if (data.intakeDraftRequired) {
          const intake = await tx.inventoryIntakeRevision.findFirst({ where: { organizationId: command.organizationId, vehicleId: data.vehicleId }, orderBy: { version: "desc" }, select: { status: true, inventoryUnitId: true } });
          if (!intake || intake.status !== "DRAFT" || intake.inventoryUnitId !== null) throw new Error("Save a new acquisition intake draft before opening its inventory cycle.");
        }
        const [location, owner, openUnit] = await Promise.all([tx.location.findFirst({ where: { id: data.locationId, organizationId: command.organizationId }, select: { id: true } }), tx.user.findFirst({ where: { id: data.ownerUserId, isActive: true }, select: { id: true } }), tx.inventoryUnit.findFirst({ where: { organizationId: command.organizationId, vehicleId: data.vehicleId, closedAt: null }, select: { id: true } })]);
        if (!location) throw new Error("Inventory location does not belong to the organization."); if (!owner) throw new Error("Inventory owner must be an active user."); if (openUnit) throw new Error("Vehicle already has an open inventory unit.");
        const inventoryNumber = await allocateInventoryNumber(tx, command.organizationId, vehicle, data.inventoryNumber);
        if (!vehicle.registryRelationships.length) {
          const relationshipType = data.acquisitionSource === "TRADE" ? "TRADE_IN" : data.acquisitionSource === "CONSIGNMENT" ? "CONSIGNMENT" : "DEALERSHIP_OWNED";
          await tx.vehicleRelationship.create({ data: { effectiveFrom: data.financialAcquiredAt, notes: `Created from staff inventory recon intake for ${inventoryNumber}.`, organizationId: command.organizationId, relationshipType, sourceCode: "INVENTORY_INTAKE", sourceReference: data.acquisitionSource, vehicleId: data.vehicleId } });
        }
        const unit = await tx.inventoryUnit.create({ data: { id: command.subjectId, organizationId: command.organizationId, vehicleId: data.vehicleId, inventoryNumber, lifecycleStage: "PURCHASED_OR_TRADE_IN", operatingState: data.operatingState, financialAcquiredAt: data.financialAcquiredAt, stageStartedAt: data.financialAcquiredAt, ownerUserId: data.ownerUserId, locationId: data.locationId, targetAt: data.targetAt, nextAction: data.nextAction, stateReason: data.stateReason, version } });
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
