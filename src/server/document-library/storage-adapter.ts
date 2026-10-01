import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, normalize, resolve } from "node:path";

import { DocumentLibraryError } from "./domain";
import type { DocumentRecord } from "./domain";

export type DocumentStorageProviderKind = "LOCAL_PRIVATE" | "CLOUD_OBJECT";

export type DocumentObjectWriteInput = {
  bytes: Uint8Array;
  contentType: string;
  documentId: string;
  expectedChecksumSha256?: string;
  fileName: string;
  organizationId: string;
  owner: DocumentRecord["owner"];
  version: number;
};

export type DocumentObjectWriteResult = {
  checksumSha256: string;
  contentType: string;
  fileName: string;
  objectKey: string;
  provider: DocumentStorageProviderKind;
  reference: string;
  sizeBytes: number;
  version: number;
};

export type DocumentObjectStorageAdapter = {
  provider: DocumentStorageProviderKind;
  writeObject(input: DocumentObjectWriteInput): Promise<DocumentObjectWriteResult>;
};

export type CloudObjectPutInput = {
  body: Uint8Array;
  checksumSha256: string;
  contentType: string;
  key: string;
};

export type CloudObjectPutResult = {
  reference?: string;
};

const fallbackSegment = "unassigned";

export function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sanitizeStorageSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/\.+/g, ".")
    .replace(/^[.-]+/g, "")
    .replace(/^-+|-+$/g, "");
  return normalized && normalized !== "." && normalized !== ".." ? normalized : fallbackSegment;
}

export function buildDocumentObjectKey(input: Omit<DocumentObjectWriteInput, "bytes" | "contentType" | "expectedChecksumSha256">) {
  const fileName = sanitizeStorageSegment(input.fileName);
  return [
    "documents",
    sanitizeStorageSegment(input.organizationId),
    sanitizeStorageSegment(input.owner.type),
    sanitizeStorageSegment(input.owner.id),
    sanitizeStorageSegment(input.documentId),
    `v${Math.max(1, input.version)}`,
    fileName
  ].join("/");
}

function verifyChecksum(input: DocumentObjectWriteInput) {
  const checksumSha256 = sha256Hex(input.bytes);
  if (input.expectedChecksumSha256 && input.expectedChecksumSha256 !== checksumSha256) {
    throw new Error("Document checksum does not match the uploaded bytes.");
  }
  return checksumSha256;
}

function assertInsideRoot(rootDir: string, objectKey: string) {
  const root = resolve(rootDir);
  const target = resolve(root, normalize(objectKey));
  if (target !== root && !target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    throw new Error("Document object key resolved outside the configured storage root.");
  }
  return target;
}

export function createLocalPrivateDocumentStorageAdapter(input: {
  rootDir: string;
}): DocumentObjectStorageAdapter {
  return {
    provider: "LOCAL_PRIVATE",
    async writeObject(writeInput) {
      const checksumSha256 = verifyChecksum(writeInput);
      const objectKey = buildDocumentObjectKey(writeInput);
      const targetPath = assertInsideRoot(input.rootDir, objectKey);
      try {
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, writeInput.bytes);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown storage write failure.";
        throw new DocumentLibraryError(
          "DOCUMENT_LIBRARY_STORAGE_UNAVAILABLE",
          `Document storage is not writable at the configured local private root: ${message}`,
          true
        );
      }
      return {
        checksumSha256,
        contentType: writeInput.contentType,
        fileName: writeInput.fileName,
        objectKey,
        provider: "LOCAL_PRIVATE",
        reference: `local-private://${objectKey}`,
        sizeBytes: writeInput.bytes.byteLength,
        version: writeInput.version
      };
    }
  };
}

export function createCloudObjectStorageAdapter(input: {
  putObject: (object: CloudObjectPutInput) => Promise<CloudObjectPutResult | void>;
}): DocumentObjectStorageAdapter {
  return {
    provider: "CLOUD_OBJECT",
    async writeObject(writeInput) {
      const checksumSha256 = verifyChecksum(writeInput);
      const objectKey = buildDocumentObjectKey(writeInput);
      const result = await input.putObject({
        body: writeInput.bytes,
        checksumSha256,
        contentType: writeInput.contentType,
        key: objectKey
      });
      return {
        checksumSha256,
        contentType: writeInput.contentType,
        fileName: writeInput.fileName,
        objectKey,
        provider: "CLOUD_OBJECT",
        reference: result?.reference ?? `cloud-object://${objectKey}`,
        sizeBytes: writeInput.bytes.byteLength,
        version: writeInput.version
      };
    }
  };
}
