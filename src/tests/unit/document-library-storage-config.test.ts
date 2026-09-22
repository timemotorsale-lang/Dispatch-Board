import { describe, expect, it } from "vitest";

import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";

describe("document library storage config", () => {
  it("enables local private byte storage when a private root is configured", () => {
    const runtime = resolveDocumentStorageRuntimeFromEnv({
      DOCUMENT_LIBRARY_LOCAL_STORAGE_ROOT: "C:/dispatch-documents",
      DOCUMENT_LIBRARY_ORGANIZATION_ID: "dealer-1"
    });

    expect(runtime.organizationId).toBe("dealer-1");
    expect(runtime.adapter?.provider).toBe("LOCAL_PRIVATE");
    expect(runtime.readiness).toMatchObject({
      mode: "LOCAL_PRIVATE",
      readyForByteStorage: true
    });
  });

  it("reports cloud configuration blockers without pretending a provider client exists", () => {
    const runtime = resolveDocumentStorageRuntimeFromEnv({
      DOCUMENT_LIBRARY_CLOUD_PROVIDER: "s3",
      DOCUMENT_LIBRARY_ORGANIZATION_ID: "dealer-1"
    });

    expect(runtime.adapter).toBeUndefined();
    expect(runtime.readiness).toMatchObject({
      cloudProvider: "S3",
      mode: "CLOUD_OBJECT_CONFIGURED",
      readyForByteStorage: false
    });
    expect(runtime.readiness.blockers).toContain("DOCUMENT_LIBRARY_CLOUD_BUCKET is required for cloud object storage.");
  });

  it("falls back to staging-only mode when no byte storage is configured", () => {
    const runtime = resolveDocumentStorageRuntimeFromEnv({});

    expect(runtime.adapter).toBeUndefined();
    expect(runtime.readiness).toMatchObject({
      mode: "STAGING_ONLY",
      readyForByteStorage: false
    });
  });
});
