import { createHash, randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { Prisma, type CaptureArchiveItem } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { dealCustomer, dealOrganization, searchDealCustomers } from "@/server/deal-continuity/identities";
import { isManager } from "@/server/policies/access";
import { getVehicleRegistryDetail, listVehicleRegistry } from "@/server/vehicle-registry/service";
import {
  archiveDestinationTypes, businessCategories, captureBatchLimit, captureByteLimit, captureFileError, captureKinds, categoryFromDescription,
  type ArchiveDestinationType, type ArchiveKind, type ArchiveTarget, type CaptureArchiveRow
} from "@/features/mobile-capture/capture-archive-contract";
import { canOpenDocumentLibrary, resolveDocumentLibraryPermission } from "./permission-policy";
import { readCapturedBusinessCard } from "./smart-intake";
import { resolveDocumentStorageRuntimeFromEnv } from "./storage-config";
import { buildDocumentObjectKey } from "./storage-adapter";

export class CaptureArchiveError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function captureActor(actor: AuthenticatedUser | null) {
  if (!actor?.isActive) throw new CaptureArchiveError("Sign in before using the capture archive.", 401);
  if (!canOpenDocumentLibrary(actor)) throw new CaptureArchiveError("Document workflow access is required.", 403);
  return actor;
}

export function canViewCapturedId(actor: AuthenticatedUser | null) {
  return resolveDocumentLibraryPermission({ actor, action: "viewRestricted", linkedRecordAccess: true, sensitivity: "RESTRICTED" }).allowed;
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CaptureArchiveError("The capture request is invalid.");
  return input as Record<string, unknown>;
}
function str(input: unknown, max: number) { return typeof input === "string" ? input.trim().slice(0, max) : ""; }
function digest(input: string | Uint8Array) { return createHash("sha256").update(input).digest("hex"); }
function destinationType(input: unknown): ArchiveDestinationType {
  if (!(archiveDestinationTypes as readonly unknown[]).includes(input)) throw new CaptureArchiveError("Choose an available filing destination.");
  return input as ArchiveDestinationType;
}
function archiveKind(input: unknown): ArchiveKind {
  if (!(captureKinds as readonly unknown[]).includes(input)) throw new CaptureArchiveError("Choose a type for each file.");
  return input as ArchiveKind;
}
function vehicleLabel(vehicle: { year: number | null; make: string | null; model: string | null; stockNumber: string | null; vin: string | null; vehicleNumber: string }) {
  return [[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "), vehicle.stockNumber || vehicle.vin || vehicle.vehicleNumber].filter(Boolean).join(" · ");
}
function isAvailableVehicle(status: string) {
  return ["ACTIVE", "SOLD", "OUT_OF_SERVICE"].includes(status);
}

export async function resolveCaptureTarget(actor: AuthenticatedUser, input: unknown): Promise<ArchiveTarget | null> {
  if (input == null) return null;
  const target = record(input);
  const type = destinationType(target.type);
  const id = str(target.id, 120);
  if (!id) throw new CaptureArchiveError("Select a record before filing.");
  const organizationId = dealOrganization();
  try {
    if (type === "CUSTOMER") {
      const found = await dealCustomer(actor, id);
      return { id, type, label: `${found.name} · ${found.customerNumber}` };
    }
    if (type === "VEHICLE") {
      const found = await getVehicleRegistryDetail(actor, id, { organizationId });
      if (isAvailableVehicle(found.status) && !found.mergedIntoVehicleId) return { id, type, label: vehicleLabel(found) };
    }
    if (type === "QUICK_UPDATE") {
      const found = await prisma.workdayQuickUpdate.findUnique({ where: { id }, select: { workbook: { select: { userId: true } } } });
      if (found && (found.workbook.userId === actor.id || isManager(actor))) return { id, type, label: `Quick Update ${id}` };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) throw error;
    throw new CaptureArchiveError("That record is unavailable or outside your access. Select another record or send to the archive.", 403);
  }
  throw new CaptureArchiveError("That record is unavailable or outside your access. Select another record or send to the archive.", 403);
}

export async function searchCaptureTargets(actor: AuthenticatedUser, params: URLSearchParams) {
  const type = destinationType(params.get("type"));
  const id = str(params.get("id"), 120);
  if (id) return [await resolveCaptureTarget(actor, { type, id })];
  const q = str(params.get("q"), 100);
  if (q.length < 2 || type === "QUICK_UPDATE") return [];
  try {
    if (type === "CUSTOMER") {
      const results = await searchDealCustomers(actor, new URLSearchParams({ q }));
      return results.items.slice(0, 12).map(item => ({ id: item.id, type, label: `${item.name} · ${item.customerNumber}` }));
    }
    const results = await listVehicleRegistry(actor, { query: q, pageSize: 20 }, { organizationId: dealOrganization() });
    return results.items.filter(item => isAvailableVehicle(item.status)).slice(0, 12).map(item => ({ id: item.id, type, label: vehicleLabel(item) }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) throw error;
    throw new CaptureArchiveError("Record search is unavailable for your access. You can still use the archive.", 403);
  }
}

function targetOf(item: CaptureArchiveItem): ArchiveTarget | null {
  return item.ownerType && item.ownerId ? { type: item.ownerType as ArchiveDestinationType, id: item.ownerId, label: item.ownerLabel ?? "" } : null;
}
function canEdit(actor: AuthenticatedUser, item: CaptureArchiveItem) {
  return actor.id === item.createdByUserId || isManager(actor);
}
function row(actor: AuthenticatedUser, item: CaptureArchiveItem, originalAvailable = true): CaptureArchiveRow {
  const destination = targetOf(item);
  return {
    id: item.id, fileName: originalAvailable ? item.fileName : "Saved capture", contentType: item.contentType, kind: item.kind as ArchiveKind,
    description: originalAvailable ? item.description : "", category: originalAvailable ? item.category : null,
    businessDetails: originalAvailable && Array.isArray(item.businessDetails) ? item.businessDetails as CaptureArchiveRow["businessDetails"] : [],
    destination: destination && !originalAvailable ? { ...destination, label: "Unavailable record" } : destination,
    createdAt: item.createdAt.toISOString(), revision: item.revision, canEdit: canEdit(actor, item), originalAvailable
  };
}

function matchesSignature(bytes: Buffer, type: string) {
  if (type === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/jpeg") return bytes.subarray(0, 3).toString("hex") === "ffd8ff" && bytes.subarray(-2).toString("hex") === "ffd9";
  if (type === "image/png") return bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" && bytes.subarray(-12).toString("hex") === "0000000049454e44ae426082";
  return type === "image/webp" && bytes.length >= 20 && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" &&
    bytes.readUInt32LE(4) + 8 === bytes.length;
}

export async function archiveCaptureBatch(actor: AuthenticatedUser, form: FormData) {
  let raw: Record<string, unknown>;
  try { raw = record(JSON.parse(String(form.get("manifest")))); }
  catch { throw new CaptureArchiveError("The batch details could not be read."); }
  const key = str(raw.key, 100);
  const files = form.getAll("file");
  const descriptors = raw.items;
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(key) || !Array.isArray(descriptors) ||
      files.length < 1 || files.length > captureBatchLimit || descriptors.length !== files.length) {
    throw new CaptureArchiveError("Review one to twelve files before sending.");
  }
  if (files.some(file => !(file instanceof File)) || (files as File[]).reduce((sum, file) => sum + file.size, 0) > captureByteLimit) {
    throw new CaptureArchiveError("Keep the batch under 25 MB.");
  }
  const organizationId = dealOrganization();
  const proposedTarget = raw.destination == null ? null : record(raw.destination);
  const batchId = digest(JSON.stringify([organizationId, actor.id, key]));
  const candidates = await Promise.all((files as File[]).map(async (file, position) => {
    const error = captureFileError(file);
    if (error) throw new CaptureArchiveError(error);
    const descriptor = record(descriptors[position]);
    const kind = archiveKind(descriptor.kind);
    if ((kind === "PHOTO" || kind === "BUSINESS_CARD") && !file.type.startsWith("image/")) throw new CaptureArchiveError("Photos and business cards must be image files.");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(bytes, file.type)) throw new CaptureArchiveError("A file does not match its selected format.");
    if (file.type === "application/pdf") {
      try {
        const { PDFDocument } = await import("pdf-lib");
        const document = await PDFDocument.load(bytes, { throwOnInvalidObject: true });
        if (document.getPageCount() < 1) throw new Error("Missing page");
      } catch { throw new CaptureArchiveError("A PDF could not be opened. Choose an intact, unlocked PDF."); }
    }
    const checksumSha256 = digest(bytes);
    const fileName = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 120) || "capture";
    return { bytes, checksumSha256, contentType: file.type, fileName, kind, description: str(descriptor.description, 240), position };
  }));
  const requestHash = digest(JSON.stringify([proposedTarget?.type, str(proposedTarget?.id, 120), candidates.map(({ checksumSha256, fileName, kind, description }) => [checksumSha256, fileName, kind, description])]));
  async function replay() {
    const saved = await prisma.captureArchiveBatch.findUnique({ where: { id: batchId }, include: { items: { orderBy: { position: "asc" } } } });
    if (!saved) return null;
    if (saved.requestHash !== requestHash) throw new CaptureArchiveError("This batch was already sent with different details. Find the saved batch in the archive.", 409);
    // A later filing may have changed access, so retries do not disclose raw content or the new destination.
    return { batchId, items: saved.items.map(item => ({ id: item.id, fileName: item.fileName, kind: item.kind, contentType: item.contentType })) };
  }
  const existing = await replay();
  if (existing) return existing;
  const target = await resolveCaptureTarget(actor, proposedTarget);
  const storage = resolveDocumentStorageRuntimeFromEnv();
  if (!storage.adapter || !storage.localPrivateRoot) throw new CaptureArchiveError("Private capture storage is unavailable. Keep the batch open and retry.", 503);
  const cards: (Awaited<ReturnType<typeof readCapturedBusinessCard>> | null)[] = [];
  for (const candidate of candidates) {
    const card = candidate.kind === "BUSINESS_CARD" ? await readCapturedBusinessCard(candidate) : null;
    if (card?.isId) throw new CaptureArchiveError("A business-card image appears to be an ID. Mark it as ID and review again.");
    cards.push(card);
  }
  const items: Prisma.CaptureArchiveItemCreateWithoutBatchInput[] = [];
  const root = resolve(storage.localPrivateRoot);
  const attempted = new Map<string, string>();
  const attempt = randomUUID();
  let committing = false;
  try {
    for (const candidate of candidates) {
      const { bytes, ...metadata } = candidate;
      const card = cards[candidate.position];
      const id = `${batchId}-${candidate.position}`;
      const write = {
        ...candidate, organizationId, owner: { id: "capture-archive", label: "Capture archive", type: "TASK" as const },
        documentId: `${id}-${attempt}`, version: 1, expectedChecksumSha256: candidate.checksumSha256
      };
      const key = buildDocumentObjectKey(write);
      attempted.set(`local-private://${key}`, resolve(root, key));
      const stored = await storage.adapter.writeObject(write);
      items.push({
        ...metadata, id, organizationId, createdByUserId: actor.id, sizeBytes: bytes.length, storageReference: stored.reference,
        category: card ? categoryFromDescription(card.text) ?? categoryFromDescription(candidate.description) : null,
        businessDetails: card ? card.details : undefined,
        searchText: card?.details.map(detail => detail.value).join(" ") ?? "",
        ownerType: target?.type, ownerId: target?.id, ownerLabel: target?.label
      });
    }
    committing = true;
    await prisma.captureArchiveBatch.create({ data: { id: batchId, createdByUserId: actor.id, organizationId, requestHash, items: { create: items } } });
  } catch (error) {
    // Each attempt owns its paths. On an ambiguous database commit, check the authoritative references before removing any bytes.
    const saved = committing ? await prisma.captureArchiveBatch.findUnique({
      where: { id: batchId }, include: { items: { select: { storageReference: true } } }
    }).catch(() => undefined) : null;
    if (saved !== undefined) {
      const inUse = new Set(saved?.items.map(item => item.storageReference));
      await Promise.allSettled([...attempted].filter(([reference, path]) => !inUse.has(reference) && path.startsWith(root + sep)).map(([, path]) => unlink(path)));
    }
    if (saved) { const prior = await replay(); if (prior) return prior; }
    throw error;
  }
  return { batchId, items: items.map(item => ({ id: item.id, fileName: item.fileName, kind: item.kind, contentType: item.contentType })) };
}

export async function listCaptureArchive(actor: AuthenticatedUser, params: URLSearchParams) {
  const ownerType = params.get("ownerType"), ownerId = params.get("ownerId");
  const target = ownerType || ownerId ? await resolveCaptureTarget(actor, { type: ownerType, id: ownerId }) : null;
  const q = str(params.get("q"), 120);
  const kind = params.get("kind") ? archiveKind(params.get("kind")) : null;
  const organizationId = dealOrganization();
  const batchId = str(params.get("batch"), 64);
  const boundary = params.get("before");
  const [stamp, beforeId] = boundary?.split(",") ?? [];
  const before = stamp ? new Date(stamp) : null;
  if (boundary && (!before || !Number.isFinite(before.valueOf()) || !/^[\da-f]{64}-\d{1,2}$/.test(beforeId ?? ""))) throw new CaptureArchiveError("This search page has expired. Search again.");
  const where: Prisma.CaptureArchiveItemWhereInput = {
    organizationId,
    AND: [
      ...(!canViewCapturedId(actor) ? [{ kind: { not: "ID" } }] : []),
      ...(kind ? [{ kind }] : []),
      ...(batchId ? [{ batchId }] : []),
      ...(before ? [{ OR: [{ createdAt: { lt: before } }, { createdAt: before, id: { lt: beforeId } }] }] : []),
      ...(target ? [{ ownerType: target.type, ownerId: target.id }, ...(!canViewCapturedId(actor) ? [{ createdByUserId: actor.id }] : [])] : isManager(actor) ? [] : [{ createdByUserId: actor.id }]),
      ...(params.get("unfiled") === "1" ? [{ ownerId: null }] : []),
      ...(q ? [{ OR: ["description", "fileName", "category", "ownerLabel", "searchText"].map(field => ({ [field]: { contains: q, mode: "insensitive" } })) }] : [])
    ]
  };
  const items = await prisma.captureArchiveItem.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 40 });
  // Hide linked items that the viewer can no longer open even in a master view.
  const checks = new Map<string, Promise<boolean>>();
  const visible = await Promise.all(items.map(async item => {
    const linked = targetOf(item);
    if (target || !linked) return row(actor, item);
    const key = `${linked.type}:${linked.id}`;
    if (!checks.has(key)) checks.set(key, resolveCaptureTarget(actor, linked).then(() => true).catch(error => {
      if (error instanceof CaptureArchiveError) return false;
      throw error;
    }));
    return await checks.get(key) ? row(actor, item) : isManager(actor) ? row(actor, item, false) : null;
  }));
  const last = items.at(-1);
  return { items: visible.filter(item => item !== null), destination: target, next: items.length === 40 && last ? `${last.createdAt.toISOString()},${last.id}` : null, canPrintId: canViewCapturedId(actor) };
}

async function accessibleItem(actor: AuthenticatedUser, id: string, recover = false) {
  const item = await prisma.captureArchiveItem.findFirst({ where: { id, organizationId: dealOrganization() } });
  if (!item || (item.kind === "ID" && !canViewCapturedId(actor))) throw new CaptureArchiveError("Capture unavailable.", 404);
  const target = targetOf(item);
  if (!canEdit(actor, item) && (!target || !canViewCapturedId(actor))) throw new CaptureArchiveError("Capture unavailable.", 404);
  if (target) {
    try { await resolveCaptureTarget(actor, target); }
    catch (error) { if (!recover || !isManager(actor) || !(error instanceof CaptureArchiveError)) throw error; }
  }
  return item;
}

export async function fileCapture(actor: AuthenticatedUser, input: unknown) {
  const raw = record(input);
  const item = await accessibleItem(actor, str(raw.id, 120), true);
  if (!canEdit(actor, item)) throw new CaptureArchiveError("Only the uploader or a manager can change filing.", 403);
  if (raw.revision !== item.revision) throw new CaptureArchiveError("This capture changed. Refresh before filing again.", 409);
  const target = await resolveCaptureTarget(actor, raw.destination);
  const description = raw.description === undefined ? item.description : str(raw.description, 240);
  const requestedCategory = str(raw.category, 70);
  if (requestedCategory && (item.kind !== "BUSINESS_CARD" || !(businessCategories as readonly string[]).includes(requestedCategory))) throw new CaptureArchiveError("Choose a supported business category.");
  const category = item.kind === "BUSINESS_CARD" ? requestedCategory || categoryFromDescription(description) || item.category : null;
  const before = { destination: targetOf(item), description: item.description, category: item.category };
  const after = { destination: target, description, category };
  return prisma.$transaction(async tx => {
    const updated = await tx.captureArchiveItem.updateMany({
      where: { id: item.id, organizationId: item.organizationId, revision: item.revision },
      data: { ownerType: target?.type ?? null, ownerId: target?.id ?? null, ownerLabel: target?.label ?? null, description, category, revision: { increment: 1 } }
    });
    if (!updated.count) throw new CaptureArchiveError("This capture changed. Refresh before filing again.", 409);
    await tx.documentLibraryAuditEvent.create({ data: {
      organizationId: item.organizationId, actorUserId: actor.id, action: "CAPTURE_FILING_CHANGED", idempotencyKey: `${item.id}:${item.revision}`,
      subjectType: "CAPTURE", subjectId: item.id, note: "Updated capture filing or category.", priorValue: before, newValue: after
    } });
    return row(actor, await tx.captureArchiveItem.findUniqueOrThrow({ where: { id: item.id } }));
  });
}

export async function readCaptureFile(actor: AuthenticatedUser, id: string, print: boolean) {
  const item = await accessibleItem(actor, id);
  const runtime = resolveDocumentStorageRuntimeFromEnv();
  if (!runtime.localPrivateRoot || !item.storageReference.startsWith("local-private://")) throw new CaptureArchiveError("The original file is unavailable.", 503);
  const root = resolve(runtime.localPrivateRoot);
  const path = resolve(root, item.storageReference.slice("local-private://".length));
  if (!path.startsWith(root + sep)) throw new CaptureArchiveError("The original file is unavailable.", 404);
  const bytes = await readFile(path).catch(() => { throw new CaptureArchiveError("The original file is unavailable.", 503); });
  if (digest(bytes) !== item.checksumSha256) throw new CaptureArchiveError("The original file could not be verified.", 409);
  if (print || item.kind === "ID") await prisma.documentLibraryAuditEvent.create({ data: {
    organizationId: item.organizationId, actorUserId: actor.id, action: print ? "CAPTURE_OPENED_FOR_PRINT" : "CAPTURE_ID_VIEWED",
    idempotencyKey: randomUUID(), subjectType: "CAPTURE", subjectId: item.id, note: print ? "Opened original for printing." : "Viewed restricted capture."
  } });
  return { bytes, contentType: item.contentType };
}
