import { describe, expect, it } from "vitest";

import { stageDocumentLibraryUpload } from "@/server/document-library/upload-service";

const staff = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "advisor@example.test",
  id: "staff-1",
  isActive: true,
  name: "Advisor",
  roles: ["Service Advisor"]
};

describe("document library upload service", () => {
  it("stages a validated internal storage reference", async () => {
    await expect(stageDocumentLibraryUpload(staff, {
      checksumSha256: "abc123",
      contentType: "application/pdf",
      fileName: "authorization.pdf",
      sizeBytes: 1024
    })).resolves.toMatchObject({
      stagedBy: "staff-1",
      storageDraft: {
        checksumSha256: "abc123",
        contentType: "application/pdf",
        provider: "INTERNAL",
        reference: "internal://documents/staged/abc123/authorization.pdf",
        version: 1
      },
      validation: {
        accepted: true
      }
    });
  });

  it("rejects unsafe upload metadata before staging", async () => {
    await expect(stageDocumentLibraryUpload(staff, {
      contentType: "application/x-msdownload",
      fileName: "../bad.exe",
      sizeBytes: Number.NaN
    })).rejects.toMatchObject({
      code: "DOCUMENT_LIBRARY_INVALID_ACTION"
    });
  });

  it("requires document workflow access", async () => {
    await expect(stageDocumentLibraryUpload({
      ...staff,
      roles: ["Mechanic"]
    }, {
      contentType: "application/pdf",
      fileName: "authorization.pdf",
      sizeBytes: 1024
    })).rejects.toMatchObject({
      code: "DOCUMENT_LIBRARY_NOT_AUTHORIZED"
    });
  });
});
