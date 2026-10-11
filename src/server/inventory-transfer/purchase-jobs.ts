import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { scanPurchaseSource } from "./purchase-scanner";

const organizationId = INITIAL_ORGANIZATION.id;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function stagePurchaseSource(userId: string, locationId: string, file: { bytes: Buffer; fileName: string; contentType: string }) {
  const id = randomUUID(), retention = new Date(Date.now() + 30 * 24 * 60 * 60_000);
  await prisma.$transaction(async tx => {
    const scope = `${organizationId}:PURCHASE_SOURCE_LIMIT:${userId}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
    const count = await tx.vehicleEvidenceObject.count({ where: { organizationId, uploadedByUserId: userId, storageKey: { startsWith: "purchase-import:" }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } } });
    if (count >= 100) throw new Error("Daily purchase upload limit reached. Contact your inventory manager.");
    const source = await tx.vehicleEvidenceObject.create({ data: { organizationId, uploadedByUserId: userId, fileName: file.fileName, contentType: file.contentType, byteSize: file.bytes.length, checksumSha256: createHash("sha256").update(file.bytes).digest("hex"), storageKey: `purchase-import:${id}`, content: new Uint8Array(file.bytes), malwareStatus: "ERROR", malwareScanner: "PENDING", malwareScannedAt: new Date(), accessLevel: "RESTRICTED", retentionUntil: retention, status: "QUARANTINED" } });
    await tx.purchaseImportJob.create({ data: { id, organizationId, locationId, createdByUserId: userId, assignedToUserId: userId, sourceEvidenceId: source.id, fileName: file.fileName, status: "SCANNING", leaseUntil: new Date(Date.now() + 120_000), attempts: 1 } });
  });
  const scan = await scanPurchaseSource(file.bytes, file.contentType);
  await prisma.$transaction(async tx => {
    const job = await tx.purchaseImportJob.findUniqueOrThrow({ where: { id } });
    await tx.vehicleEvidenceObject.update({ where: { id: job.sourceEvidenceId }, data: { malwareStatus: scan.malwareStatus, malwareScanner: scan.scanner, malwareScannedAt: new Date(), status: scan.malwareStatus === "CLEAN" ? "AVAILABLE" : "QUARANTINED" } });
    await tx.purchaseImportJob.update({ where: { id }, data: { status: scan.malwareStatus === "CLEAN" ? "PROCESSING" : "QUARANTINED", failureCode: scan.malwareStatus === "CLEAN" ? null : scan.malwareStatus, version: { increment: 1 } } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: userId, locationId, domain: "VEHICLE_REGISTRY", subjectType: "PURCHASE_IMPORT", subjectId: id, eventType: "PURCHASE_SOURCE_SCANNED", reason: "Quarantined purchase source safety scan", metadata: { malwareStatus: scan.malwareStatus, scanner: scan.scanner }, correlationId: id } });
  });
  if (scan.malwareStatus !== "CLEAN") throw new Error(scan.malwareStatus === "DETECTED" ? "Document quarantined: file safety validation failed." : "Document quarantined: malware scanner is unavailable. Contact your administrator.");
  return id;
}
export async function finishPurchaseRead(id: string, reading: { values: { vin?: string } }, failed = false) {
  await prisma.purchaseImportJob.update({ where: { id }, data: { status: failed ? "FAILED" : "NEEDS_REVIEW", reading: failed ? undefined : json(reading), vin: reading.values.vin ?? "", leaseUntil: null, failureCode: failed ? "EXTRACTION_FAILED" : null, version: { increment: 1 } } });
}
export async function registerPurchaseRow(parentId: string, reading: { readId: string; values: { vin?: string }; fileName: string }) {
  const parent = await prisma.purchaseImportJob.findUniqueOrThrow({ where: { id: parentId } });
  await prisma.purchaseImportJob.create({ data: { id: reading.readId, organizationId, locationId: parent.locationId, createdByUserId: parent.createdByUserId, assignedToUserId: parent.assignedToUserId, sourceEvidenceId: parent.sourceEvidenceId, fileName: reading.fileName, vin: reading.values.vin ?? "", reading: json(reading), status: "NEEDS_REVIEW" } });
}
export async function linkPurchaseSource(userId: string, locationId: string, id: string, vehicleId: string) {
  await storedPurchaseSource(userId, locationId, id);
  const job = await prisma.purchaseImportJob.findUniqueOrThrow({ where: { id } });
  if (!await prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true } })) throw new Error("Purchase vehicle unavailable.");
  const key = { evidenceObjectId: job.sourceEvidenceId, vehicleId, subjectType: "VEHICLE", subjectId: vehicleId, relationship: "PURCHASE_SOURCE" };
  await prisma.vehicleEvidenceLink.upsert({ where: { evidenceObjectId_vehicleId_subjectType_subjectId_relationship: key }, create: { ...key, organizationId, category: "OTHER", createdByUserId: userId }, update: {} });
  const retentionUntil = new Date(); retentionUntil.setUTCFullYear(retentionUntil.getUTCFullYear() + 7);
  await prisma.vehicleEvidenceObject.update({ where: { id: job.sourceEvidenceId }, data: { retentionUntil } });
}
export async function storedPurchaseSource(userId: string, locationId: string, id: string) {
  const job = await prisma.purchaseImportJob.findFirst({ where: { id, organizationId, locationId, createdByUserId: userId }, include: { source: true } });
  if (!job || job.source.status !== "AVAILABLE" || job.source.malwareStatus !== "CLEAN") throw new Error("Stored source is unavailable or quarantined.");
  const bytes = Buffer.from(job.source.content);
  if (createHash("sha256").update(bytes).digest("hex") !== job.source.checksumSha256) throw new Error("Stored document integrity check failed.");
  return { bytes, fileName: job.source.fileName, contentType: job.source.contentType };
}
export async function recordPurchaseJobEvent(userId: string, locationId: string, id: string, type: string, metadata: unknown) {
  void userId;
  const status = type === "PURCHASE_DOCUMENT_RETRIED" ? "RETRIED" : type === "PURCHASE_DOCUMENT_UNDONE" ? "UNDONE" : type === "PURCHASE_DOCUMENT_COMPLETED" ? "IMPORTED" : type === "PURCHASE_DOCUMENT_FAILED" ? "FAILED" : type === "PURCHASE_DOCUMENT_READY" ? "READY" : type === "PURCHASE_DOCUMENT_CORRECTED" || type === "PURCHASE_DOCUMENT_RESUMED" ? "NEEDS_REVIEW" : null;
  if (!status) return;
  const job = await prisma.purchaseImportJob.findFirst({ where: { id, organizationId, locationId } });
  if (job?.status === "APPLYING" && !["IMPORTED", "UNDONE"].includes(status) && !(type === "PURCHASE_DOCUMENT_RESUMED" && job.leaseUntil && job.leaseUntil.getTime() <= Date.now())) throw new Error("Import save is running. Wait before changing its review.");
  if (job?.status === "IMPORTED" && !["IMPORTED", "UNDONE"].includes(status)) throw new Error("Purchase already imported. Open its vehicle record.");
  if (job?.status === "UNDONE") throw new Error("This draft was undone. Review its vehicle record before further changes.");
  const changed = await prisma.purchaseImportJob.updateMany({ where: { id, organizationId, locationId, ...(job ? { version: job.version } : {}) }, data: { status, version: { increment: 1 }, ...(type === "PURCHASE_DOCUMENT_CORRECTED" ? { corrections: json(metadata) } : {}), ...(status === "IMPORTED" && job?.status !== "IMPORTED" ? { outcome: json(metadata) } : {}), failureCode: status === "FAILED" ? "ALLOCATION_FAILED" : null, leaseUntil: null } });
  if (job && changed.count !== 1) throw new Error("Import changed concurrently. Refresh its review.");
}
export async function claimPurchaseSave(id: string, expectedVersion: number) {
  const changed = await prisma.purchaseImportJob.updateMany({ where: { id, organizationId, version: expectedVersion, status: "READY" }, data: { status: "APPLYING", leaseUntil: new Date(Date.now() + 120_000), version: { increment: 1 } } });
  if (changed.count !== 1) throw new Error("Import review changed or another save is running. Review it again.");
}
export async function markPurchaseBatch(id: string) { await prisma.purchaseImportJob.update({ where: { id }, data: { status: "BATCH" } }); }
