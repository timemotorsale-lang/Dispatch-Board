import { describe, expect, it } from "vitest";

import type { DocumentRecord, PacketRecord } from "@/server/document-library/domain";
import {
  buildDocumentLibraryPersistencePlan,
  buildDocumentStorageRolloutEvidence,
  buildProviderWriteConfirmation,
  createObjectVersionRecord,
  defaultDocumentPacketTemplates,
  resolveDocumentStoragePermissionEvidence,
  validateDocumentUpload
} from "@/server/document-library/storage-platform";
import type { DocumentLibraryState } from "@/server/document-library/repository";
import { evaluateDocumentStorageReleaseGate } from "@/server/document-library/storage-rollout";

const manager = {
  duties: { all: ["Document workflow"], direct: [], roleDefaults: [] },
  email: "manager@example.test",
  id: "manager-1",
  isActive: true,
  name: "Manager",
  roles: ["General Manager"]
};

const owner = { id: "claim-1", label: "Claim #1", type: "CLAIM" } as const;

function document(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    auditTrail: [],
    createdAt: "2026-09-22T00:00:00.000Z",
    documentType: "CUSTOMER_AUTHORIZATION",
    fileName: "authorization.pdf",
    id: "doc-1",
    legalHold: false,
    owner,
    providerReferences: [{
      externalId: "box:file:doc-1",
      family: "STORAGE",
      health: "READY_REVIEW",
      lastVerifiedAt: null,
      provider: "Box",
      readOnly: true,
      url: null
    }],
    retentionCategory: "CUSTOMER_AUTHORIZATION",
    sensitivity: "RESTRICTED",
    source: "MANUAL_UPLOAD",
    status: "ACCEPTED",
    storage: { provider: "INTERNAL", reference: "internal://doc-1", version: 1 },
    ...overrides
  };
}

function packet(overrides: Partial<PacketRecord> = {}): PacketRecord {
  return {
    documents: ["doc-1"],
    id: "packet-1",
    owner,
    packetType: "CLAIM_PACKET",
    requirements: [{ documentType: "CUSTOMER_AUTHORIZATION", id: "req-1", label: "Customer authorization", required: true }],
    title: "Claim Packet",
    workflow: "CLAIMS",
    ...overrides
  };
}

function state(overrides: Partial<DocumentLibraryState> = {}): DocumentLibraryState {
  return {
    auditEvents: [{
      action: "DOCUMENT_CREATED",
      actorId: "manager-1",
      at: "2026-09-22T00:00:00.000Z",
      idempotencyKey: "seed-doc-1",
      note: "Seeded document.",
      subjectId: "doc-1"
    }],
    documents: [document()],
    idempotencyKeys: ["seed-doc-1"],
    packets: [packet()],
    ...overrides
  };
}

describe("document library storage platform", () => {
  it("validates uploads before a document can be released to storage", () => {
    expect(validateDocumentUpload({
      checksumSha256: "abc123",
      contentType: "application/pdf",
      fileName: "customer-authorization.pdf",
      sizeBytes: 4096
    })).toMatchObject({
      accepted: true,
      blockers: []
    });

    expect(validateDocumentUpload({
      contentType: "application/x-msdownload",
      fileName: "../bad.exe",
      sizeBytes: 30 * 1024 * 1024
    })).toMatchObject({
      accepted: false,
      blockers: expect.arrayContaining([
        "File name cannot include path separators.",
        "File type is not allowed for document storage.",
        "File exceeds the 25 MB document limit."
      ])
    });
  });

  it("creates immutable object version records for replacement uploads", () => {
    expect(createObjectVersionRecord({
      actorId: "manager-1",
      document: document(),
      now: new Date("2026-09-22T12:00:00.000Z"),
      organizationId: "org-1",
      storageReference: "internal://doc-1/v2",
      upload: {
        checksumSha256: "version-2-checksum",
        contentType: "application/pdf",
        fileName: "authorization-v2.pdf",
        sizeBytes: 2048
      }
    })).toMatchObject({
      checksumSha256: "version-2-checksum",
      createdByUserId: "manager-1",
      documentId: "doc-1",
      storageReference: "internal://doc-1/v2",
      version: 2
    });
  });

  it("ships packet templates for claim, title, and vendor workflows", () => {
    expect(defaultDocumentPacketTemplates.map((template) => template.templateKey)).toEqual([
      "claims.standard",
      "title.standard",
      "vendor.onboarding"
    ]);
    expect(defaultDocumentPacketTemplates.flatMap((template) => template.requirements).filter((requirement) => requirement.required)).toHaveLength(10);
    expect(defaultDocumentPacketTemplates.find((template) => template.templateKey === "claims.standard")?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ documentType: "INSURANCE_ESTIMATE", label: "Insurance estimate", required: true })
    ]));
  });

  it("keeps provider writes audited and held behind confirmation posture", () => {
    expect(buildProviderWriteConfirmation({
      action: "REQUEST_ESIGNATURE",
      idempotencyKey: "esign-1",
      subjectId: "doc-1"
    })).toMatchObject({
      state: "PREVIEW_ONLY"
    });

    expect(buildProviderWriteConfirmation({
      action: "REQUEST_ESIGNATURE",
      confirmationToken: "confirm:REQUEST_ESIGNATURE:doc-1",
      idempotencyKey: "esign-1",
      subjectId: "doc-1"
    })).toMatchObject({
      auditAction: "PROVIDER_REQUEST_ESIGNATURE_CONFIRMED",
      state: "CONFIRMED_WRITE_HELD_FOR_ADAPTER"
    });
  });

  it("maps the in-memory command state into durable persistence rows", () => {
    const plan = buildDocumentLibraryPersistencePlan(state());

    expect(plan.documents[0]).toMatchObject({
      id: "doc-1",
      ownerType: "CLAIM",
      storageProvider: "INTERNAL"
    });
    expect(plan.packets[0]).toMatchObject({
      status: "COMPLETE"
    });
    expect(plan.packetDocuments).toEqual([{ documentId: "doc-1", packetId: "packet-1", relationship: "REQUIRED" }]);
    expect(plan.providerReferences[0]).toMatchObject({ externalId: "box:file:doc-1", readOnly: true });
  });

  it("uses the document permission policy as release evidence", () => {
    const evidence = resolveDocumentStoragePermissionEvidence(manager);

    expect(evidence.canOpenLibrary).toBe(true);
    expect(evidence.restrictedView).toMatchObject({ allowed: true, auditRequired: true });
    expect(evidence.providerWrite).toMatchObject({ allowed: true, idempotencyRequired: true });
  });

  it("moves every milestone except the runtime repository flip to complete", () => {
    const evidence = buildDocumentStorageRolloutEvidence({
      actor: manager,
      durableRepositoryEnabled: false,
      state: state()
    });
    const gate = evaluateDocumentStorageReleaseGate(evidence);

    expect(gate.readyForRelease).toBe(false);
    expect(gate.blockers.map((blocker) => blocker.key)).toEqual(["DURABLE_REPOSITORY"]);

    expect(evaluateDocumentStorageReleaseGate({
      ...evidence,
      DURABLE_REPOSITORY: true
    }).readyForRelease).toBe(true);
  });
});
