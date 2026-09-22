import { describe, expect, it } from "vitest";

import { resolveDocumentStoragePolicy } from "@/server/document-library/storage-policy";

const upload = {
  checksumSha256: "abc123",
  contentType: "application/pdf",
  fileName: "customer-authorization.pdf",
  sizeBytes: 1024
};

describe("document storage policy", () => {
  it("classifies claim evidence into claim packet storage with confidential retention", () => {
    expect(resolveDocumentStoragePolicy({
      context: {
        console: "CLAIMS_WORKSPACE",
        ownerId: "claim-10421",
        ownerLabel: "Claim #CLM-10421",
        purpose: "Customer uploaded damage photos for insurance claim.",
        reason: "Customer portal claim evidence."
      },
      upload: { ...upload, fileName: "damage-photos.zip", contentType: "application/zip" }
    })).toMatchObject({
      accepted: true,
      classification: {
        documentType: "DAMAGE_PHOTOS",
        packetType: "CLAIM_PACKET",
        retentionCategory: "CLAIM_FILE",
        sensitivity: "CONFIDENTIAL",
        workflow: "CLAIMS"
      },
      owner: {
        id: "claim-10421",
        type: "CLAIM"
      }
    });
  });

  it("classifies insurance claim estimates as their own claim packet document type", () => {
    expect(resolveDocumentStoragePolicy({
      context: {
        console: "CLAIMS_WORKSPACE",
        ownerId: "claim-10421",
        ownerLabel: "Claim #CLM-10421",
        purpose: "Insurance claim estimate from carrier.",
        reason: "Carrier estimate received for the claim file."
      },
      upload: { ...upload, fileName: "insurance-estimate.pdf" }
    })).toMatchObject({
      accepted: true,
      classification: {
        documentType: "INSURANCE_ESTIMATE",
        packetType: "CLAIM_PACKET",
        retentionCategory: "CLAIM_FILE",
        sensitivity: "CONFIDENTIAL",
        workflow: "CLAIMS"
      }
    });
  });

  it("routes sale and finance documents as restricted deal jacket records", () => {
    expect(resolveDocumentStoragePolicy({
      context: {
        console: "DEAL_JACKET",
        ownerId: "sale-1",
        ownerLabel: "Sale #1",
        purpose: "Funding proof from lender.",
        reason: "Funding packet evidence."
      },
      upload: { ...upload, fileName: "funding-proof.pdf" }
    })).toMatchObject({
      classification: {
        documentType: "PAYMENT_PROOF",
        packetType: "SALE_PACKET",
        retentionCategory: "SALE_AND_FINANCE",
        sensitivity: "RESTRICTED",
        workflow: "SALE_FINANCE"
      },
      owner: {
        type: "SALE"
      }
    });
  });

  it("routes title and inventory documents into title legal retention", () => {
    expect(resolveDocumentStoragePolicy({
      context: {
        console: "INVENTORY_CONSOLE",
        ownerId: "vehicle-1",
        ownerLabel: "2018 Toyota Camry",
        purpose: "Title document received.",
        reason: "DMV title packet."
      },
      upload: { ...upload, fileName: "title-scan.pdf" }
    })).toMatchObject({
      classification: {
        documentType: "TITLE_DOCUMENT",
        packetType: "TITLE_PACKET",
        retentionCategory: "TITLE_AND_LEGAL",
        sensitivity: "RESTRICTED",
        workflow: "TITLE"
      },
      owner: {
        type: "VEHICLE"
      }
    });
  });

  it("blocks release when owner or business reason is missing even if upload metadata is valid", () => {
    const decision = resolveDocumentStoragePolicy({
      context: {
        console: "CRM_CONSOLE"
      },
      upload
    });

    expect(decision.accepted).toBe(false);
    expect(decision.blockers).toEqual(expect.arrayContaining([
      "Document owner id is required before storage.",
      "Document owner label is required before storage.",
      "Document storage requires a business reason."
    ]));
  });

  it("rejects unsafe upload metadata inside the storage policy decision", () => {
    expect(resolveDocumentStoragePolicy({
      context: {
        console: "VENDOR_CONSOLE",
        ownerId: "vendor-1",
        ownerLabel: "ABC Vendor",
        reason: "Vendor onboarding."
      },
      upload: {
        contentType: "application/x-msdownload",
        fileName: "../bad.exe",
        sizeBytes: Number.NaN
      }
    })).toMatchObject({
      accepted: false,
      blockers: expect.arrayContaining([
        "File name cannot include path separators.",
        "File type is not allowed for document storage.",
        "File must not be empty."
      ])
    });
  });
});
