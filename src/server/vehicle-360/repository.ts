import { Prisma, type PrismaClient } from "@prisma/client";
import { EnterpriseCommandConflictError, type EnterpriseCommandInput } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { prisma } from "@/server/db/client";
import { SALES_PHOTO_LIMIT, SALES_VIDEO_LIMIT, sortVehicleTimeline, type Vehicle360TimelineItem } from "./domain";
import { orderSalesMedia, validateSalesMediaOrder } from "./sales-media-domain";
import { inferVehiclePhotoAngle } from "@/lib/vehicle-photo-coverage";

const evidenceMetadataSelect = {
  id: true, fileName: true, contentType: true, byteSize: true, checksumSha256: true, storageProvider: true,
  malwareStatus: true, malwareScanner: true, malwareScannedAt: true, accessLevel: true, retentionUntil: true,
  legalHold: true, status: true, version: true, deletedAt: true, createdAt: true, updatedAt: true,
  uploadedByUser: { select: { id: true, name: true } }
} satisfies Prisma.VehicleEvidenceObjectSelect;

function json(value: unknown) { return value as Prisma.InputJsonValue; }

async function readIntakePhotos(tx: Prisma.TransactionClient, organizationId: string, vehicleId: string) {
  const links = await tx.vehicleEvidenceLink.findMany({ where: { organizationId, vehicleId, category: "PHOTO", subjectType: { in: ["VEHICLE", "INTAKE_PHOTO"] }, subjectId: vehicleId, relationship: "SUPPORTS", evidenceObject: { organizationId, accessLevel: "INTERNAL", status: { not: "DELETED" }, contentType: { in: ["image/jpeg", "image/png", "image/webp"] } } }, orderBy: { createdAt: "asc" }, include: { evidenceObject: { select: evidenceMetadataSelect } } });
  return [...new Map(links.map(link => [link.evidenceObjectId, link])).values()].map(link => {
    const evidence = link.evidenceObject;
    const safe = evidence.accessLevel === "INTERNAL" && evidence.status === "AVAILABLE" && evidence.malwareStatus === "CLEAN";
    return { id: link.evidenceObjectId, name: evidence.fileName, contentType: evidence.contentType, bytes: evidence.byteSize, status: evidence.status, href: safe ? `/api/vehicle-evidence/${link.evidenceObjectId}/content` : null, reusable: safe && !evidence.legalHold && inferVehiclePhotoAngle(evidence.fileName) !== "damage_closeup" };
  });
}

async function lockSalesVehicle(tx: Prisma.TransactionClient, organizationId: string, vehicleId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM "Vehicle" WHERE id = ${vehicleId} AND "organizationId" = ${organizationId} AND "mergedIntoVehicleId" IS NULL FOR UPDATE`);
  if (!rows.length) throw new Error("Vehicle was not found.");
}

async function readSalesCollection(tx: Prisma.TransactionClient, organizationId: string, vehicleId: string) {
  const links = await tx.vehicleEvidenceLink.findMany({ where: { organizationId, vehicleId, subjectType: "SALES_MEDIA", subjectId: vehicleId, relationship: "SUPPORTS", evidenceObject: { status: { not: "DELETED" } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { evidenceObject: { select: evidenceMetadataSelect } } });
  const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: { organizationId_domain_subjectType_subjectId: { organizationId, domain: "VEHICLE_EVIDENCE", subjectType: "SALES_MEDIA", subjectId: vehicleId } } });
  const latest = aggregate ? await tx.enterpriseCommandLedger.findFirst({ where: { organizationId, domain: "VEHICLE_EVIDENCE", subjectType: "SALES_MEDIA", subjectId: vehicleId, resultingVersion: aggregate.version, status: "SUCCEEDED" }, select: { resultSnapshot: true } }) : null;
  const snapshot = latest?.resultSnapshot as { order?: unknown } | null;
  const items = links.map(link => ({ id: link.evidenceObjectId, name: link.evidenceObject.fileName, contentType: link.evidenceObject.contentType, bytes: link.evidenceObject.byteSize, status: link.evidenceObject.status, href: link.evidenceObject.status === "AVAILABLE" && link.evidenceObject.malwareStatus === "CLEAN" ? `/api/vehicle-evidence/${link.evidenceObjectId}/content` : null }));
  return { vehicleId, version: aggregate?.version ?? 0, items: orderSalesMedia(items, snapshot?.order), links };
}

async function currentAggregateVersion(tx: Prisma.TransactionClient, command: EnterpriseCommandInput) {
  const key = { organizationId_domain_subjectType_subjectId: { organizationId: command.organizationId, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId } };
  const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key });
  const current = aggregate?.version ?? 0;
  if (current !== command.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${command.expectedVersion}, but current version is ${current}.`, "VERSION_CONFLICT");
  const version = current + 1;
  if (aggregate) await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version, locationId: command.locationId } });
  else await tx.enterpriseAggregateVersion.create({ data: { organizationId: command.organizationId, locationId: command.locationId, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId, version } });
  return version;
}

async function recordEnterpriseEvidence(tx: Prisma.TransactionClient, command: EnterpriseCommandCommitInput, version: number, result: Record<string, unknown>) {
  const ledger = await tx.enterpriseCommandLedger.create({ data: { organizationId: command.organizationId, locationId: command.locationId, actorUserId: command.actorUserId, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId, commandType: command.commandType, status: "SUCCEEDED", idempotencyKey: command.idempotencyKey, requestHash: command.requestHash, correlationId: command.correlationId, expectedVersion: command.expectedVersion, resultingVersion: version, resultSnapshot: json(result), completedAt: new Date() } });
  const eventType = `${command.commandType}_COMPLETED`;
  const event = await tx.enterpriseDomainEvent.create({ data: { organizationId: command.organizationId, locationId: command.locationId, commandId: ledger.id, domain: command.domain, aggregateType: command.subjectType, aggregateId: command.subjectId, aggregateVersion: version, eventType, payload: json({ ...command.payload, reason: command.reason }) } });
  await tx.enterpriseAuditEvent.create({ data: { organizationId: command.organizationId, locationId: command.locationId, actorUserId: command.actorUserId, commandId: ledger.id, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId, eventType, reason: command.reason, newValue: json(result), metadata: json({ requestHash: command.requestHash }), correlationId: command.correlationId } });
  await tx.enterpriseOutboxMessage.create({ data: { organizationId: command.organizationId, locationId: command.locationId, domainEventId: event.id, topic: "vehicle-operations.vehicle_evidence", messageKey: command.subjectId, payload: json({ aggregateId: command.subjectId, aggregateVersion: version, correlationId: command.correlationId, eventId: event.id, eventType }) } });
}

export type EvidenceCreateData = {
  accessLevel: "INTERNAL" | "RESTRICTED"; actorUserId: string; byteSize: number; category: "PHOTO" | "INSPECTION" | "REPAIR" | "TITLE" | "WARRANTY" | "CUSTOMER_APPROVAL" | "DELIVERY" | "OTHER";
  checksumSha256: string; content: Buffer; contentType: string; fileName: string; malwareScanner: string; malwareStatus: "CLEAN" | "DETECTED"; reasonCode: string; relationship: string; retentionUntil: Date; subjectId: string; subjectType: string; vehicleId: string;
};

export function createVehicle360Repository(database: PrismaClient = prisma) {
  return {
    async createEvidence(command: EnterpriseCommandCommitInput, data: EvidenceCreateData) {
      return database.$transaction(async (tx) => {
        const prior = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: command.organizationId, domain: command.domain, commandType: command.commandType, idempotencyKey: command.idempotencyKey } } });
        if (prior) {
          if (prior.requestHash !== command.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          const evidence = await tx.vehicleEvidenceObject.findUniqueOrThrow({ where: { id: command.subjectId }, select: evidenceMetadataSelect });
          return { duplicate: true, evidence };
        }
        const vehicle = await tx.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: command.organizationId, mergedIntoVehicleId: null }, select: { id: true } });
        if (!vehicle) throw new Error("Vehicle was not found.");
        if (data.subjectType === "SALES_MEDIA") {
          await lockSalesVehicle(tx, command.organizationId, data.vehicleId);
          const collection = await readSalesCollection(tx, command.organizationId, data.vehicleId);
          const video = data.contentType === "video/mp4";
          if (collection.items.filter(item => (item.contentType === "video/mp4") === video).length >= (video ? SALES_VIDEO_LIMIT : SALES_PHOTO_LIMIT)) throw new Error(video ? "A vehicle can have at most 5 sales videos." : "A vehicle can have at most 40 sales photos.");
        }
        const version = await currentAggregateVersion(tx, command);
        const quarantined = data.malwareStatus !== "CLEAN";
        const evidence = await tx.vehicleEvidenceObject.create({ data: { id: command.subjectId, organizationId: command.organizationId, uploadedByUserId: data.actorUserId, fileName: data.fileName, contentType: data.contentType, byteSize: data.byteSize, checksumSha256: data.checksumSha256, storageKey: command.subjectId, content: Uint8Array.from(data.content), malwareStatus: data.malwareStatus, malwareScanner: data.malwareScanner, malwareScannedAt: new Date(), accessLevel: data.accessLevel, retentionUntil: data.retentionUntil, status: quarantined ? "QUARANTINED" : "AVAILABLE", version }, select: evidenceMetadataSelect });
        await tx.vehicleEvidenceLink.create({ data: { organizationId: command.organizationId, evidenceObjectId: command.subjectId, vehicleId: data.vehicleId, category: data.category, subjectType: data.subjectType, subjectId: data.subjectId, relationship: data.relationship, createdByUserId: data.actorUserId } });
        await tx.vehicleEvidenceEvent.createMany({ data: [
          { organizationId: command.organizationId, evidenceObjectId: command.subjectId, actorUserId: data.actorUserId, eventType: "UPLOADED", reason: command.reason, metadata: json({ checksumSha256: data.checksumSha256, contentType: data.contentType, reasonCode: data.reasonCode }) },
          ...(quarantined ? [{ organizationId: command.organizationId, evidenceObjectId: command.subjectId, actorUserId: data.actorUserId, eventType: "QUARANTINED" as const, reason: "Automated safety scan quarantined the evidence object.", metadata: json({ reasonCode: data.reasonCode }) }] : [])
        ] });
        await recordEnterpriseEvidence(tx, command, version, { evidenceId: evidence.id, malwareStatus: evidence.malwareStatus, status: evidence.status, vehicleId: data.vehicleId, version });
        return { duplicate: false, evidence };
      });
    },

    async updateEvidence(command: EnterpriseCommandCommitInput, data: { accessLevel: "INTERNAL" | "RESTRICTED" | null; actorUserId: string; legalHold: boolean | null; retentionUntil: Date | null }) {
      return database.$transaction(async (tx) => {
        const priorCommand = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: command.organizationId, domain: command.domain, commandType: command.commandType, idempotencyKey: command.idempotencyKey } } });
        if (priorCommand) {
          if (priorCommand.requestHash !== command.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          return { duplicate: true, evidence: await tx.vehicleEvidenceObject.findUniqueOrThrow({ where: { id: command.subjectId }, select: evidenceMetadataSelect }) };
        }
        const current = await tx.vehicleEvidenceObject.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, status: { not: "DELETED" } } });
        if (!current) throw new Error("Evidence object was not found.");
        if (data.accessLevel === "RESTRICTED" && await tx.vehicleEvidenceLink.count({ where: { evidenceObjectId: current.id, subjectType: "SALES_MEDIA", relationship: "SUPPORTS" } })) throw new Error("Remove this item from sales media before restricting its evidence access.");
        if (current.version !== command.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${command.expectedVersion}, but current version is ${current.version}.`, "VERSION_CONFLICT");
        const version = await currentAggregateVersion(tx, command);
        const evidence = await tx.vehicleEvidenceObject.update({ where: { id: current.id }, data: { ...(data.accessLevel ? { accessLevel: data.accessLevel } : {}), ...(data.legalHold == null ? {} : { legalHold: data.legalHold }), ...(data.retentionUntil ? { retentionUntil: data.retentionUntil } : {}), version }, select: evidenceMetadataSelect });
        await tx.vehicleEvidenceEvent.create({ data: { organizationId: command.organizationId, evidenceObjectId: current.id, actorUserId: data.actorUserId, eventType: "RETENTION_CHANGED", reason: command.reason, metadata: json({ accessLevel: evidence.accessLevel, legalHold: evidence.legalHold, retentionUntil: evidence.retentionUntil.toISOString(), version }) } });
        await recordEnterpriseEvidence(tx, command, version, { accessLevel: evidence.accessLevel, evidenceId: evidence.id, legalHold: evidence.legalHold, retentionUntil: evidence.retentionUntil.toISOString(), version });
        return { duplicate: false, evidence };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    async deleteEvidence(command: EnterpriseCommandCommitInput, actorUserId: string, now: Date) {
      return database.$transaction(async (tx) => {
        const priorCommand = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: command.organizationId, domain: command.domain, commandType: command.commandType, idempotencyKey: command.idempotencyKey } } });
        if (priorCommand) {
          if (priorCommand.requestHash !== command.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          return { duplicate: true };
        }
        const current = await tx.vehicleEvidenceObject.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!current || current.status === "DELETED") throw new Error("Evidence object was not found.");
        if (current.legalHold) throw new Error("Evidence under legal hold cannot be deleted.");
        if (current.retentionUntil > now) throw new Error("Evidence cannot be deleted before its retention date.");
        if (current.version !== command.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${command.expectedVersion}, but current version is ${current.version}.`, "VERSION_CONFLICT");
        const version = await currentAggregateVersion(tx, command);
        await tx.vehicleEvidenceObject.update({ where: { id: current.id }, data: { content: Buffer.alloc(0), deletedAt: now, status: "DELETED", version } });
        await tx.vehicleEvidenceEvent.create({ data: { organizationId: command.organizationId, evidenceObjectId: current.id, actorUserId, eventType: "DELETED", reason: command.reason, metadata: json({ checksumSha256: current.checksumSha256, deletedAt: now.toISOString(), version }) } });
        await recordEnterpriseEvidence(tx, command, version, { deletedAt: now.toISOString(), evidenceId: current.id, status: "DELETED", version });
        return { duplicate: false };
      });
    },

    async getEvidence(organizationId: string, evidenceId: string) {
      return database.vehicleEvidenceObject.findFirst({ where: { id: evidenceId, organizationId }, include: { links: true } });
    },

    async readSalesMedia(organizationId: string, vehicleId: string) {
      return database.$transaction(async tx => {
        await lockSalesVehicle(tx, organizationId, vehicleId);
        const collection = await readSalesCollection(tx, organizationId, vehicleId);
        return { vehicleId: collection.vehicleId, version: collection.version, items: collection.items, intakeItems: await readIntakePhotos(tx, organizationId, vehicleId) };
      });
    },

    async changeSalesMedia(command: EnterpriseCommandCommitInput, data: { order: unknown; removeIds: string[]; addIds?: string[] }) {
      return database.$transaction(async tx => {
        await lockSalesVehicle(tx, command.organizationId, command.subjectId);
        const prior = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: command.organizationId, domain: command.domain, commandType: command.commandType, idempotencyKey: command.idempotencyKey } } });
        if (prior) {
          if (prior.requestHash !== command.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
          return { duplicate: true };
        }
        const collection = await readSalesCollection(tx, command.organizationId, command.subjectId);
        const addIds = data.addIds ?? [];
        const intake = addIds.length ? await readIntakePhotos(tx, command.organizationId, command.subjectId) : [];
        if (addIds.some(id => !intake.some(item => item.id === id && item.reusable) || collection.items.some(item => item.id === id))) throw new Error("Select safe, internal intake photos that are not damage evidence or already in the gallery.");
        const additions = intake.filter(item => addIds.includes(item.id));
        if (collection.items.filter(item => item.contentType.startsWith("image/") && !data.removeIds.includes(item.id)).length + additions.length > SALES_PHOTO_LIMIT) throw new Error(`A vehicle can have at most ${SALES_PHOTO_LIMIT} sales photos.`);
        if (data.removeIds.some(id => !collection.items.some(item => item.id === id))) throw new Error("Media item was not found in this vehicle collection.");
        if (collection.links.some(link => data.removeIds.includes(link.evidenceObjectId) && link.evidenceObject.legalHold)) throw new Error("Media under legal hold cannot be removed.");
        const order = validateSalesMediaOrder([...collection.items.filter(item => !data.removeIds.includes(item.id)), ...additions], data.order);
        const firstPhoto = collection.items.find(item => item.id === order.find(id => collection.items.some(candidate => candidate.id === id && candidate.contentType.startsWith("image/"))));
        if (firstPhoto && !firstPhoto.href) throw new Error("The primary photo must pass the file safety scan.");
        const version = await currentAggregateVersion(tx, command);
        for (const item of additions) await tx.vehicleEvidenceLink.create({ data: { organizationId: command.organizationId, evidenceObjectId: item.id, vehicleId: command.subjectId, category: "PHOTO", subjectType: "SALES_MEDIA", subjectId: command.subjectId, relationship: "SUPPORTS", createdByUserId: command.actorUserId } });
        if (data.removeIds.length) await tx.vehicleEvidenceLink.updateMany({ where: { organizationId: command.organizationId, vehicleId: command.subjectId, subjectType: "SALES_MEDIA", relationship: "SUPPORTS", evidenceObjectId: { in: data.removeIds } }, data: { relationship: "ARCHIVED_SALES_MEDIA" } });
        await recordEnterpriseEvidence(tx, command, version, { order, removedIds: data.removeIds, reusedIntakeIds: addIds, vehicleId: command.subjectId, version });
        return { duplicate: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },

    async recordEvidenceAccess(organizationId: string, evidenceObjectId: string, actorUserId: string, reason: string) {
      await database.vehicleEvidenceEvent.create({ data: { organizationId, evidenceObjectId, actorUserId, eventType: "ACCESSED", reason, metadata: json({ delivery: "AUTHORIZED_DOWNLOAD" }) } });
    },

    async readVehicle360(organizationId: string, vehicleId: string) {
      const vehicle = await database.vehicle.findFirst({ where: { id: vehicleId, organizationId, mergedIntoVehicleId: null }, include: {
        registryRelationships: { orderBy: { effectiveFrom: "desc" }, include: { customer: { select: { id: true, customerNumber: true, displayName: true, status: true, ownerUserId: true } } } },
        externalIdentities: { orderBy: [{ systemCode: "asc" }, { externalId: "asc" }] },
        odometerObservations: { take: 20, orderBy: { observedAt: "desc" }, include: { recordedByUser: { select: { id: true, name: true } } } },
        custodyEvents: { take: 30, orderBy: { occurredAt: "desc" }, include: { location: { select: { id: true, name: true } }, recordedByUser: { select: { id: true, name: true } } } },
        duplicateCasesAsPrimary: { where: { status: "OPEN" }, select: { id: true, confidence: true, candidateVehicleId: true, matchReasons: true } },
        duplicateCasesAsCandidate: { where: { status: "OPEN" }, select: { id: true, confidence: true, primaryVehicleId: true, matchReasons: true } }
      } });
      if (!vehicle) return null;
      const [inventory, repairOrders, appointmentLinks, tasks, documents] = await Promise.all([
        database.inventoryUnit.findMany({ where: { organizationId, vehicleId }, orderBy: { createdAt: "desc" }, include: { ownerUser: { select: { id: true, name: true } }, location: { select: { id: true, name: true } }, stateEvents: { take: 50, orderBy: { occurredAt: "desc" } } } }),
        database.repairOrder.findMany({ where: { organizationId, vehicleId }, orderBy: { openedAt: "desc" }, include: { ownerUser: { select: { id: true, name: true } }, location: { select: { id: true, name: true } }, customer: { select: { id: true, customerNumber: true, displayName: true } }, stateEvents: { take: 50, orderBy: { occurredAt: "desc" } }, repairJobs: { include: { partDemands: { include: { part: { select: { id: true, partNumber: true, description: true } }, reservations: true } }, laborEvents: true, qualityInspections: true } }, estimateVersions: { orderBy: { version: "desc" } }, authorizations: { orderBy: { decidedAt: "desc" } }, inspectionVersions: { orderBy: { version: "desc" } }, qualityInspections: { orderBy: { inspectedAt: "desc" } }, invoicePackages: { orderBy: { version: "desc" } }, closureEvents: { orderBy: { occurredAt: "desc" } } } }),
        database.appointmentVehicle.findMany({ where: { vehicleId, appointment: { organizationId } }, orderBy: { appointment: { startsAt: "desc" } }, include: { appointment: { include: { location: { select: { id: true, name: true } }, ownerUser: { select: { id: true, name: true } }, historyEvents: { take: 50, orderBy: { occurredAt: "desc" } } } } } }),
        database.task.findMany({ where: { vehicleId }, take: 100, orderBy: { dueAt: "desc" }, include: { assignedUser: { select: { id: true, name: true } }, boardDay: { select: { date: true } } } }),
        database.vehicleEvidenceLink.findMany({ where: { organizationId, vehicleId }, orderBy: { createdAt: "desc" }, include: { evidenceObject: { select: evidenceMetadataSelect }, createdByUser: { select: { id: true, name: true } } } })
      ]);
      const repairOrderIds = repairOrders.map((item) => item.id), inventoryIds = inventory.map((item) => item.id), jobIds = repairOrders.flatMap((item) => item.repairJobs.map((job) => job.id)), evidenceIds = documents.map((item) => item.evidenceObjectId), customerIds = [...new Set(vehicle.registryRelationships.flatMap((item) => item.customerId ? [item.customerId] : []))];
      const [partCustody, communications, audit, warrantyCoverages, warrantyClaims, customerStatuses, commercialHandoffs, servicePromises, communicationPreferences, estimateApprovals] = await Promise.all([
        jobIds.length ? database.partCustodyEvent.findMany({ where: { organizationId, repairJobId: { in: jobIds } }, orderBy: { occurredAt: "desc" }, include: { part: { select: { id: true, partNumber: true, description: true } }, actorUser: { select: { id: true, name: true } } } }) : Promise.resolve([]),
        customerIds.length ? database.customerInteraction.findMany({ where: { organizationId, customerId: { in: customerIds } }, take: 100, orderBy: { occurredAt: "desc" }, include: { actorUser: { select: { id: true, name: true } } } }) : Promise.resolve([]),
        database.enterpriseAuditEvent.findMany({ where: { organizationId, OR: [{ subjectType: "VEHICLE", subjectId: vehicleId }, ...(inventoryIds.length ? [{ subjectType: "INVENTORY_UNIT", subjectId: { in: inventoryIds } }] : []), ...(repairOrderIds.length ? [{ subjectType: "REPAIR_ORDER", subjectId: { in: repairOrderIds } }] : []), ...(evidenceIds.length ? [{ subjectType: "VEHICLE_EVIDENCE", subjectId: { in: evidenceIds } }] : [])] }, take: 200, orderBy: { occurredAt: "desc" }, include: { actorUser: { select: { id: true, name: true } } } }),
        database.vehicleWarrantyCoverage.findMany({ where: { organizationId, vehicleId }, orderBy: { createdAt: "desc" } }),
        database.vehicleWarrantyClaim.findMany({ where: { organizationId, vehicleId }, orderBy: { updatedAt: "desc" } }),
        repairOrderIds.length ? database.customerServiceStatusEvent.findMany({ where: { organizationId, repairOrderId: { in: repairOrderIds } }, orderBy: { publishedAt: "desc" } }) : Promise.resolve([]),
        database.vehicleCommercialHandoff.findMany({ where: { organizationId, vehicleId }, orderBy: { updatedAt: "desc" } }),
        repairOrderIds.length ? database.customerServicePromise.findMany({ where: { organizationId, repairOrderId: { in: repairOrderIds } }, orderBy: { effectiveAt: "desc" } }) : Promise.resolve([]),
        customerIds.length ? database.customerCommunicationPreference.findMany({ where: { organizationId, customerId: { in: customerIds } }, orderBy: { effectiveFrom: "desc" } }) : Promise.resolve([]),
        repairOrderIds.length ? database.customerEstimateApprovalRequest.findMany({ where: { organizationId, repairOrderId: { in: repairOrderIds } }, orderBy: { createdAt: "desc" }, select: { id: true, repairOrderId: true, customerId: true, estimateVersionId: true, estimateVersionNumber: true, channel: true, destinationMasked: true, status: true, deliveredAt: true, viewedAt: true, decidedAt: true, expiresAt: true } }) : Promise.resolve([])
      ]);

      const timeline: Vehicle360TimelineItem[] = [];
      for (const item of vehicle.custodyEvents) timeline.push({ id: `custody:${item.id}`, occurredAt: item.occurredAt, source: "CUSTODY", type: item.eventType, title: `Vehicle ${item.eventType.toLowerCase().replaceAll("_", " ")}`, detail: item.positionLabel ?? item.location?.name ?? null, subjectType: "VEHICLE", subjectId: vehicle.id, actorName: item.recordedByUser.name });
      for (const unit of inventory) for (const item of unit.stateEvents) timeline.push({ id: `inventory:${item.id}`, occurredAt: item.occurredAt, source: "INVENTORY", type: item.toOperatingState, title: `Inventory ${item.toStage.toLowerCase().replaceAll("_", " ")}`, detail: item.reason, subjectType: "INVENTORY_UNIT", subjectId: unit.id });
      for (const order of repairOrders) for (const item of order.stateEvents) timeline.push({ id: `repair:${item.id}`, occurredAt: item.occurredAt, source: "SERVICE", type: item.toOperatingState, title: `${order.repairOrderNumber} moved to ${item.toStage.toLowerCase().replaceAll("_", " ")}`, detail: item.reason, subjectType: "REPAIR_ORDER", subjectId: order.id });
      for (const link of appointmentLinks) for (const item of link.appointment.historyEvents) timeline.push({ id: `appointment:${item.id}`, occurredAt: item.occurredAt, source: "APPOINTMENT", type: item.eventType, title: link.appointment.title, detail: item.message, subjectType: "APPOINTMENT", subjectId: link.appointment.id });
      for (const item of documents) timeline.push({ id: `evidence:${item.id}`, occurredAt: item.createdAt, source: "EVIDENCE", type: item.category, title: item.evidenceObject.fileName, detail: `${item.relationship} · ${item.evidenceObject.status}`, subjectType: "VEHICLE_EVIDENCE", subjectId: item.evidenceObjectId, actorName: item.createdByUser.name });
      for (const item of audit) timeline.push({ id: `audit:${item.id}`, occurredAt: item.occurredAt, source: "AUDIT", type: item.eventType, title: item.eventType.toLowerCase().replaceAll("_", " "), detail: item.reason, subjectType: item.subjectType, subjectId: item.subjectId, actorName: item.actorUser?.name ?? null });

      const activeInventory = inventory.find((item) => item.closedAt == null), activeOrder = repairOrders.find((item) => item.closedAt == null), currentCustody = vehicle.custodyEvents[0];
      const risks = [
        ...(vehicle.duplicateCasesAsPrimary.length + vehicle.duplicateCasesAsCandidate.length ? ["DUPLICATE_REVIEW_OPEN"] : []),
        ...(activeInventory?.operatingState === "BLOCKED" ? ["INVENTORY_BLOCKED"] : []),
        ...(activeOrder?.operatingState === "BLOCKED" ? ["REPAIR_ORDER_BLOCKED"] : []),
        ...(documents.some((item) => item.evidenceObject.status === "QUARANTINED") ? ["EVIDENCE_QUARANTINED"] : []),
        ...(activeOrder && activeOrder.targetAt < new Date() ? ["SERVICE_TARGET_OVERDUE"] : []),
        ...(activeInventory && activeInventory.targetAt < new Date() ? ["INVENTORY_TARGET_OVERDUE"] : [])
      ];
      const graph = buildRelationshipGraph({ vehicle, inventory, repairOrders, appointmentLinks, tasks, documents });
      return {
        summary: { vehicle: { id: vehicle.id, vehicleNumber: vehicle.vehicleNumber, vin: vehicle.vin, vinState: vehicle.vinState, stockNumber: vehicle.stockNumber, year: vehicle.year, make: vehicle.make, model: vehicle.model, color: vehicle.color, licensePlate: vehicle.licensePlate, licensePlateState: vehicle.licensePlateState, status: vehicle.status, version: vehicle.version }, owner: activeOrder?.ownerUser ?? activeInventory?.ownerUser ?? vehicle.registryRelationships.find((item) => item.effectiveTo == null)?.customer ?? null, location: currentCustody?.location ?? (currentCustody?.positionLabel ? { id: "", name: currentCustody.positionLabel } : null) ?? activeOrder?.location ?? activeInventory?.location ?? null, stage: activeOrder?.stage ?? activeInventory?.lifecycleStage ?? "REGISTRY", operatingState: activeOrder?.operatingState ?? activeInventory?.operatingState ?? vehicle.status, nextAction: activeOrder?.nextAction ?? activeInventory?.nextAction ?? null, targetAt: activeOrder?.targetAt ?? activeInventory?.targetAt ?? null, latestOdometer: vehicle.odometerObservations[0] ?? null, risks },
        timeline: sortVehicleTimeline(timeline),
        graph,
        data: { vehicle, inventory, repairOrders, appointmentLinks, tasks, documents, partCustody, communications, audit, warrantyCoverages, warrantyClaims, customerStatuses, commercialHandoffs, servicePromises, communicationPreferences, estimateApprovals }
      };
    }
  };
}

type GraphInput = {
  vehicle: { id: string; year: number | null; make: string | null; model: string | null; vehicleNumber: string; status: string; registryRelationships: Array<{ relationshipType: string; customer: { id: string; displayName: string; status: string } | null }>; externalIdentities: Array<{ id: string; systemCode: string; externalId: string; authority: string; conflictStatus: string }> };
  inventory: Array<{ id: string; inventoryNumber: string; operatingState: string; lifecycleStage: string }>;
  repairOrders: Array<{ id: string; repairOrderNumber: string; stage: string; repairJobs: Array<{ id: string; jobNumber: string; description: string; status: string; workTypeCode: string; partDemands: Array<{ status: string; quantityReserved: number; quantityRequired: number; part: { id: string; partNumber: string; description: string } }> }> }>;
  appointmentLinks: Array<{ roleCode: string; appointment: { id: string; title: string; bookingStatus: string } }>;
  tasks: Array<{ id: string; title: string; status: string; workflowArea: string }>;
  documents: Array<{ category: string; evidenceObjectId: string; evidenceObject: { fileName: string; status: string } }>;
};

function buildRelationshipGraph(input: GraphInput) {
  const nodes: Array<{ id: string; type: string; label: string; href: string | null; status: string | null }> = [{ id: input.vehicle.id, type: "VEHICLE", label: [input.vehicle.year, input.vehicle.make, input.vehicle.model].filter(Boolean).join(" ") || input.vehicle.vehicleNumber, href: `/vehicles/360/${input.vehicle.id}`, status: input.vehicle.status }];
  const edges: Array<{ id: string; from: string; to: string; type: string; label: string }> = [];
  const add = (node: typeof nodes[number], from: string, type: string, label: string) => { if (!nodes.some((item) => item.id === node.id)) nodes.push(node); edges.push({ id: `${from}:${node.id}:${type}`, from, to: node.id, type, label }); };
  for (const relation of input.vehicle.registryRelationships) if (relation.customer) add({ id: relation.customer.id, type: "CUSTOMER", label: relation.customer.displayName, href: `/crm-next/customers/${encodeURIComponent(relation.customer.id)}`, status: relation.customer.status }, input.vehicle.id, relation.relationshipType, relation.relationshipType.replaceAll("_", " "));
  for (const item of input.inventory) add({ id: item.id, type: "INVENTORY_UNIT", label: item.inventoryNumber, href: "/vehicles/inventory", status: item.operatingState }, input.vehicle.id, "INVENTORY", item.lifecycleStage.replaceAll("_", " "));
  for (const order of input.repairOrders) {
    add({ id: order.id, type: "REPAIR_ORDER", label: order.repairOrderNumber, href: "/vehicles/repair-orders", status: order.stage }, input.vehicle.id, "SERVICE", order.stage.replaceAll("_", " "));
    for (const job of order.repairJobs) {
      add({ id: job.id, type: "REPAIR_JOB", label: `${job.jobNumber} · ${job.description}`, href: "/vehicles/shop-dispatch", status: job.status }, order.id, "JOB", job.workTypeCode);
      for (const demand of job.partDemands) add({ id: demand.part.id, type: "PART", label: `${demand.part.partNumber} · ${demand.part.description}`, href: "/vehicles/parts-counter", status: demand.status }, job.id, "PART_DEMAND", `${demand.quantityReserved}/${demand.quantityRequired} reserved`);
    }
  }
  for (const link of input.appointmentLinks) add({ id: link.appointment.id, type: "APPOINTMENT", label: link.appointment.title, href: `/appointments?appointmentId=${link.appointment.id}`, status: link.appointment.bookingStatus }, input.vehicle.id, "APPOINTMENT", link.roleCode);
  for (const task of input.tasks) add({ id: task.id, type: "TASK", label: task.title, href: `/tasks/${task.id}`, status: task.status }, input.vehicle.id, "TASK", task.workflowArea);
  for (const link of input.documents) add({ id: link.evidenceObjectId, type: "DOCUMENT", label: link.evidenceObject.fileName, href: `/api/vehicle-evidence/${link.evidenceObjectId}/content`, status: link.evidenceObject.status }, input.vehicle.id, "EVIDENCE", link.category);
  for (const identity of input.vehicle.externalIdentities) add({ id: `external:${identity.id}`, type: "EXTERNAL_IDENTITY", label: `${identity.systemCode}: ${identity.externalId}`, href: null, status: identity.conflictStatus }, input.vehicle.id, "EXTERNAL_IDENTITY", identity.authority);
  return { nodes, edges };
}

export type Vehicle360Repository = ReturnType<typeof createVehicle360Repository>;
