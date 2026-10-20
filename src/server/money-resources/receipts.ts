import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { moneyAccess } from "./service";
import { MoneyError } from "@/lib/money-resources";

export async function moneyReceipt(actor: AuthenticatedUser | null, entryId: string) {
  const access = await moneyAccess(actor);
  const entry = await prisma.moneyEntry.findFirst({ where: { id: entryId, organizationId: access.organizationId, ...(!access.manager ? { employeeId: access.actor.id } : {}) }, include: { receiptDocument: true } });
  if (!entry) throw new MoneyError("This receipt is not available.", 404);
  return { access, entry };
}
export async function attachMoneyReceipt(actor: AuthenticatedUser | null, entryId: string, file: File) {
  const { access, entry } = await moneyReceipt(actor, entryId);
  if (entry.kind !== "EXPENSE" || entry.reconciledAt || entry.approvalStatus === "SUPERSEDED") throw new MoneyError("Attach receipts to the current unreconciled purchase. Ask management to review a reconciled or corrected record.");
  if (file.size < 1 || file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) throw new MoneyError("Attach a PDF, JPEG or PNG receipt up to 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = file.type === "application/pdf" ? Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-" : file.type === "image/png" ? Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!signature) throw new MoneyError("The receipt contents do not match the selected file type.");
  const storage = resolveDocumentStorageRuntimeFromEnv();
  if (!storage.adapter || !storage.readiness.readyForByteStorage) throw new MoneyError("Receipt storage is not configured. The spending is saved; attach the receipt when storage is available.", 503);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (entry.receiptDocument?.checksumSha256 === checksum) return { documentId: entry.receiptDocumentId, duplicate: true };
  const documentId = randomUUID();
  const stored = await storage.adapter.writeObject({ bytes, contentType: file.type, documentId, expectedChecksumSha256: checksum, fileName: file.name.slice(0, 160), organizationId: access.organizationId, owner: { id: entry.id, label: `Spending ${entry.id}`, type: "MONEY_ENTRY" }, version: 1 });
  return prisma.$transaction(async database => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`money:${access.organizationId}`}))`;
    const current = await database.moneyEntry.findUniqueOrThrow({ where: { id: entry.id } });
    if (current.version !== entry.version) throw new MoneyError("This record changed during upload. Review it and try again.", 409);
    await database.documentLibraryDocument.create({ data: { id: documentId, organizationId: access.organizationId, ownerType: "MONEY_ENTRY", ownerId: entry.id, ownerLabel: `Staff spending · ${entry.merchant || entry.purpose.slice(0, 60)}`, documentType: "EXPENSE_RECEIPT", fileName: stored.fileName, sensitivity: "RESTRICTED", source: "MANUAL_UPLOAD", retentionCategory: "FINANCIAL_RECORD", storageProvider: "INTERNAL", storageReference: stored.reference, checksumSha256: checksum, sizeBytes: stored.sizeBytes, contentType: file.type, createdByUserId: access.actor.id, updatedByUserId: access.actor.id, versions: { create: { organizationId: access.organizationId, version: 1, storageProvider: "INTERNAL", storageReference: stored.reference, fileName: stored.fileName, contentType: file.type, sizeBytes: stored.sizeBytes, checksumSha256: checksum, createdByUserId: access.actor.id } } } });
    await database.moneyEntry.update({ where: { id: entry.id }, data: { receiptDocumentId: documentId, approvalStatus: "PENDING", reviewedById: null, version: { increment: 1 } } });
    await database.moneyAudit.create({ data: { organizationId: access.organizationId, actorUserId: access.actor.id, action: "ATTACH_RECEIPT", subjectId: entry.id, idempotencyKey: `receipt:${documentId}`, requestHash: checksum, details: { previousDocumentId: entry.receiptDocumentId, documentId, checksum }, result: { documentId } } });
    await database.documentLibraryAuditEvent.create({ data: { organizationId: access.organizationId, documentId, subjectType: "DOCUMENT", subjectId: documentId, action: "EXPENSE_RECEIPT_ATTACHED", note: "Private receipt linked to the scoped money record.", actorUserId: access.actor.id, idempotencyKey: `money-receipt:${documentId}`, metadata: { moneyEntryId: entry.id } } });
    return { documentId };
  });
}
export async function readMoneyReceipt(actor: AuthenticatedUser | null, entryId: string) {
  const { access, entry } = await moneyReceipt(actor, entryId), document = entry.receiptDocument;
  if (!document || document.organizationId !== entry.organizationId) throw new MoneyError("No receipt has been attached.", 404);
  const storage = resolveDocumentStorageRuntimeFromEnv();
  if (!storage.localPrivateRoot || !document.storageReference.startsWith("local-private://")) throw new MoneyError("This storage provider needs its approved document download connection.", 503);
  const root = resolve(storage.localPrivateRoot), target = resolve(root, document.storageReference.slice("local-private://".length));
  if (!target.startsWith(root + sep)) throw new MoneyError("Receipt storage reference is invalid.", 403);
  const bytes = await readFile(target);
  if (createHash("sha256").update(bytes).digest("hex") !== document.checksumSha256) throw new MoneyError("Receipt verification failed. Ask management to review the stored file.", 409);
  await prisma.moneyAudit.create({ data: { organizationId: access.organizationId, actorUserId: access.actor.id, action: "VIEW_RECEIPT", subjectId: entry.id, idempotencyKey: `view:${randomUUID()}`, requestHash: document.checksumSha256!, details: { documentId: document.id }, result: { viewed: true } } });
  return { bytes, contentType: document.contentType || "application/octet-stream" };
}
