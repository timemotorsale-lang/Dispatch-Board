import type { AuthenticatedUser } from "@/server/auth/store";
import { canOpenDocumentLibrary } from "@/server/document-library/permission-policy";

import { DOCUMENT_LIBRARY_CONTRACT_VERSION, DocumentLibraryError } from "./domain";
import type { DocumentObjectStorageAdapter } from "./storage-adapter";
import { resolveDocumentStoragePolicy, type DispatchDocumentStorageContext } from "./storage-policy";
import { validateDocumentUpload, type DocumentUploadCandidate } from "./storage-platform";

export type DocumentLibraryUploadDependencies = {
  documentIdFactory?: () => string;
  organizationId?: string;
  storageAdapter?: DocumentObjectStorageAdapter;
  version?: number;
};

function requireUploadAccess(actor: AuthenticatedUser | null) {
  if (!actor) throw new DocumentLibraryError("AUTHENTICATION_REQUIRED", "Sign in before staging document uploads.");
  if (!canOpenDocumentLibrary(actor)) throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_AUTHORIZED", "Document upload staging requires document workflow access.");
  return actor;
}

function stringField(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function numberField(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

function bytesField(input: Record<string, unknown>) {
  const value = input.bytes;
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return Uint8Array.from(value);
  }
  return null;
}

function parseUploadCandidate(value: unknown): DocumentUploadCandidate {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const bytes = bytesField(input);
  return {
    checksumSha256: stringField(input, "checksumSha256") || undefined,
    contentType: stringField(input, "contentType"),
    fileName: stringField(input, "fileName"),
    sizeBytes: Number.isFinite(numberField(input, "sizeBytes")) ? numberField(input, "sizeBytes") : bytes?.byteLength ?? Number.NaN
  };
}

function parseStorageContext(value: unknown): DispatchDocumentStorageContext {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const context = input.context && typeof input.context === "object" ? input.context as Record<string, unknown> : input;
  return {
    console: (stringField(context, "console") || "DOCUMENT_LIBRARY") as DispatchDocumentStorageContext["console"],
    documentType: stringField(context, "documentType") || stringField(input, "documentType") || undefined,
    intent: stringField(context, "intent") as DispatchDocumentStorageContext["intent"] || undefined,
    ownerId: stringField(context, "ownerId") || undefined,
    ownerLabel: stringField(context, "ownerLabel") || undefined,
    ownerType: stringField(context, "ownerType") as DispatchDocumentStorageContext["ownerType"] || undefined,
    packetId: stringField(context, "packetId") || undefined,
    purpose: stringField(context, "purpose") || undefined,
    reason: stringField(context, "reason") || stringField(input, "reason") || undefined
  };
}

export async function stageDocumentLibraryUpload(
  actor: AuthenticatedUser | null,
  value: unknown,
  dependencies: DocumentLibraryUploadDependencies = {}
) {
  const user = requireUploadAccess(actor);
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const bytes = bytesField(input);
  const candidate = parseUploadCandidate(value);
  const validation = validateDocumentUpload(candidate);
  if (!validation.accepted) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", validation.blockers.join(" "));
  }
  const checksum = candidate.checksumSha256 ?? "checksum-pending";
  const storagePolicy = resolveDocumentStoragePolicy({
    context: parseStorageContext(value),
    upload: candidate
  });
  if (dependencies.storageAdapter && !bytes) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document bytes are required for storage.");
  }
  if (dependencies.storageAdapter && !storagePolicy.accepted) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", storagePolicy.blockers.join(" "));
  }
  const version = dependencies.version ?? 1;
  const storedObject = dependencies.storageAdapter && bytes
    ? await dependencies.storageAdapter.writeObject({
      bytes,
      contentType: validation.normalized.contentType,
      documentId: dependencies.documentIdFactory?.() ?? `doc-upload-${checksum.slice(0, 12)}`,
      expectedChecksumSha256: candidate.checksumSha256,
      fileName: validation.normalized.fileName,
      organizationId: dependencies.organizationId ?? "default-org",
      owner: storagePolicy.owner,
      version
    })
    : null;

  return {
    contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
    stagedBy: user.id,
    storedObject,
    storageDraft: {
      checksumSha256: checksum,
      contentType: validation.normalized.contentType,
      fileName: validation.normalized.fileName,
      provider: "INTERNAL" as const,
      reference: storedObject?.reference ?? `internal://documents/staged/${checksum}/${encodeURIComponent(validation.normalized.fileName)}`,
      sizeBytes: validation.normalized.sizeBytes,
      version
    },
    storagePolicy,
    validation
  };
}
