/**
 * Stores Collections files (import files, bankruptcy papers, insurance proof, letters) as
 * RESTRICTED Document Library documents. Files are private and never served publicly.
 */
import { createHash, randomUUID } from "node:crypto";

import { prisma } from "@/server/db/client";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";

import { CollectionsError } from "../config/permissions";

export const COLLECTIONS_UPLOAD_TYPES: Record<string, (bytes: Uint8Array) => boolean> = {
  "application/pdf": bytes => Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-",
  "image/png": bytes => Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": bytes => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
};

export function isStorageReady() {
  const storage = resolveDocumentStorageRuntimeFromEnv();
  return Boolean(storage.adapter && storage.readiness.readyForByteStorage);
}

export async function storeRestrictedDocument(input: {
  organizationId: string;
  actorId: string;
  ownerType: "COLLECTIONS_IMPORT" | "COLLECTION_ACCOUNT";
  ownerId: string;
  ownerLabel: string;
  documentType: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
  retentionCategory?: string;
}) {
  const storage = resolveDocumentStorageRuntimeFromEnv();
  if (!storage.adapter || !storage.readiness.readyForByteStorage) {
    throw new CollectionsError("Private document storage isn't set up on this server yet, so the file can't be saved. Ask whoever manages the server to configure Document Library storage.", 503);
  }
  const checksum = createHash("sha256").update(input.bytes).digest("hex");
  const documentId = randomUUID();
  const fileName = input.fileName.trim().slice(0, 160) || "document";
  const stored = await storage.adapter.writeObject({
    bytes: input.bytes, contentType: input.contentType, documentId, expectedChecksumSha256: checksum, fileName,
    organizationId: input.organizationId,
    // The storage owner type is only used as a folder name; Collections keeps its own types.
    owner: { id: input.ownerId, label: input.ownerLabel, type: input.ownerType } as never,
    version: 1
  });
  await prisma.documentLibraryDocument.create({
    data: {
      id: documentId, organizationId: input.organizationId, ownerType: input.ownerType, ownerId: input.ownerId, ownerLabel: input.ownerLabel,
      documentType: input.documentType, fileName: stored.fileName, sensitivity: "RESTRICTED", source: "MANUAL_UPLOAD",
      retentionCategory: input.retentionCategory ?? "FINANCIAL_RECORD", storageProvider: "INTERNAL", storageReference: stored.reference,
      checksumSha256: checksum, sizeBytes: stored.sizeBytes, contentType: input.contentType, createdByUserId: input.actorId, updatedByUserId: input.actorId,
      versions: { create: { organizationId: input.organizationId, version: 1, storageProvider: "INTERNAL", storageReference: stored.reference, fileName: stored.fileName, contentType: input.contentType, sizeBytes: stored.sizeBytes, checksumSha256: checksum, createdByUserId: input.actorId } }
    }
  });
  return { documentId, checksum };
}

/** Validates an uploaded proof/letter file: PDF, PNG or JPEG, up to 10 MB, contents match the type. */
export async function readUploadedProof(file: File) {
  const checker = COLLECTIONS_UPLOAD_TYPES[file.type];
  if (!checker || file.size < 1 || file.size > 10 * 1024 * 1024) throw new CollectionsError("Attach a PDF, JPEG or PNG file up to 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!checker(bytes)) throw new CollectionsError("The file contents don't match its type. Save it again as PDF, JPEG or PNG.");
  return { bytes, contentType: file.type, fileName: file.name };
}

export async function assertAccountDocument(organizationId: string, accountId: string, documentId: string) {
  const document = await prisma.documentLibraryDocument.findFirst({ where: { id: documentId, organizationId, ownerType: "COLLECTION_ACCOUNT", ownerId: accountId }, select: { id: true } });
  if (!document) throw new CollectionsError("Upload the supporting document to this account first.");
  return document.id;
}
