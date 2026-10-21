import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";

type Tx = Prisma.TransactionClient;
type MutationResult = { result: unknown; previous?: unknown };

function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }

async function executeRegistryMutation(database: PrismaClient, input: EnterpriseCommandCommitInput, mutate: (tx: Tx, version: number) => Promise<MutationResult>) {
  return database.$transaction(async (tx) => {
    const existing = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: input.organizationId, domain: input.domain, commandType: input.commandType, idempotencyKey: input.idempotencyKey } } });
    if (existing) {
      if (existing.requestHash !== input.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
      return { duplicate: true, result: existing.resultSnapshot, version: existing.resultingVersion ?? input.expectedVersion };
    }
    if (input.locationId) {
      const location = await tx.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId }, select: { id: true } });
      if (!location) throw new Error("Location does not belong to the command organization.");
    }
    const key = { organizationId_domain_subjectType_subjectId: { organizationId: input.organizationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId } };
    const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key });
    const currentVersion = aggregate?.version ?? 0;
    const colorCorrectionCanUseLatest = input.commandType === "CORRECT_VEHICLE_COLOR" && currentVersion > input.expectedVersion;
    if (currentVersion !== input.expectedVersion && !colorCorrectionCanUseLatest) throw new EnterpriseCommandConflictError(`Expected version ${input.expectedVersion}, but current version is ${currentVersion}.`, "VERSION_CONFLICT");
    const version = (colorCorrectionCanUseLatest ? currentVersion : input.expectedVersion) + 1;
    const mutation = await mutate(tx, version);
    if (aggregate) await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version, locationId: input.locationId } });
    else await tx.enterpriseAggregateVersion.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, version } });
    const resultSnapshot = json(mutation.result);
    const command = await tx.enterpriseCommandLedger.create({ data: { organizationId: input.organizationId, locationId: input.locationId, actorUserId: input.actorUserId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, commandType: input.commandType, status: "SUCCEEDED", idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, correlationId: input.correlationId, expectedVersion: input.expectedVersion, resultingVersion: version, resultSnapshot, completedAt: new Date() } });
    const eventType = `${input.commandType}_COMPLETED`;
    const event = await tx.enterpriseDomainEvent.create({ data: { organizationId: input.organizationId, locationId: input.locationId, commandId: command.id, domain: input.domain, aggregateType: input.subjectType, aggregateId: input.subjectId, aggregateVersion: version, eventType, payload: json({ ...input.payload, reason: input.reason, result: mutation.result }) } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId: input.organizationId, locationId: input.locationId, actorUserId: input.actorUserId, commandId: command.id, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, eventType, reason: input.reason, priorValue: mutation.previous == null ? undefined : json(mutation.previous), newValue: resultSnapshot, metadata: json({ requestHash: input.requestHash }), correlationId: input.correlationId } });
    await tx.enterpriseOutboxMessage.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domainEventId: event.id, topic: "vehicle-operations.vehicle-registry", messageKey: input.subjectId, payload: json({ aggregateId: input.subjectId, aggregateVersion: version, correlationId: input.correlationId, eventId: event.id, eventType }) } });
    return { duplicate: false, result: mutation.result, version };
  });
}

export type RegistryIdentity = {
  vehicleNumber: string; vin: string | null; vinRaw: string | null; vinState: "VALID" | "NON_VIN_EXCEPTION"; vinValidationSource: string; nonVinReason: string | null;
  stockNumber: string | null; stockNumberNormalized: string | null; year: number | null; make: string | null; model: string | null; color: string | null; licensePlate: string | null; licensePlateNormalized: string | null; licensePlateState: string | null;
};

export type RegistryCreationDetails = {
  rejectDuplicateIdentity?: boolean;
  vehicleId?: string;
  canonicalOrigins?: Record<string, unknown>;
  specificationSnapshot?: Record<string, unknown> | null;
  initialOdometer?: { reading: number; unit: "MILES" | "KILOMETERS"; observedAt: Date; sourceCode: string } | null;
};

const detailInclude = {
  registryRelationships: { orderBy: { effectiveFrom: "desc" as const }, include: { customer: { select: { id: true, customerNumber: true, displayName: true } } } },
  externalIdentities: { orderBy: [{ systemCode: "asc" as const }, { mappingVersion: "desc" as const }] },
  odometerObservations: { orderBy: { observedAt: "desc" as const }, take: 50 },
  custodyEvents: { orderBy: { occurredAt: "desc" as const }, take: 50, include: { location: { select: { id: true, code: true, name: true } } } },
  duplicateCasesAsPrimary: { orderBy: { createdAt: "desc" as const }, include: { candidateVehicle: { select: { id: true, vehicleNumber: true, vinRaw: true, stockNumber: true } } } },
  duplicateCasesAsCandidate: { orderBy: { createdAt: "desc" as const }, include: { primaryVehicle: { select: { id: true, vehicleNumber: true, vinRaw: true, stockNumber: true } } } }
};

export function createVehicleRegistryRepository(database: PrismaClient = prisma) {
  return {
    getCreateOptions(organizationId: string) {
      return database.location.findMany({
        where: { organizationId },
        orderBy: [{ name: "asc" }, { code: "asc" }],
        select: { id: true, code: true, name: true }
      });
    },
    async search(organizationId: string, input: { page: number; pageSize: number; query: string }) {
      const query = input.query.trim();
      const where: Prisma.VehicleWhereInput = { organizationId, mergedIntoVehicleId: null };
      if (query) where.AND = query.split(/\s+/).filter(Boolean).map((token) => ({ OR: [
        { vehicleNumber: { contains: token, mode: "insensitive" } }, { vin: { contains: token.toUpperCase() } }, { vinRaw: { contains: token, mode: "insensitive" } },
        { inventoryUnits: { some: { inventoryNumber: { contains: token, mode: "insensitive" }, closedAt: null } } },
        { stockNumber: { contains: token, mode: "insensitive" } }, { licensePlate: { contains: token.toUpperCase() } }, { year: /^\d{4}$/.test(token) ? Number(token) : undefined }, { make: { contains: token, mode: "insensitive" } }, { model: { contains: token, mode: "insensitive" } },
        { externalIdentities: { some: { externalId: { contains: token, mode: "insensitive" } } } },
        { registryRelationships: { some: { customer: { displayName: { contains: token, mode: "insensitive" } }, effectiveTo: null } } }
      ] }));
      const [total, items] = await Promise.all([
        database.vehicle.count({ where }),
        database.vehicle.findMany({ where, orderBy: [{ updatedAt: "desc" }, { vehicleNumber: "asc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, select: { id: true, vehicleNumber: true, vin: true, vinRaw: true, vinState: true, stockNumber: true, year: true, make: true, model: true, color: true, licensePlate: true, status: true, version: true, updatedAt: true, _count: { select: { duplicateCasesAsCandidate: { where: { status: "OPEN" } }, duplicateCasesAsPrimary: { where: { status: "OPEN" } } } } } })
      ]);
      return { items, page: input.page, pageSize: input.pageSize, total, totalPages: Math.max(1, Math.ceil(total / input.pageSize)) };
    },
    getDetail(organizationId: string, id: string) { return database.vehicle.findFirst({ where: { id, organizationId }, include: detailInclude }); },
    findPotentialDuplicate(organizationId: string, identity: Pick<RegistryIdentity, "stockNumberNormalized" | "vin">, excludeId?: string) {
      const matches: Prisma.VehicleWhereInput[] = [];
      if (identity.vin) matches.push({ vin: identity.vin });
      if (identity.stockNumberNormalized) matches.push({ stockNumberNormalized: identity.stockNumberNormalized });
      if (!matches.length) return Promise.resolve(null);
      return database.vehicle.findFirst({ where: { organizationId, id: excludeId ? { not: excludeId } : undefined, OR: matches }, select: { id: true, vehicleNumber: true, vin: true, vinRaw: true, stockNumber: true } });
    },
    findByPlate(organizationId: string, plateState: string, licensePlateNormalized: string, licensePlateRaw: string) {
      return database.vehicle.findFirst({ where: { organizationId, mergedIntoVehicleId: null, OR: [{ licensePlateState: plateState, licensePlateNormalized }, { licensePlateState: null, licensePlate: { equals: licensePlateRaw, mode: "insensitive" } }] }, select: { id: true, vehicleNumber: true, vin: true, vinRaw: true, stockNumber: true, year: true, make: true, model: true, color: true, licensePlate: true, licensePlateState: true } });
    },
    createVehicle(command: EnterpriseCommandCommitInput, identity: RegistryIdentity, creation: RegistryCreationDetails = {}) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        for (const key of [identity.vin, identity.stockNumberNormalized].filter(Boolean).sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${command.organizationId + ":vehicle-identity:" + key}, 0))`;
        const matches: Prisma.VehicleWhereInput[] = [];
        if (identity.vin) matches.push({ vin: identity.vin });
        if (identity.stockNumberNormalized) matches.push({ stockNumberNormalized: identity.stockNumberNormalized });
        const potential = matches.length ? await tx.vehicle.findFirst({ where: { organizationId: command.organizationId, OR: matches }, select: { id: true, vin: true, stockNumberNormalized: true } }) : null;
        const duplicate = Boolean(potential);
        if (duplicate && creation.rejectDuplicateIdentity) throw new EnterpriseCommandConflictError("This vehicle already exists. Find and select its existing record.", "VERSION_CONFLICT");
        const vehicle = await tx.vehicle.create({ data: { id: command.subjectId, organizationId: command.organizationId, ...identity, vin: duplicate ? null : identity.vin, vinState: duplicate ? "LEGACY_UNVERIFIED" : identity.vinState, stockNumberNormalized: duplicate ? null : identity.stockNumberNormalized, duplicateKey: duplicate ? identity.vin ? `VIN:${identity.vin}` : `STOCK:${identity.stockNumberNormalized}` : null, canonicalOrigins: json(creation.canonicalOrigins ?? {}), specificationSnapshot: creation.specificationSnapshot ? json(creation.specificationSnapshot) : undefined, version } });
        if (creation.initialOdometer) await tx.vehicleOdometerObservation.create({ data: { organizationId: command.organizationId, vehicleId: vehicle.id, reading: creation.initialOdometer.reading, unit: creation.initialOdometer.unit, observedAt: creation.initialOdometer.observedAt, sourceCode: creation.initialOdometer.sourceCode, status: "ACCEPTED", recordedByUserId: command.actorUserId } });
        let duplicateCase = null;
        if (potential) duplicateCase = await tx.vehicleDuplicateCase.create({ data: { organizationId: command.organizationId, primaryVehicleId: potential.id, candidateVehicleId: vehicle.id, confidence: potential.vin === identity.vin ? 100 : 90, matchReasons: identity.vin && potential.vin === identity.vin ? ["EXACT_NORMALIZED_VIN"] : ["EXACT_NORMALIZED_STOCK"] } });
        return { result: { duplicateReviewId: duplicateCase?.id ?? null, id: vehicle.id, version, vehicleNumber: vehicle.vehicleNumber } };
      });
    },
    correctIdentity(command: EnterpriseCommandCommitInput, identity: RegistryIdentity) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        const previous = await tx.vehicle.findFirstOrThrow({ where: { id: command.subjectId, organizationId: command.organizationId } });
        const matches: Prisma.VehicleWhereInput[] = [];
        if (identity.vin) matches.push({ vin: identity.vin });
        if (identity.stockNumberNormalized) matches.push({ stockNumberNormalized: identity.stockNumberNormalized });
        const potential = matches.length ? await tx.vehicle.findFirst({ where: { organizationId: command.organizationId, id: { not: command.subjectId }, OR: matches }, select: { id: true, vin: true } }) : null;
        if (potential) {
          const duplicateCase = await tx.vehicleDuplicateCase.upsert({ where: { organizationId_primaryVehicleId_candidateVehicleId: { organizationId: command.organizationId, primaryVehicleId: potential.id, candidateVehicleId: command.subjectId } }, create: { organizationId: command.organizationId, primaryVehicleId: potential.id, candidateVehicleId: command.subjectId, confidence: potential.vin === identity.vin ? 100 : 90, matchReasons: potential.vin === identity.vin ? ["EXACT_NORMALIZED_VIN"] : ["EXACT_NORMALIZED_STOCK"] }, update: { status: "OPEN", matchReasons: potential.vin === identity.vin ? ["EXACT_NORMALIZED_VIN"] : ["EXACT_NORMALIZED_STOCK"], confidence: potential.vin === identity.vin ? 100 : 90, resolutionReason: null, resolvedAt: null, resolvedByUserId: null } });
          await tx.vehicle.update({ where: { id: command.subjectId }, data: { version, duplicateKey: identity.vin ? `VIN:${identity.vin}` : `STOCK:${identity.stockNumberNormalized}` } });
          return { previous, result: { duplicateReviewId: duplicateCase.id, id: command.subjectId, identityChanged: false, version } };
        }
        const vehicle = await tx.vehicle.update({ where: { id: command.subjectId }, data: { ...identity, duplicateKey: null, version } });
        return { previous, result: { id: vehicle.id, identityChanged: true, version } };
      });
    },
    correctColor(command: EnterpriseCommandCommitInput, color: string) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        const previous = await tx.vehicle.findFirstOrThrow({ where: { id: command.subjectId, organizationId: command.organizationId }, select: { color: true, id: true } });
        const vehicle = await tx.vehicle.update({ where: { id: command.subjectId }, data: { color, version } });
        return { previous, result: { color: vehicle.color, id: vehicle.id, version } };
      });
    },
    addRelationship(command: EnterpriseCommandCommitInput, data: Prisma.VehicleRelationshipUncheckedCreateInput) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        const relationship = await tx.vehicleRelationship.create({ data });
        if (data.customerId) await tx.customerVehicle.upsert({
          where: { customerId_vehicleId_relationshipType_effectiveFrom: { customerId: data.customerId, vehicleId: data.vehicleId, relationshipType: data.relationshipType, effectiveFrom: data.effectiveFrom } },
          create: { customerId: data.customerId, vehicleId: data.vehicleId, relationshipType: data.relationshipType, effectiveFrom: data.effectiveFrom, effectiveTo: data.effectiveTo },
          update: { effectiveTo: data.effectiveTo }
        });
        await tx.vehicle.update({ where: { id: command.subjectId }, data: { version } });
        return { result: { id: relationship.id, relationshipType: relationship.relationshipType, version } };
      });
    },
    addExternalIdentity(command: EnterpriseCommandCommitInput, data: Prisma.VehicleExternalIdentityUncheckedCreateInput) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        const existing = await tx.vehicleExternalIdentity.findUnique({ where: { organizationId_systemCode_externalId: { organizationId: data.organizationId, systemCode: data.systemCode, externalId: data.externalId } } });
        if (existing && existing.vehicleId !== command.subjectId) {
          const conflicted = await tx.vehicleExternalIdentity.update({ where: { id: existing.id }, data: { conflictStatus: "CONFLICT", conflictDetail: `Also claimed by vehicle ${command.subjectId}.` } });
          await tx.vehicle.update({ where: { id: command.subjectId }, data: { version } });
          return { result: { conflictStatus: conflicted.conflictStatus, existingVehicleId: existing.vehicleId, id: conflicted.id, version } };
        }
        const externalIdentity = existing
          ? await tx.vehicleExternalIdentity.update({ where: { id: existing.id }, data: { authority: data.authority, conflictDetail: null, conflictStatus: "CLEAR", lastSyncedAt: data.lastSyncedAt, mappingVersion: data.mappingVersion } })
          : await tx.vehicleExternalIdentity.create({ data });
        await tx.vehicle.update({ where: { id: command.subjectId }, data: { version } });
        return { result: { id: externalIdentity.id, systemCode: externalIdentity.systemCode, version } };
      });
    },
    async latestOdometer(organizationId: string, vehicleId: string) { return database.vehicleOdometerObservation.findFirst({ where: { organizationId, vehicleId }, orderBy: { observedAt: "desc" }, select: { id: true, reading: true, observedAt: true } }); },
    addOdometer(command: EnterpriseCommandCommitInput, data: Prisma.VehicleOdometerObservationUncheckedCreateInput) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        if (data.correctionOfId) {
          const corrected = await tx.vehicleOdometerObservation.findFirst({ where: { id: data.correctionOfId, organizationId: command.organizationId, vehicleId: command.subjectId }, select: { id: true } });
          if (!corrected) throw new Error("Corrected odometer observation was not found for this vehicle.");
        }
        const observation = await tx.vehicleOdometerObservation.create({ data });
        await tx.vehicle.update({ where: { id: command.subjectId }, data: { version } });
        return { result: { exceptionReason: observation.exceptionReason, id: observation.id, status: observation.status, version } };
      });
    },
    addCustody(command: EnterpriseCommandCommitInput, data: Prisma.VehicleCustodyEventUncheckedCreateInput) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        const custody = await tx.vehicleCustodyEvent.create({ data });
        await tx.vehicle.update({ where: { id: command.subjectId }, data: { version } });
        return { result: { eventType: custody.eventType, id: custody.id, locationId: custody.locationId, version } };
      });
    },
    resolveDuplicate(command: EnterpriseCommandCommitInput, input: { caseId: string; resolution: "CONFIRMED_DISTINCT" | "MERGED" | "DISMISSED"; resolvedByUserId: string; reason: string }) {
      return executeRegistryMutation(database, command, async (tx, version) => {
        const duplicateCase = await tx.vehicleDuplicateCase.findFirstOrThrow({ where: { id: input.caseId, organizationId: command.organizationId, status: "OPEN", OR: [{ primaryVehicleId: command.subjectId }, { candidateVehicleId: command.subjectId }] } });
        if (input.resolution === "MERGED") await tx.vehicle.update({ where: { id: duplicateCase.candidateVehicleId }, data: { mergedIntoVehicleId: duplicateCase.primaryVehicleId, status: "INACTIVE", version } });
        const updated = await tx.vehicleDuplicateCase.update({ where: { id: duplicateCase.id }, data: { status: input.resolution, resolutionReason: input.reason, resolvedAt: new Date(), resolvedByUserId: input.resolvedByUserId } });
        if (input.resolution !== "MERGED") await tx.vehicle.update({ where: { id: command.subjectId }, data: { duplicateKey: null, version } });
        else if (command.subjectId !== duplicateCase.candidateVehicleId) await tx.vehicle.update({ where: { id: command.subjectId }, data: { version } });
        return { previous: duplicateCase, result: { canonicalVehicleId: duplicateCase.primaryVehicleId, caseId: updated.id, resolution: updated.status, version } };
      });
    }
  };
}

export type VehicleRegistryRepository = ReturnType<typeof createVehicleRegistryRepository>;
