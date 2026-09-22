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
      context: {
        console: "CUSTOMER_WORKBENCH",
        ownerId: "customer-1",
        ownerLabel: "Customer One",
        reason: "Customer supplied authorization."
      },
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
      storagePolicy: {
        accepted: true,
        classification: {
          documentType: "CUSTOMER_AUTHORIZATION",
          retentionCategory: "CUSTOMER_FILE",
          sensitivity: "RESTRICTED",
          workflow: "CUSTOMER"
        },
        owner: {
          id: "customer-1",
          type: "CUSTOMER"
        }
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

  it("stages insurance claim estimates with the estimate document policy", async () => {
    await expect(stageDocumentLibraryUpload(staff, {
      checksumSha256: "estimate-checksum",
      contentType: "application/pdf",
      context: {
        console: "CLAIMS_WORKSPACE",
        ownerId: "claim-10421",
        ownerLabel: "Claim #CLM-10421",
        purpose: "Insurance claim estimate from carrier.",
        reason: "Carrier estimate received."
      },
      fileName: "insurance-estimate.pdf",
      sizeBytes: 4096
    })).resolves.toMatchObject({
      storagePolicy: {
        accepted: true,
        classification: {
          documentType: "INSURANCE_ESTIMATE",
          packetType: "CLAIM_PACKET",
          retentionCategory: "CLAIM_FILE",
          sensitivity: "CONFIDENTIAL",
          workflow: "CLAIMS"
        },
        owner: {
          id: "claim-10421",
          type: "CLAIM"
        }
      }
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
