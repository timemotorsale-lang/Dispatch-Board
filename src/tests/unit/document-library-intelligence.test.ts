import { describe, expect, it } from "vitest";

import { buildDocumentLibraryIntelligence } from "@/server/document-library/intelligence";
import type { DocumentRecord, PacketRecord } from "@/server/document-library/domain";
import type { DocumentLibraryState } from "@/server/document-library/repository";

const owner = { id: "claim-1", label: "Claim #1", type: "CLAIM" } as const;

function document(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    auditTrail: [],
    createdAt: "2026-09-22T00:00:00.000Z",
    documentType: "CUSTOMER_AUTHORIZATION",
    fileName: "authorization.pdf",
    id: "doc-authorization",
    legalHold: false,
    owner,
    providerReferences: [],
    retentionCategory: "CLAIM_FILE",
    sensitivity: "CONFIDENTIAL",
    source: "MANUAL_UPLOAD",
    status: "ACCEPTED",
    storage: { provider: "INTERNAL", reference: "internal://doc-authorization", version: 1 },
    ...overrides
  };
}

function packet(overrides: Partial<PacketRecord> = {}): PacketRecord {
  return {
    documents: ["doc-authorization", "doc-title"],
    id: "packet-1",
    owner,
    packetType: "CLAIM_PACKET",
    requirements: [
      { documentType: "CUSTOMER_AUTHORIZATION", id: "req-authorization", label: "Customer authorization", required: true },
      { documentType: "TITLE_DOCUMENT", id: "req-title", label: "Title document", required: true },
      { documentType: "DAMAGE_PHOTOS", id: "req-damage", label: "Damage photos", required: true }
    ],
    title: "Claim Packet",
    workflow: "CLAIMS",
    ...overrides
  };
}

function state(overrides: Partial<DocumentLibraryState> = {}): DocumentLibraryState {
  return {
    auditEvents: [],
    documents: [
      document(),
      document({
        documentType: "TITLE_DOCUMENT",
        fileName: "title.pdf",
        id: "doc-title",
        legalHold: true,
        retentionCategory: "TITLE_AND_LEGAL",
        sensitivity: "RESTRICTED"
      }),
      document({
        documentType: "CUSTOMER_AUTHORIZATION",
        fileName: "authorization-copy.pdf",
        id: "doc-duplicate",
        providerReferences: [{
          externalId: "dms:auth:1",
          family: "DMS",
          health: "READY_REVIEW",
          lastVerifiedAt: null,
          provider: "DMS",
          readOnly: true,
          url: null
        }]
      })
    ],
    idempotencyKeys: [],
    packets: [packet()],
    ...overrides
  };
}

describe("document library intelligence", () => {
  it("prioritizes legal holds, missing requirements, provider reconciliation, duplicates, and archive candidates", () => {
    const intelligence = buildDocumentLibraryIntelligence(state());

    expect(intelligence.generatedBy).toBe("document-library.intelligence/v1");
    expect(intelligence.score).toBeLessThan(60);
    expect(intelligence.summary).toContain("focused intervention");
    expect(intelligence.recommendations.map((item) => item.kind)).toEqual(expect.arrayContaining([
      "LEGAL_HOLD_BLOCKER",
      "MISSING_REQUIREMENT",
      "PROVIDER_REFERENCE_STALE",
      "DUPLICATE_CANDIDATE",
      "ARCHIVE_READY"
    ]));
    expect(intelligence.recommendations[0]).toMatchObject({
      actionLabel: "Open hold",
      priority: "CRITICAL",
      targetDocumentId: "doc-title"
    });
  });

  it("recognizes complete packets as handoff-ready intelligence", () => {
    const intelligence = buildDocumentLibraryIntelligence(state({
      documents: [document()],
      packets: [packet({
        documents: ["doc-authorization"],
        requirements: [{ documentType: "CUSTOMER_AUTHORIZATION", id: "req-authorization", label: "Customer authorization", required: true }]
      })]
    }));

    expect(intelligence.recommendations).toEqual([
      expect.objectContaining({
        actionLabel: "Preview export",
        kind: "PACKET_HANDOFF_READY",
        targetPacketId: "packet-1"
      })
    ]);
    expect(intelligence.score).toBe(100);
  });
});
