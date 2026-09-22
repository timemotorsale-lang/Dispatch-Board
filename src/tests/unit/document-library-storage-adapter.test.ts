import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  buildDocumentObjectKey,
  createCloudObjectStorageAdapter,
  createLocalPrivateDocumentStorageAdapter,
  sanitizeStorageSegment,
  sha256Hex
} from "@/server/document-library/storage-adapter";

const owner = {
  id: "Claim #10421/unsafe",
  label: "Claim #10421",
  type: "CLAIM" as const
};

const bytes = new TextEncoder().encode("estimate bytes");

describe("document library storage adapter", () => {
  it("sanitizes object key segments for private object storage", () => {
    expect(sanitizeStorageSegment("../../Claim 10421")).toBe("claim-10421");
    expect(buildDocumentObjectKey({
      documentId: "Doc Upload 1",
      fileName: "../Carrier Estimate.PDF",
      organizationId: "Dealer Group",
      owner,
      version: 2
    })).toBe("documents/dealer-group/claim/claim-10421-unsafe/doc-upload-1/v2/carrier-estimate.pdf");
  });

  it("writes uploaded bytes to local private storage with a stable object reference", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "dispatch-documents-"));
    const adapter = createLocalPrivateDocumentStorageAdapter({ rootDir });

    const result = await adapter.writeObject({
      bytes,
      contentType: "application/pdf",
      documentId: "doc-estimate-1",
      expectedChecksumSha256: sha256Hex(bytes),
      fileName: "carrier-estimate.pdf",
      organizationId: "dealer-1",
      owner,
      version: 1
    });

    expect(result).toMatchObject({
      checksumSha256: sha256Hex(bytes),
      objectKey: "documents/dealer-1/claim/claim-10421-unsafe/doc-estimate-1/v1/carrier-estimate.pdf",
      provider: "LOCAL_PRIVATE",
      reference: "local-private://documents/dealer-1/claim/claim-10421-unsafe/doc-estimate-1/v1/carrier-estimate.pdf"
    });
    await expect(readFile(join(rootDir, result.objectKey), "utf8")).resolves.toBe("estimate bytes");
  });

  it("rejects checksum mismatches before storage", async () => {
    const adapter = createLocalPrivateDocumentStorageAdapter({ rootDir: await mkdtemp(join(tmpdir(), "dispatch-documents-")) });

    await expect(adapter.writeObject({
      bytes,
      contentType: "application/pdf",
      documentId: "doc-estimate-1",
      expectedChecksumSha256: "wrong-checksum",
      fileName: "carrier-estimate.pdf",
      organizationId: "dealer-1",
      owner,
      version: 1
    })).rejects.toThrow("checksum");
  });

  it("hands cloud writes a provider-neutral key and checksum", async () => {
    const putObject = vi.fn(async () => ({ reference: "s3://dispatch-documents/doc-estimate-1" }));
    const adapter = createCloudObjectStorageAdapter({ putObject });

    const result = await adapter.writeObject({
      bytes,
      contentType: "application/pdf",
      documentId: "doc-estimate-1",
      fileName: "carrier-estimate.pdf",
      organizationId: "dealer-1",
      owner,
      version: 1
    });

    expect(putObject).toHaveBeenCalledWith(expect.objectContaining({
      checksumSha256: sha256Hex(bytes),
      contentType: "application/pdf",
      key: "documents/dealer-1/claim/claim-10421-unsafe/doc-estimate-1/v1/carrier-estimate.pdf"
    }));
    expect(result.reference).toBe("s3://dispatch-documents/doc-estimate-1");
  });
});
