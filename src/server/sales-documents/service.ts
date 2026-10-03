import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { Prisma } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { zipSync, strToU8 } from "fflate";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { canOpenDocumentLibrary, resolveDocumentLibraryPermission } from "@/server/document-library/permission-policy";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { SALES_DOCUMENT_PATHWAYS, isSalesDocumentPathway, salesDocumentRequirements, normalizeSalesDocumentType, type PacketPhase, type SalesDocumentRequirement } from "@/lib/sales-document-pathways";
import type { UnifiedCrmContractPacketInput, UnifiedCrmContractPacketResult } from "@/server/unified-crm/contract-packet-contract";
import { closingChecklist, SalesDocumentsError, type JacketDocument } from "./domain";

const include = {
  packet: { include: { documents: { include: { document: { include: { versions: true } } } }, auditEvents: { orderBy: { occurredAt: "desc" as const }, take: 30 } } },
  versions: { orderBy: { version: "desc" as const } }
} satisfies Prisma.SalesDocumentJacketInclude;
type Jacket = Prisma.SalesDocumentJacketGetPayload<{ include: typeof include }>;
type Transaction = Prisma.TransactionClient;

export function requireSalesDocumentsUser(actor: AuthenticatedUser | null, elevated = false) {
  if (!actor?.isActive) throw new SalesDocumentsError("Sign in to access Sales Documents.", 401);
  if (!canOpenDocumentLibrary(actor) || (elevated && !resolveDocumentLibraryPermission({ actor, action: "waiveRequirement", linkedRecordAccess: true }).allowed)) throw new SalesDocumentsError("Your role does not permit this document action.", 403);
  return actor;
}

function organization() { return resolveDocumentStorageRuntimeFromEnv().organizationId; }
function text(value: unknown, max = 240) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)); }
function metadata(value: Prisma.JsonValue | null) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function requirements(jacket: Jacket) { return jacket.requirements as unknown as SalesDocumentRequirement[]; }

function documents(jacket: Jacket): JacketDocument[] {
  return [...jacket.packet.documents].sort((left, right) => right.document.createdAt.getTime() - left.document.createdAt.getTime()).map(({ document }) => {
    const meta = metadata(document.classificationSnapshot);
    return { id: document.id, type: document.documentType, reviewed: document.status === "ACCEPTED", signed: meta.signed === true, source: document.source, versionId: document.currentVersionId ?? "", checksum: document.checksumSha256 ?? "", fileName: document.fileName, contentType: document.contentType ?? "application/octet-stream" };
  });
}

function view(jacket: Jacket) {
  const phase: PacketPhase = ["daily-rental", "vehicle-loaner", "test-drive"].includes(jacket.pathway) ? (jacket.versions.some((version) => version.phase === "CHECKOUT") ? "RETURN" : "CHECKOUT") : "CLOSING";
  const docs = documents(jacket);
  const checklist = closingChecklist(requirements(jacket), docs, phase);
  return {
    id: jacket.id, packetId: jacket.packetId, dealNumber: jacket.dealNumber, pathway: jacket.pathway,
    pathwayLabel: SALES_DOCUMENT_PATHWAYS[jacket.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS],
    customerId: jacket.customerId, customerName: jacket.customerName, vehicleReference: jacket.vehicleReference, vin: jacket.vin, stockNumber: jacket.stockNumber,
    state: jacket.state, revision: jacket.revision, phase, requirements: requirements(jacket), checklist,
    documents: docs, updatedAt: jacket.updatedAt.toISOString(),
    versions: jacket.versions.map((item) => ({ id: item.id, version: item.version, phase: item.phase, disposition: item.disposition, finalizedAt: item.finalizedAt.toISOString(), finalizedBy: text(metadata(item.snapshot).finalizedByName) || item.finalizedByUserId })),
    history: jacket.packet.auditEvents.map((event) => ({ id: event.id, action: event.action, note: event.note, actorId: text(metadata(event.metadata).actorName) || event.actorUserId, at: event.occurredAt.toISOString() }))
  };
}
export type SalesDocumentJacketView = ReturnType<typeof view>;

async function findJacket(id: string, db: Transaction = prisma) {
  const jacket = await db.salesDocumentJacket.findFirst({ where: { id, organizationId: organization() }, include });
  if (!jacket) throw new SalesDocumentsError("Deal jacket was not found.", 404);
  return jacket;
}

async function audit(db: Transaction, jacket: Pick<Jacket, "id" | "packetId" | "organizationId">, actor: AuthenticatedUser, action: string, note: string) {
  await db.documentLibraryAuditEvent.create({ data: { organizationId: jacket.organizationId, packetId: jacket.packetId, subjectType: "PACKET", subjectId: jacket.packetId, action, note, actorUserId: actor.id, metadata: { actorName: actor.name }, idempotencyKey: randomUUID() } });
}

async function lock(db: Transaction, jacket: Jacket, expectedRevision: unknown) {
  if (!Number.isInteger(expectedRevision) || expectedRevision !== jacket.revision) throw new SalesDocumentsError("This jacket changed. Refresh it before saving.", 409);
  const result = await db.salesDocumentJacket.updateMany({ where: { id: jacket.id, organizationId: jacket.organizationId, revision: jacket.revision }, data: { revision: { increment: 1 } } });
  if (result.count !== 1) throw new SalesDocumentsError("Another staff member changed this jacket. Refresh it before saving.", 409);
}

export async function listSalesDocumentJackets(actor: AuthenticatedUser | null, query = "", pathway = "", customerId = "") {
  requireSalesDocumentsUser(actor);
  const search = text(query);
  return (await prisma.salesDocumentJacket.findMany({ where: {
    organizationId: organization(), ...(pathway && isSalesDocumentPathway(pathway) ? { pathway } : {}), ...(customerId ? { customerId } : {}),
    ...(search ? { OR: ["customerName", "vehicleReference", "vin", "stockNumber", "dealNumber"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) } : {})
  }, include, orderBy: { updatedAt: "desc" }, take: 100 })).map(view);
}

export async function getSalesDocumentJacket(actor: AuthenticatedUser | null, id: string) { requireSalesDocumentsUser(actor); return view(await findJacket(id)); }

export async function createSalesDocumentJacket(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  const user = requireSalesDocumentsUser(actor);
  const pathway = text(raw.pathway);
  if (!isSalesDocumentPathway(pathway)) throw new SalesDocumentsError("Choose a supported deal pathway.");
  const customerName = text(raw.customerName), vehicleReference = text(raw.vehicleReference), dealReference = text(raw.dealReference) || randomUUID();
  if (!customerName || !vehicleReference) throw new SalesDocumentsError("Customer and vehicle are required.");
  const organizationId = organization();
  return prisma.$transaction(async (db) => {
    const existing = await db.salesDocumentJacket.findUnique({ where: { organizationId_dealReference_pathway: { organizationId, dealReference, pathway } }, include });
    if (existing) {
      if (existing.customerName !== customerName || existing.vehicleReference !== vehicleReference) throw new SalesDocumentsError("This deal reference belongs to a different customer or vehicle.", 409);
      return view(existing);
    }
    const id = `jacket-${randomUUID()}`, packetId = `sales-packet-${randomUUID()}`;
    await db.documentLibraryPacket.create({ data: { id: packetId, organizationId, ownerType: "SALE", ownerId: id, ownerLabel: customerName, packetType: pathway, workflow: "SALES_DOCUMENTS", title: `${customerName} - ${SALES_DOCUMENT_PATHWAYS[pathway]}`, createdByUserId: user.id } });
    const jacket = await db.salesDocumentJacket.create({ data: { id, packetId, organizationId, dealReference, dealNumber: text(raw.dealNumber) || `DD-${id.slice(-8).toUpperCase()}`, pathway, customerName, customerId: text(raw.customerId) || null, vehicleReference, vin: text(raw.vin) || null, stockNumber: text(raw.stockNumber) || null, requirements: json(salesDocumentRequirements(pathway)), createdByUserId: user.id }, include });
    await audit(db, jacket, user, "JACKET_CREATED", `Created ${SALES_DOCUMENT_PATHWAYS[pathway]} jacket for ${customerName}.`);
    return view(jacket);
  }).catch(async (error: unknown) => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const existing = await prisma.salesDocumentJacket.findUnique({ where: { organizationId_dealReference_pathway: { organizationId, dealReference, pathway } }, include });
    if (!existing) throw error;
    if (existing.customerName !== customerName || existing.vehicleReference !== vehicleReference) throw new SalesDocumentsError("This deal reference belongs to a different customer or vehicle.", 409);
    return view(existing);
  });
}

async function storedBytes(reference: string, checksum: string) {
  const runtime = resolveDocumentStorageRuntimeFromEnv();
  if (!runtime.localPrivateRoot || !reference.startsWith("local-private://")) throw new SalesDocumentsError("The original file is not available from the configured storage.", 503);
  const root = resolve(runtime.localPrivateRoot), path = resolve(root, reference.slice("local-private://".length));
  if (!path.startsWith(`${root}${sep}`)) throw new SalesDocumentsError("Invalid document storage reference.");
  const bytes = await readFile(path).catch(() => { throw new SalesDocumentsError("The original file could not be retrieved. Restore document storage before continuing.", 503); });
  if (createHash("sha256").update(bytes).digest("hex") !== checksum) throw new SalesDocumentsError("Document integrity verification failed.", 409);
  return bytes;
}

export async function saveSalesDocument(actor: AuthenticatedUser | null, id: string, input: { bytes: Uint8Array; fileName: string; contentType: string; documentType: string; generated?: boolean; signed?: boolean; expectedRevision?: number }) {
  const user = requireSalesDocumentsUser(actor);
  const jacket = await findJacket(id);
  if (["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(jacket.state)) throw new SalesDocumentsError("Open an addendum before adding documents to a finalized jacket.", 409);
  if (!input.bytes.length || input.bytes.length > 25 * 1024 * 1024) throw new SalesDocumentsError("Choose a file up to 25 MB.");
  if (!input.generated) {
    const bytes = Buffer.from(input.bytes);
    if (input.contentType === "application/pdf") {
      if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new SalesDocumentsError("This file is not a PDF.");
      await PDFDocument.load(bytes).catch(() => { throw new SalesDocumentsError("Upload a readable, unencrypted PDF."); });
    } else if (input.contentType === "image/png") {
      if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new SalesDocumentsError("This file is not a PNG image.");
    } else if (input.contentType === "image/jpeg") {
      if (bytes.subarray(0, 3).toString("hex") !== "ffd8ff") throw new SalesDocumentsError("This file is not a JPEG image.");
    } else throw new SalesDocumentsError("Upload a PDF, PNG, or JPEG file.");
  }
  const runtime = resolveDocumentStorageRuntimeFromEnv();
  if (!runtime.adapter) throw new SalesDocumentsError("Permanent document storage is not configured. The document was not saved.", 503);
  const documentId = `sales-doc-${randomUUID()}`, versionId = `sales-object-${randomUUID()}`;
  const object = await runtime.adapter.writeObject({ bytes: input.bytes, fileName: input.fileName, contentType: input.contentType, documentId, organizationId: jacket.organizationId, owner: { type: "SALE", id: jacket.id, label: jacket.customerName }, version: 1 });
  await storedBytes(object.reference, object.checksumSha256);
  await prisma.$transaction(async (db) => {
    const current = await findJacket(id, db);
    if (["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(current.state)) throw new SalesDocumentsError("This jacket was finalized. Open an addendum before adding documents.", 409);
    await lock(db, current, input.expectedRevision ?? jacket.revision);
    await db.documentLibraryDocument.create({ data: { id: documentId, organizationId: jacket.organizationId, ownerType: "SALE", ownerId: id, ownerLabel: jacket.customerName, documentType: normalizeSalesDocumentType(text(input.documentType)) || "supplemental", fileName: input.fileName, status: "PENDING_REVIEW", sensitivity: "CONFIDENTIAL", source: input.generated ? "GENERATED" : "MANUAL_UPLOAD", retentionCategory: "SALE_DEAL_PACKET", storageProvider: "INTERNAL", storageReference: object.reference, checksumSha256: object.checksumSha256, sizeBytes: object.sizeBytes, contentType: object.contentType, currentVersionId: versionId, classificationSnapshot: json({ jacketId: id, signed: !input.generated && input.signed === true }), createdByUserId: user.id, versions: { create: { id: versionId, organizationId: jacket.organizationId, version: 1, storageProvider: "INTERNAL", storageReference: object.reference, fileName: input.fileName, contentType: object.contentType, sizeBytes: object.sizeBytes, checksumSha256: object.checksumSha256, createdByUserId: user.id } }, packetLinks: { create: { organizationId: jacket.organizationId, packetId: jacket.packetId, linkedByUserId: user.id } } } });
    await audit(db, jacket, user, "DOCUMENT_SAVED", `${input.fileName} saved as ${input.generated ? "working form" : "uploaded document"}.`);
  });
  return getSalesDocumentJacket(user, id);
}

export async function updateSalesDocumentJacket(actor: AuthenticatedUser | null, id: string, raw: Record<string, unknown>) {
  const user = requireSalesDocumentsUser(actor, raw.action === "WAIVE");
  return prisma.$transaction(async (db) => {
    const jacket = await findJacket(id, db);
    await lock(db, jacket, raw.revision);
    const note = text(raw.note, 1000);
    if (raw.action === "ADDENDUM") {
      if (jacket.state !== "CLOSED" && jacket.state !== "DELIVERED_FUNDING_PENDING") throw new SalesDocumentsError("This jacket is already open.");
      if (!note) throw new SalesDocumentsError("Record the reason for opening an addendum.");
      await db.salesDocumentJacket.update({ where: { id }, data: { state: "WORKING" } });
      await audit(db, jacket, user, "ADDENDUM_OPENED", note);
    } else {
      if (["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(jacket.state)) throw new SalesDocumentsError("Finalized documents are preserved. Open an addendum to make changes.", 409);
      if (raw.action === "REVIEW") {
        const link = jacket.packet.documents.find((item) => item.documentId === raw.documentId);
        if (!link) throw new SalesDocumentsError("Document is not part of this jacket.", 404);
        const referenced = jacket.versions.some((version) => {
          const snapshot = version.snapshot as unknown as { documents?: JacketDocument[] };
          return snapshot.documents?.some((document) => document.id === link.documentId);
        });
        if (referenced) throw new SalesDocumentsError("This document is preserved in a final packet. Upload a corrected copy instead.", 409);
        await storedBytes(link.document.storageReference, link.document.checksumSha256 ?? "");
        if (raw.signed === true && link.document.source === "GENERATED") throw new SalesDocumentsError("Upload the signed copy before marking signatures verified.");
        const type = normalizeSalesDocumentType(text(raw.documentType) || link.document.documentType);
        await db.documentLibraryDocument.update({ where: { id: link.documentId }, data: { documentType: type, status: "ACCEPTED", updatedByUserId: user.id, classificationSnapshot: json({ ...metadata(link.document.classificationSnapshot), signed: raw.signed === true, reviewedBy: user.id, reviewedAt: new Date().toISOString() }) } });
        await audit(db, jacket, user, "DOCUMENT_REVIEWED", `${link.document.fileName}: ${type}${raw.signed === true ? "; signatures verified" : ""}.`);
      } else if (raw.action === "WAIVE" || raw.action === "APPLICABILITY") {
        const reqs = requirements(jacket);
        const requirement = reqs.find((item) => item.id === raw.requirementId);
        if (!requirement) throw new SalesDocumentsError("Document requirement was not found.");
        if (raw.action === "WAIVE") {
          if (!note) throw new SalesDocumentsError("Record the reason for the document exception.");
          requirement.waiver = { by: user.id, at: new Date().toISOString(), reason: note };
        } else {
          if (raw.required !== true || requirement.required) throw new SalesDocumentsError("Required documents need an authorized exception to be waived.");
          requirement.required = true;
        }
        await db.salesDocumentJacket.update({ where: { id }, data: { requirements: json(reqs) } });
        await audit(db, jacket, user, raw.action, `${requirement.label}: ${note || "Marked applicable"}`);
      } else if (raw.action === "FINALIZE") {
        const current = view(jacket), phase = current.phase;
        if (phase === "RETURN" && !jacket.versions.some((item) => item.phase === "CHECKOUT")) throw new SalesDocumentsError("Finalize checkout before receiving the vehicle.");
        const pending = current.checklist.filter((item) => item.blocker);
        const fundingPending = raw.disposition === "DELIVERED_FUNDING_PENDING" && ["outside-finance-one-pay", "finance"].includes(jacket.pathway);
        const blockers = pending.filter((item) => !(fundingPending && item.id === "funding-proof"));
        if (blockers.length) throw new SalesDocumentsError(`Complete staff review: ${blockers.map((item) => item.label).join(", ")}.`, 409);
        if (fundingPending && !note) throw new SalesDocumentsError("Record why delivery is permitted before funding.");
        if (fundingPending) requireSalesDocumentsUser(user, true);
        const included = documents(jacket).filter((doc) => doc.reviewed);
        for (const doc of included) {
          const source = jacket.packet.documents.find((link) => link.documentId === doc.id)!.document;
          await storedBytes(source.storageReference, doc.checksum);
        }
        const version = (jacket.versions[0]?.version ?? 0) + 1;
        await db.salesDocumentPacketVersion.create({ data: { jacketId: id, version, phase, disposition: fundingPending ? "DELIVERED_FUNDING_PENDING" : phase === "CHECKOUT" ? "CHECKED_OUT" : "CLOSED", finalizedByUserId: user.id, snapshot: json({ customerName: jacket.customerName, customerId: jacket.customerId, pathway: jacket.pathway, dealNumber: jacket.dealNumber, vehicleReference: jacket.vehicleReference, vin: jacket.vin, stockNumber: jacket.stockNumber, checklist: current.checklist, documents: included, note, templateVersion: 1, finalizedByName: user.name }) } });
        await db.salesDocumentJacket.update({ where: { id }, data: { state: fundingPending ? "DELIVERED_FUNDING_PENDING" : phase === "CHECKOUT" ? "CHECKED_OUT" : "CLOSED" } });
        await audit(db, jacket, user, "PACKET_FINALIZED", `Version ${version} - ${phase}. ${note}`);
      } else throw new SalesDocumentsError("Choose a supported document action.");
    }
    return view(await findJacket(id, db));
  }, { timeout: 30000 });
}

export async function getSalesDocumentContent(actor: AuthenticatedUser | null, id: string, documentId: string) {
  const user = requireSalesDocumentsUser(actor), jacket = await findJacket(id);
  const source = jacket.packet.documents.find((item) => item.documentId === documentId)?.document;
  if (!source) throw new SalesDocumentsError("Document was not found in this jacket.", 404);
  const bytes = await storedBytes(source.storageReference, source.checksumSha256 ?? "");
  await audit(prisma, jacket, user, "DOCUMENT_OPENED", source.fileName);
  return { bytes, fileName: source.fileName, contentType: source.contentType ?? "application/octet-stream" };
}

export async function exportSalesDocumentPacket(actor: AuthenticatedUser | null, id: string, versionNumber: number, combined: boolean) {
  const user = requireSalesDocumentsUser(actor), jacket = await findJacket(id);
  const version = jacket.versions.find((item) => item.version === versionNumber);
  if (!version) throw new SalesDocumentsError("Choose a finalized packet version.", 404);
  const snapshot = version.snapshot as unknown as { documents: JacketDocument[] };
  const files: Record<string, Uint8Array> = { "packet-manifest.json": strToU8(JSON.stringify({ ...metadata(version.snapshot), finalizedAt: version.finalizedAt, finalizedBy: version.finalizedByUserId, version: version.version }, null, 2)) };
  const pdf = combined ? await PDFDocument.create() : null;
  for (const [index, doc] of snapshot.documents.entries()) {
    const source = await prisma.documentLibraryObjectVersion.findFirst({ where: { id: doc.versionId, organizationId: jacket.organizationId, documentId: doc.id } });
    if (!source || source.checksumSha256 !== doc.checksum) throw new SalesDocumentsError("The finalized document version could not be verified.", 409);
    const bytes = await storedBytes(source.storageReference, doc.checksum);
    files[`${index + 1}-${doc.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`] = bytes;
    if (pdf) {
      if (doc.contentType === "application/pdf") {
        const input = await PDFDocument.load(bytes);
        for (const page of await pdf.copyPages(input, input.getPageIndices())) pdf.addPage(page);
      } else if (["image/png", "image/jpeg"].includes(doc.contentType)) {
        const image = doc.contentType === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const scale = Math.min(540 / image.width, 720 / image.height), page = pdf.addPage([612, 792]);
        page.drawImage(image, { x: 36, y: 792 - 36 - image.height * scale, width: image.width * scale, height: image.height * scale });
      } else throw new SalesDocumentsError("This packet contains a document that cannot be merged into PDF. Download originals instead.");
    }
  }
  if (pdf && !pdf.getPageCount()) throw new SalesDocumentsError("No documents are available for a combined PDF.");
  await audit(prisma, jacket, user, "PACKET_DOWNLOADED", `Final packet version ${versionNumber}, ${combined ? "combined PDF" : "original documents"}.`);
  return { bytes: pdf ? await pdf.save() : zipSync(files), contentType: pdf ? "application/pdf" : "application/zip", fileName: `${jacket.dealNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}-v${versionNumber}.${pdf ? "pdf" : "zip"}` };
}

export async function archiveGeneratedSalesPacket(actor: AuthenticatedUser | null, raw: UnifiedCrmContractPacketInput & Record<string, unknown>, packet: UnifiedCrmContractPacketResult) {
  const user = requireSalesDocumentsUser(actor);
  const inferred: Record<string, string> = { BHPH: "bhph", LEASE_TO_OWN: "lease-to-own", DAILY_RENTAL: "daily-rental", VEHICLE_LOANER: "vehicle-loaner", TEST_DRIVE: "test-drive" };
  const pathway = text(raw.pathway) || inferred[text(raw.packetType)] || "retail-sale";
  const vehicle = raw.vehicle && typeof raw.vehicle === "object" ? raw.vehicle as Record<string, unknown> : {};
  const jacket = await createSalesDocumentJacket(user, { pathway, dealReference: text(raw.jacketReference) || packet.packetId, dealNumber: text(raw.dealNumber) || packet.packetNumber, customerName: text(raw.customerName) || "Customer not selected", customerId: raw.customerId, vehicleReference: text(raw.vehicleReference) || text(vehicle.vin) || text(vehicle.stockNumber) || [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle not assigned", vin: vehicle.vin, stockNumber: vehicle.stockNumber });
  for (const doc of packet.documents) await saveSalesDocument(user, jacket.id, { bytes: doc.contentBase64 ? Buffer.from(doc.contentBase64, "base64") : Buffer.from(doc.html), contentType: doc.contentType ?? "text/html", fileName: doc.downloadFileName, documentType: doc.formId, generated: true });
  const result = { ...packet, jacketId: jacket.id, salesDocumentsHref: `/sales-documents?jacketId=${encodeURIComponent(jacket.id)}` };
  await prisma.salesDocumentGeneratedPacket.create({ data: { id: packet.packetId, jacketId: jacket.id, payload: json(result) } });
  return result;
}

export async function readArchivedSalesPacket(actor: AuthenticatedUser | null, packetId: string) {
  requireSalesDocumentsUser(actor);
  const packet = await prisma.salesDocumentGeneratedPacket.findFirst({ where: { id: packetId, jacket: { organizationId: organization() } } });
  if (!packet) throw new SalesDocumentsError("Saved contract packet was not found.", 404);
  return packet.payload as unknown as UnifiedCrmContractPacketResult;
}
