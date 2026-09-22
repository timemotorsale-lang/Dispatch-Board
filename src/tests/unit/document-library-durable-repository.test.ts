import { describe, expect, it } from "vitest";

import {
  createDocumentLibraryDurableRepository,
  isDocumentLibraryDurableRepositoryEnabled,
  type DocumentLibraryDurableDatabase
} from "@/server/document-library/durable-repository";
import type { DocumentRecord, PacketRecord } from "@/server/document-library/domain";
import type { DocumentLibraryState } from "@/server/document-library/repository";

const owner = { id: "claim-1", label: "Claim #1", type: "CLAIM" } as const;

function delegate() {
  return {
    createManyCalls: [] as unknown[],
    deleteManyCalls: [] as unknown[],
    upsertCalls: [] as unknown[],
    async createMany(input: unknown) {
      this.createManyCalls.push(input);
      return { count: Array.isArray((input as { data?: unknown[] }).data) ? (input as { data: unknown[] }).data.length : 0 };
    },
    async deleteMany(input: unknown) {
      this.deleteManyCalls.push(input);
      return { count: 0 };
    },
    async upsert(input: unknown) {
      this.upsertCalls.push(input);
      return input;
    }
  };
}

function fakeDatabase() {
  const db = {
    documentLibraryAuditEvent: delegate(),
    documentLibraryDocument: delegate(),
    documentLibraryPacket: delegate(),
    documentLibraryPacketDocument: delegate(),
    documentLibraryPacketRequirement: delegate(),
    documentLibraryPacketTemplate: delegate(),
    documentLibraryProviderReference: delegate(),
    documentLibraryReleaseGate: delegate(),
    transactionCount: 0,
    async $transaction<T>(callback: (tx: DocumentLibraryDurableDatabase) => Promise<T>) {
      this.transactionCount += 1;
      return callback(this as unknown as DocumentLibraryDurableDatabase);
    }
  };
  return db;
}

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
    retentionCategory: "CLAIM_FILE",
    sensitivity: "CONFIDENTIAL",
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
      idempotencyKey: "create-doc-1",
      note: "Customer portal upload.",
      subjectId: "doc-1"
    }],
    documents: [document()],
    idempotencyKeys: ["create-doc-1"],
    packets: [packet()],
    ...overrides
  };
}

describe("document library durable repository", () => {
  it("keeps durable storage behind an explicit rollout switch", () => {
    expect(isDocumentLibraryDurableRepositoryEnabled({ DOCUMENT_LIBRARY_DURABLE_REPOSITORY_ENABLED: undefined })).toBe(false);
    expect(isDocumentLibraryDurableRepositoryEnabled({ DOCUMENT_LIBRARY_DURABLE_REPOSITORY_ENABLED: "false" })).toBe(false);
    expect(isDocumentLibraryDurableRepositoryEnabled({ DOCUMENT_LIBRARY_DURABLE_REPOSITORY_ENABLED: "true" })).toBe(true);
  });

  it("persists a document library snapshot into durable storage tables", async () => {
    const database = fakeDatabase();
    const repository = createDocumentLibraryDurableRepository({
      database: database as unknown as DocumentLibraryDurableDatabase,
      now: () => new Date("2026-09-22T12:00:00.000Z"),
      organizationId: "org-1"
    });

    await expect(repository.persistSnapshot({ state: state() })).resolves.toEqual({
      auditEvents: 1,
      documents: 1,
      packetDocuments: 1,
      packetRequirements: 1,
      packets: 1,
      providerReferences: 1
    });

    expect(database.transactionCount).toBe(1);
    expect(database.documentLibraryDocument.upsertCalls).toHaveLength(1);
    expect(database.documentLibraryPacket.upsertCalls).toHaveLength(1);
    expect(database.documentLibraryPacketRequirement.createManyCalls[0]).toMatchObject({
      data: [expect.objectContaining({ documentType: "CUSTOMER_AUTHORIZATION", status: "ACCEPTED" })],
      skipDuplicates: true
    });
    expect(database.documentLibraryAuditEvent.createManyCalls[0]).toMatchObject({
      data: [expect.objectContaining({ action: "DOCUMENT_CREATED", idempotencyKey: "create-doc-1" })]
    });
  });

  it("seeds enterprise packet templates and records release gate evidence", async () => {
    const database = fakeDatabase();
    const repository = createDocumentLibraryDurableRepository({
      database: database as unknown as DocumentLibraryDurableDatabase,
      organizationId: "org-1"
    });

    await expect(repository.seedPacketTemplates({ actorId: "manager-1" })).resolves.toEqual({ templates: 3 });
    expect(database.documentLibraryPacketTemplate.upsertCalls).toHaveLength(3);

    await expect(repository.persistReleaseGate({
      evaluatedByUserId: "manager-1",
      evidence: {
        AUDIT_LEDGER: true,
        DURABLE_REPOSITORY: true,
        OBJECT_VERSIONING: true,
        PACKET_TEMPLATES: true,
        PERMISSION_ENFORCEMENT: true,
        PRISMA_SCHEMA: true,
        PROVIDER_ADAPTERS: true,
        ROLLOUT_EVIDENCE: true,
        UPLOAD_PIPELINE: true
      }
    })).resolves.toEqual({ blockerCount: 0, readyForRelease: true });

    expect(database.documentLibraryReleaseGate.upsertCalls[0]).toMatchObject({
      create: expect.objectContaining({
        gateKey: "document-library.release-rollout",
        status: "READY"
      })
    });
  });
});
