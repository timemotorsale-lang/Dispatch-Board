import { describe, expect, it } from "vitest";

import type { DocumentRecord, PacketRecord } from "@/server/document-library/domain";
import { executeDocumentLibraryCommand, type DocumentLibraryState } from "@/server/document-library/repository";

const owner = { id: "claim-1", label: "Claim #1", type: "CLAIM" } as const;

function document(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    auditTrail: [],
    createdAt: "2026-09-20T00:00:00.000Z",
    documentType: "DAMAGE_PHOTOS",
    fileName: "damage-photos.zip",
    id: "doc-1",
    legalHold: false,
    owner,
    providerReferences: [],
    retentionCategory: "CLAIM_FILE",
    sensitivity: "CONFIDENTIAL",
    source: "CUSTOMER_PORTAL",
    status: "RECEIVED",
    storage: { provider: "EXTERNAL_LINK", reference: "https://storage.example.test/doc-1", version: 1 },
    ...overrides
  };
}

function packet(overrides: Partial<PacketRecord> = {}): PacketRecord {
  return {
    documents: ["doc-1"],
    id: "packet-1",
    owner,
    packetType: "CLAIM_PACKET",
    requirements: [{ documentType: "DAMAGE_PHOTOS", id: "req-damage-photos", label: "Damage photos", required: true }],
    title: "Claim Packet",
    workflow: "CLAIMS",
    ...overrides
  };
}

function state(overrides: Partial<DocumentLibraryState> = {}): DocumentLibraryState {
  return {
    auditEvents: [],
    documents: [document()],
    idempotencyKeys: [],
    packets: [packet()],
    ...overrides
  };
}

describe("document library command repository", () => {
  it("records audited review decisions and resolves linked packet requirements", () => {
    const result = executeDocumentLibraryCommand({
      actorId: "manager-1",
      command: {
        action: "REVIEW_DOCUMENT",
        decision: "ACCEPT",
        documentId: "doc-1",
        idempotencyKey: "review-doc-1"
      },
      now: new Date("2026-09-20T12:00:00.000Z"),
      state: state()
    });

    expect(result.document).toMatchObject({ id: "doc-1", status: "ACCEPTED" });
    expect(result.packet).toMatchObject({
      completion: { accepted: 1, required: 1 },
      status: "COMPLETE"
    });
    expect(result.auditEvent).toMatchObject({
      action: "DOCUMENT_REVIEW_ACCEPT",
      idempotencyKey: "review-doc-1",
      subjectId: "doc-1"
    });
  });

  it("rejects reused idempotency keys before mutating state", () => {
    expect(() => executeDocumentLibraryCommand({
      actorId: "manager-1",
      command: {
        action: "REVIEW_DOCUMENT",
        decision: "ACCEPT",
        documentId: "doc-1",
        idempotencyKey: "duplicate-key"
      },
      state: state({ idempotencyKeys: ["duplicate-key"] })
    })).toThrow("idempotency key was already used");
  });

  it("blocks archive when a document is linked to active packet work or under legal hold", () => {
    expect(() => executeDocumentLibraryCommand({
      actorId: "manager-1",
      command: {
        action: "ARCHIVE_DOCUMENT",
        documentId: "doc-1",
        idempotencyKey: "archive-linked-doc-1",
        reason: "Archive inactive evidence."
      },
      state: state()
    })).toThrow("active packet work");

    expect(() => executeDocumentLibraryCommand({
      actorId: "manager-1",
      command: {
        action: "ARCHIVE_DOCUMENT",
        documentId: "doc-2",
        idempotencyKey: "archive-held-doc-1",
        reason: "Archive inactive evidence."
      },
      state: state({
        documents: [document({ id: "doc-2", legalHold: true })],
        packets: []
      })
    })).toThrow("legal hold");
  });

  it("archives and restores unlinked documents without any destructive delete command", () => {
    const archived = executeDocumentLibraryCommand({
      actorId: "manager-1",
      command: {
        action: "ARCHIVE_DOCUMENT",
        documentId: "doc-1",
        idempotencyKey: "archive-unlinked-doc-1",
        reason: "Inactive duplicate evidence."
      },
      state: state({ packets: [] })
    });

    expect(archived.document).toMatchObject({ id: "doc-1", status: "ARCHIVED" });
    expect(archived.auditEvent.action).toBe("DOCUMENT_ARCHIVED");

    const restored = executeDocumentLibraryCommand({
      actorId: "manager-1",
      command: {
        action: "RESTORE_DOCUMENT",
        documentId: "doc-1",
        idempotencyKey: "restore-unlinked-doc-1",
        reason: "Needed for packet review."
      },
      state: archived.state
    });

    expect(restored.document).toMatchObject({ id: "doc-1", status: "RECEIVED" });
    expect(restored.state.documents).toHaveLength(1);
  });
});
