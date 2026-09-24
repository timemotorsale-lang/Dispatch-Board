import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { rankOperationalSearchResults, scoreOperationalSearchResult, type OperationalSearchResult, type OperationalSearchType } from "./domain";

function json(value: unknown) { return value as Prisma.InputJsonValue; }

async function executeMutation<T extends Record<string, unknown>>(database: PrismaClient, command: EnterpriseCommandCommitInput, topic: string, mutate: (tx: Prisma.TransactionClient, version: number) => Promise<T>) {
  return database.$transaction(async (tx) => {
    const prior = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId: command.organizationId, domain: command.domain, commandType: command.commandType, idempotencyKey: command.idempotencyKey } } });
    if (prior) { if (prior.requestHash !== command.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED"); return { duplicate: true, result: prior.resultSnapshot as T, version: prior.resultingVersion ?? command.expectedVersion }; }
    const key = { organizationId_domain_subjectType_subjectId: { organizationId: command.organizationId, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId } }, aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key }), current = aggregate?.version ?? 0;
    if (current !== command.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${command.expectedVersion}, but current version is ${current}.`, "VERSION_CONFLICT");
    const version = current + 1; if (aggregate) await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version } }); else await tx.enterpriseAggregateVersion.create({ data: { organizationId: command.organizationId, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId, version } });
    const result = await mutate(tx, version), snapshot = { ...result, version };
    const ledger = await tx.enterpriseCommandLedger.create({ data: { organizationId: command.organizationId, actorUserId: command.actorUserId, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId, commandType: command.commandType, status: "SUCCEEDED", idempotencyKey: command.idempotencyKey, requestHash: command.requestHash, correlationId: command.correlationId, expectedVersion: command.expectedVersion, resultingVersion: version, resultSnapshot: json(snapshot), completedAt: new Date() } }), eventType = `${command.commandType}_COMPLETED`;
    const event = await tx.enterpriseDomainEvent.create({ data: { organizationId: command.organizationId, commandId: ledger.id, domain: command.domain, aggregateType: command.subjectType, aggregateId: command.subjectId, aggregateVersion: version, eventType, payload: json({ ...command.payload, reason: command.reason }) } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId: command.organizationId, actorUserId: command.actorUserId, commandId: ledger.id, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId, eventType, reason: command.reason, newValue: json(snapshot), metadata: json({ requestHash: command.requestHash }), correlationId: command.correlationId } });
    await tx.enterpriseOutboxMessage.create({ data: { organizationId: command.organizationId, domainEventId: event.id, topic, messageKey: command.subjectId, payload: json({ eventId: event.id, eventType, aggregateId: command.subjectId, aggregateVersion: version, correlationId: command.correlationId }) } });
    return { duplicate: false, result: snapshot, version };
  });
}

function result(input: Omit<OperationalSearchResult, "matchedFields" | "score">, query: string, fields: Record<string, string | null | undefined>): OperationalSearchResult { const scored = scoreOperationalSearchResult(query, fields); return { ...input, ...scored }; }

export function createVehicleDiscoveryRepository(database: PrismaClient = prisma) {
  return {
    async search(organizationId: string, query: string, types: OperationalSearchType[], limit: number, restrictedDocuments: boolean, workScope: { actorUserId: string; canViewTeam: boolean } = { actorUserId: "", canViewTeam: false }) {
      const take = Math.min(20, limit), includes = (type: OperationalSearchType) => types.includes(type), contains = { contains: query, mode: "insensitive" as const };
      const [vehicles, customers, orders, jobs, appointments, parts, purchaseOrders, documents, workItems, claims] = await Promise.all([
        includes("VEHICLE") ? database.vehicle.findMany({ where: { organizationId, mergedIntoVehicleId: null, OR: [{ vehicleNumber: contains }, { vin: contains }, { vinRaw: contains }, { stockNumber: contains }, { licensePlate: contains }, { make: contains }, { model: contains }] }, take, orderBy: { updatedAt: "desc" } }) : Promise.resolve([]),
        includes("CUSTOMER") ? database.customer.findMany({ where: { organizationId, mergedIntoCustomerId: null, archivedAt: null, OR: [{ customerNumber: contains }, { displayName: contains }] }, take, orderBy: { updatedAt: "desc" }, select: { id: true, customerNumber: true, displayName: true, status: true } }) : Promise.resolve([]),
        includes("REPAIR_ORDER") ? database.repairOrder.findMany({ where: { organizationId, OR: [{ repairOrderNumber: contains }, { nextAction: contains }, { vehicle: { OR: [{ vin: contains }, { stockNumber: contains }, { vehicleNumber: contains }] } }] }, take, orderBy: { updatedAt: "desc" }, include: { vehicle: { select: { id: true, vehicleNumber: true, year: true, make: true, model: true } } } }) : Promise.resolve([]),
        includes("REPAIR_JOB") ? database.repairJob.findMany({ where: { organizationId, OR: [{ jobNumber: contains }, { workTypeCode: contains }, { description: contains }, { repairOrder: { repairOrderNumber: contains } }] }, take, orderBy: { updatedAt: "desc" }, include: { repairOrder: { select: { repairOrderNumber: true, vehicleId: true, vehicle: { select: { vehicleNumber: true } } } } } }) : Promise.resolve([]),
        includes("APPOINTMENT") ? database.appointment.findMany({ where: { organizationId, OR: [{ appointmentNumber: contains }, { title: contains }, { sourceReference: contains }] }, take, orderBy: { updatedAt: "desc" }, select: { id: true, appointmentNumber: true, title: true, bookingStatus: true, startsAt: true, location: { select: { name: true } } } }) : Promise.resolve([]),
        includes("PART") ? database.part.findMany({ where: { organizationId, OR: [{ partNumber: contains }, { manufacturerCode: contains }, { description: contains }, { barcodeAliases: { some: { code: contains } } }] }, take, orderBy: { updatedAt: "desc" }, select: { id: true, partNumber: true, manufacturerCode: true, description: true, status: true } }) : Promise.resolve([]),
        includes("PURCHASE_ORDER") ? database.partPurchaseOrder.findMany({ where: { organizationId, OR: [{ purchaseOrderNumber: contains }, { vendor: { OR: [{ code: contains }, { name: contains }] } }] }, take, orderBy: { updatedAt: "desc" }, include: { vendor: { select: { code: true, name: true } }, location: { select: { name: true } } } }) : Promise.resolve([]),
        includes("DOCUMENT") ? database.vehicleEvidenceLink.findMany({ where: { organizationId, evidenceObject: { status: { not: "DELETED" }, ...(restrictedDocuments ? {} : { accessLevel: "INTERNAL" }), OR: [{ fileName: contains }, { checksumSha256: contains }] } }, take, orderBy: { createdAt: "desc" }, include: { evidenceObject: { select: { id: true, fileName: true, contentType: true, status: true, accessLevel: true, checksumSha256: true } }, vehicle: { select: { id: true, vehicleNumber: true } } } }) : Promise.resolve([]),
        includes("WORK_ITEM") && workScope.actorUserId ? database.task.findMany({ where: { ...(workScope.canViewTeam ? {} : { assignedUserId: workScope.actorUserId }), OR: [{ id: contains }, { title: contains }, { description: contains }, { vehicleReference: contains }, { customerReference: contains }] }, take, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, status: true, workflowArea: true, dueAt: true, vehicleReference: true, customerReference: true, assignedUser: { select: { name: true } } } }) : Promise.resolve([]),
        includes("CLAIM") ? database.insuranceClaim.findMany({ where: { organizationId, OR: [{ id: contains }, { claimNumber: contains }, { customerName: contains }, { carrierName: contains }, { linkedRepairOrderId: contains }, { vehicleVin: contains }, { vehicleStockNumber: contains }, { vehiclePlate: contains }, { vehicleMake: contains }, { vehicleModel: contains }] }, take, orderBy: { lastActivityAt: "desc" }, select: { id: true, claimNumber: true, customerName: true, carrierName: true, stage: true, status: true, vehicleYear: true, vehicleMake: true, vehicleModel: true, vehicleVin: true, vehicleStockNumber: true, vehiclePlate: true, linkedRepairOrderId: true } }) : Promise.resolve([])
      ]);
      const results: OperationalSearchResult[] = [];
      for (const item of vehicles) results.push(result({ id: item.id, type: "VEHICLE", label: [item.year, item.make, item.model].filter(Boolean).join(" ") || item.vehicleNumber, detail: `${item.vehicleNumber} · VIN ${item.vin ?? item.vinState} · Stock ${item.stockNumber ?? "—"}`, status: item.status, href: `/vehicles/360/${item.id}` }, query, { vehicleNumber: item.vehicleNumber, vin: item.vin, vinRaw: item.vinRaw, stockNumber: item.stockNumber, licensePlate: item.licensePlate, make: item.make, model: item.model }));
      for (const item of customers) results.push(result({ id: item.id, type: "CUSTOMER", label: item.displayName, detail: item.customerNumber, status: item.status, href: `/crm-next/customers/${encodeURIComponent(item.id)}` }, query, { customerNumber: item.customerNumber, displayName: item.displayName }));
      for (const item of orders) results.push(result({ id: item.id, type: "REPAIR_ORDER", label: item.repairOrderNumber, detail: `${item.vehicle.vehicleNumber} · ${[item.vehicle.year, item.vehicle.make, item.vehicle.model].filter(Boolean).join(" ")}`, status: item.stage, href: `/vehicles/360/${item.vehicle.id}` }, query, { repairOrderNumber: item.repairOrderNumber, nextAction: item.nextAction, vehicleNumber: item.vehicle.vehicleNumber }));
      for (const item of jobs) results.push(result({ id: item.id, type: "REPAIR_JOB", label: `${item.jobNumber} · ${item.description}`, detail: `${item.repairOrder.repairOrderNumber} · ${item.repairOrder.vehicle.vehicleNumber}`, status: item.status, href: `/vehicles/360/${item.repairOrder.vehicleId}` }, query, { jobNumber: item.jobNumber, workTypeCode: item.workTypeCode, description: item.description, repairOrderNumber: item.repairOrder.repairOrderNumber }));
      for (const item of appointments) results.push(result({ id: item.id, type: "APPOINTMENT", label: item.title, detail: `${item.appointmentNumber} · ${item.location.name}${item.startsAt ? ` · ${item.startsAt.toISOString()}` : ""}`, status: item.bookingStatus, href: `/appointments?appointmentId=${item.id}` }, query, { appointmentNumber: item.appointmentNumber, title: item.title }));
      for (const item of parts) results.push(result({ id: item.id, type: "PART", label: `${item.partNumber} · ${item.description}`, detail: item.manufacturerCode ?? "Canonical part", status: item.status, href: "/vehicles/parts-counter" }, query, { partNumber: item.partNumber, manufacturerCode: item.manufacturerCode, description: item.description }));
      for (const item of purchaseOrders) results.push(result({ id: item.id, type: "PURCHASE_ORDER", label: item.purchaseOrderNumber, detail: `${item.vendor.name} · ${item.location.name}`, status: item.status, href: "/vehicles/service-close-parts" }, query, { purchaseOrderNumber: item.purchaseOrderNumber, vendorCode: item.vendor.code, vendorName: item.vendor.name }));
      for (const item of documents) results.push(result({ id: item.evidenceObjectId, type: "DOCUMENT", label: item.evidenceObject.fileName, detail: `${item.vehicle.vehicleNumber} · ${item.evidenceObject.contentType} · ${item.evidenceObject.accessLevel}`, status: item.evidenceObject.status, href: `/vehicles/360/${item.vehicle.id}` }, query, { fileName: item.evidenceObject.fileName, checksumSha256: item.evidenceObject.checksumSha256, vehicleNumber: item.vehicle.vehicleNumber }));
      for (const item of workItems) results.push(result({ id: item.id, type: "WORK_ITEM", label: item.title, detail: `${item.workflowArea} · ${item.assignedUser.name} · due ${item.dueAt.toISOString()}`, status: item.status, href: `/tasks/${item.id}` }, query, { taskId: item.id, title: item.title, vehicleReference: item.vehicleReference, customerReference: item.customerReference }));
      for (const item of claims) results.push(result({ id: item.id, type: "CLAIM", label: item.claimNumber ? `Claim ${item.claimNumber}` : `Claim for ${item.customerName}`, detail: `${item.customerName} · ${[item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") || "Vehicle pending"} · VIN ${item.vehicleVin ?? "pending"}`, status: `${item.status}/${item.stage}`, href: `/vehicles/claims-workspace?claimId=${encodeURIComponent(item.id)}` }, query, { claimId: item.id, claimNumber: item.claimNumber, customerName: item.customerName, carrierName: item.carrierName, linkedRepairOrderId: item.linkedRepairOrderId, vin: item.vehicleVin, stockNumber: item.vehicleStockNumber, licensePlate: item.vehiclePlate, make: item.vehicleMake, model: item.vehicleModel }));
      return { query, results: rankOperationalSearchResults(results.filter((item) => item.score > 0), limit), searchedTypes: types };
    },

    async knowledgeOverview(organizationId: string, now: Date) {
      const [procedures, links] = await Promise.all([
        database.workProcedureVersion.findMany({ where: { organizationId }, orderBy: [{ workTypeCode: "asc" }, { version: "desc" }] }),
        database.workKnowledgeLink.findMany({ where: { organizationId }, orderBy: [{ workTypeCode: "asc" }, { createdAt: "desc" }], include: { procedureVersion: { select: { id: true, title: true, version: true, workTypeCode: true } }, createdByUser: { select: { id: true, name: true } }, approvedByUser: { select: { id: true, name: true } }, events: { orderBy: { occurredAt: "desc" } } } })
      ]);
      return { procedures, links, effectiveApprovedLinks: links.filter((link) => link.status === "APPROVED" && link.effectiveFrom <= now && (!link.effectiveTo || link.effectiveTo >= now)) };
    },

    createKnowledge(command: EnterpriseCommandCommitInput, data: { actorUserId: string; contentHashSha256: string; effectiveFrom: Date; effectiveTo: Date | null; procedureVersionId: string | null; revision: string; sourceOrganization: string; sourceReference: string; supersedesId: string | null; title: string; type: "PROCEDURE" | "BULLETIN" | "SAFETY_NOTE" | "REFERENCE"; uri: string; workTypeCode: string }) {
      return executeMutation(database, command, "vehicle-operations.work-knowledge", async (tx, version) => {
        if (data.procedureVersionId) { const procedure = await tx.workProcedureVersion.findFirst({ where: { id: data.procedureVersionId, organizationId: command.organizationId, workTypeCode: data.workTypeCode } }); if (!procedure) throw new Error("Procedure version does not match this organization and work type."); }
        if (data.supersedesId) { const prior = await tx.workKnowledgeLink.findFirst({ where: { id: data.supersedesId, organizationId: command.organizationId, workTypeCode: data.workTypeCode, sourceOrganization: data.sourceOrganization, sourceReference: data.sourceReference, status: "APPROVED" } }); if (!prior) throw new Error("Superseded knowledge revision must be an approved revision of the same source and work type."); }
        const { actorUserId, ...attributes } = data;
        const link = await tx.workKnowledgeLink.create({ data: { id: command.subjectId, organizationId: command.organizationId, ...attributes, createdByUserId: actorUserId, authority: "REFERENCE_ONLY", reason: command.reason, status: "DRAFT", version } });
        await tx.workKnowledgeEvent.create({ data: { organizationId: command.organizationId, knowledgeLinkId: link.id, actorUserId, eventType: "CREATED", reason: command.reason, metadata: json({ revision: link.revision, sourceReference: link.sourceReference }) } });
        return { id: link.id, status: link.status, workTypeCode: link.workTypeCode };
      });
    },

    approveKnowledge(command: EnterpriseCommandCommitInput, actorUserId: string, now: Date) {
      return executeMutation(database, command, "vehicle-operations.work-knowledge", async (tx, version) => {
        const link = await tx.workKnowledgeLink.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, status: "DRAFT" } }); if (!link) throw new Error("Draft knowledge link was not found.");
        if (link.createdByUserId === actorUserId) throw new Error("Knowledge approval requires an independent reviewer.");
        if (link.supersedesId) {
          await tx.workKnowledgeLink.update({ where: { id: link.supersedesId }, data: { status: "SUPERSEDED", effectiveTo: now, version: { increment: 1 } } });
          await tx.workKnowledgeEvent.create({ data: { organizationId: command.organizationId, knowledgeLinkId: link.supersedesId, actorUserId, eventType: "SUPERSEDED", reason: command.reason, metadata: json({ supersededById: link.id, occurredAt: now.toISOString() }) } });
        }
        const approved = await tx.workKnowledgeLink.update({ where: { id: link.id }, data: { status: "APPROVED", approvedByUserId: actorUserId, approvedAt: now, version } });
        await tx.workKnowledgeEvent.create({ data: { organizationId: command.organizationId, knowledgeLinkId: link.id, actorUserId, eventType: "APPROVED", reason: command.reason, metadata: json({ approvedAt: now.toISOString(), authority: approved.authority, version }) } });
        return { id: approved.id, status: approved.status, workTypeCode: approved.workTypeCode };
      });
    },

    createOutput(command: EnterpriseCommandCommitInput, data: { actorUserId: string; checksumSha256: string; classification: "INTERNAL" | "RESTRICTED"; expiresAt: Date; fieldManifest: string[]; format: "JSON" | "PRINT_HTML"; packageSnapshot: Record<string, unknown>; redactedFields: string[]; vehicleId: string; watermark: string }) {
      return executeMutation(database, command, "vehicle-operations.controlled-output", async (tx) => {
        const vehicle = await tx.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: command.organizationId }, select: { id: true } }); if (!vehicle) throw new Error("Vehicle was not found.");
        const output = await tx.vehicleControlledOutput.create({ data: { id: command.subjectId, organizationId: command.organizationId, vehicleId: data.vehicleId, requestedByUserId: data.actorUserId, format: data.format, classification: data.classification, reason: command.reason, watermark: data.watermark, fieldManifest: json(data.fieldManifest), redactedFields: json(data.redactedFields), packageSnapshot: json(data.packageSnapshot), checksumSha256: data.checksumSha256, expiresAt: data.expiresAt } });
        await tx.vehicleControlledOutputEvent.create({ data: { organizationId: command.organizationId, outputId: output.id, actorUserId: data.actorUserId, eventType: "GENERATED", reason: command.reason, metadata: json({ checksumSha256: output.checksumSha256, classification: output.classification, format: output.format }) } });
        return { checksumSha256: output.checksumSha256, classification: output.classification, format: output.format, id: output.id, vehicleId: output.vehicleId };
      });
    },

    getOutput(organizationId: string, id: string) { return database.vehicleControlledOutput.findFirst({ where: { id, organizationId }, include: { vehicle: { select: { vehicleNumber: true } } } }); },
    async recordOutputDownload(organizationId: string, outputId: string, actorUserId: string, reason: string) { await database.vehicleControlledOutputEvent.create({ data: { organizationId, outputId, actorUserId, eventType: "DOWNLOADED", reason, metadata: json({ delivery: "AUTHORIZED_CONTROLLED_OUTPUT" }) } }); }
  };
}

export type VehicleDiscoveryRepository = ReturnType<typeof createVehicleDiscoveryRepository>;
