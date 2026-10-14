import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { authorizeDocumentObjectAccess } from "@/server/document-library/object-access";
import type { DocumentRecord } from "@/server/document-library/domain";

const manager: AuthenticatedUser = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "manager@example.test",
  id: "manager-1",
  isActive: true,
  name: "Manager",
  roles: ["General Manager"]
};

const advisor: AuthenticatedUser = {
  ...manager,
  id: "advisor-1",
  roles: ["Service Advisor"]
};

const document: DocumentRecord = {
  auditTrail: [],
  createdAt: "2026-09-22T00:00:00.000Z",
  documentType: "INSURANCE_ESTIMATE",
  fileName: "estimate.pdf",
  id: "doc-estimate-1",
  legalHold: false,
  owner: { id: "claim-1", label: "Claim #1", type: "CLAIM" },
  providerReferences: [],
  retentionCategory: "CLAIM_FILE",
  sensitivity: "CONFIDENTIAL",
  source: "MANUAL_UPLOAD",
  status: "RECEIVED",
  storage: { provider: "INTERNAL", reference: "local-private://documents/dealer/claim/claim-1/doc-estimate-1/v1/estimate.pdf", version: 1 }
};

describe("document object access", () => {
  it("allows elevated document staff to preview governed objects", () => {
    expect(authorizeDocumentObjectAccess({
      actor: manager,
      document,
      purpose: "PREVIEW"
    })).toMatchObject({
      allowed: true,
      auditRequired: true,
      reference: document.storage.reference
    });
  });

  it("blocks restricted object access for non-elevated document staff", () => {
    expect(authorizeDocumentObjectAccess({
      actor: advisor,
      document: { ...document, sensitivity: "RESTRICTED" },
      purpose: "DOWNLOAD"
    })).toMatchObject({
      allowed: false,
      blockers: ["ELEVATED_PERMISSION_REQUIRED"]
    });
  });

  it("fails closed when linked record access is missing", () => {
    expect(authorizeDocumentObjectAccess({
      actor: manager,
      document,
      linkedRecordAccess: false,
      purpose: "PREVIEW"
    })).toMatchObject({
      allowed: false,
      blockers: ["LINKED_RECORD_ACCESS_REQUIRED"]
    });
  });
});
