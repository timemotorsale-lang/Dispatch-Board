import { beforeEach, describe, expect, it } from "vitest";

import { previewProviderAction, resolvePacket, type DocumentRecord, type PacketRecord } from "@/server/document-library/domain";
import { executeDocumentLibraryAction, getDocumentLibrary, previewDocumentLibraryProviderAction, resetDocumentLibraryDemoState } from "@/server/document-library/service";

const manager = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "manager@example.test",
  id: "manager-1",
  isActive: true,
  name: "Manager",
  roles: ["General Manager"]
};

describe("document library backend service", () => {
  beforeEach(() => {
    resetDocumentLibraryDemoState();
  });

  it("projects packets, review blockers, archive previews, and provider references", async () => {
    const result = await getDocumentLibrary(manager);

    expect(result.contractVersion).toBe("document-library.backend/v1");
    expect(result.summary).toMatchObject({
      documents: 3,
      legalHold: 1,
      packets: 2,
      providerReferences: 2
    });
    expect(result.packets.find((packet) => packet.id === "packet-claim-10421")).toMatchObject({
      completion: { accepted: 2, required: 4 },
      status: "MISSING"
    });
    expect(result.reviewQueue.map((item) => item.state)).toEqual(expect.arrayContaining(["MISSING", "LEGAL_HOLD"]));
    expect(result.archivePreviews.find((item) => item.documentId === "doc-title-hold-1")).toMatchObject({
      eligible: false,
      legalHold: true
    });
    expect(result.providerReferences.every((reference) => reference.readOnly)).toBe(true);
    expect(result.storageRollout).toMatchObject({
      gate: {
        readyForRelease: false
      },
      persistencePlan: {
        documents: 3,
        packets: 2,
        providerReferences: 2
      },
      platformVersion: "document-library.storage-platform/v1"
    });
    expect(result.storageRollout.gate.blockers.map((blocker) => blocker.key)).toEqual(["DURABLE_REPOSITORY"]);
    expect(result.storageRollout.packetTemplates.map((template) => template.templateKey)).toEqual([
      "claims.standard",
      "title.standard",
      "vendor.onboarding"
    ]);
  });

  it("denies the read model to signed-in users without document workflow access", async () => {
    await expect(getDocumentLibrary({ duties: { all: [], direct: [], roleDefaults: [] }, email: "tech@example.test", id: "tech-1", isActive: true, name: "Tech", roles: ["Mechanic"] })).rejects.toMatchObject({
      code: "DOCUMENT_LIBRARY_NOT_AUTHORIZED"
    });
  });

  it("keeps legal hold documents from satisfying packet requirements", () => {
    const packet: PacketRecord = {
      documents: ["doc-1"],
      id: "packet-1",
      owner: { id: "vehicle-1", label: "Vehicle", type: "VEHICLE" },
      packetType: "TITLE_PACKET",
      requirements: [{ documentType: "TITLE_DOCUMENT", id: "req-1", label: "Title", required: true }],
      title: "Title Packet",
      workflow: "TITLE"
    };
    const document: DocumentRecord = {
      auditTrail: [],
      createdAt: "2026-09-20T00:00:00.000Z",
      documentType: "TITLE_DOCUMENT",
      fileName: "title.pdf",
      id: "doc-1",
      legalHold: true,
      owner: packet.owner,
      providerReferences: [],
      retentionCategory: "TITLE",
      sensitivity: "RESTRICTED",
      source: "MANUAL_UPLOAD",
      status: "ACCEPTED",
      storage: { provider: "INTERNAL", reference: "internal://doc-1", version: 1 }
    };

    expect(resolvePacket(packet, [document])).toMatchObject({
      blockers: ["Title is under legal hold and cannot satisfy this packet."],
      status: "BLOCKED"
    });
  });

  it("previews provider actions as held, audited, idempotent manager actions", async () => {
    await expect(previewDocumentLibraryProviderAction(manager, {
      action: "EXPORT_PACKET",
      idempotencyKey: "packet-export-1",
      subjectId: "packet-claim-10421"
    })).resolves.toMatchObject({
      providerAction: {
        auditRequired: true,
        idempotencyKey: "packet-export-1",
        liveProviderWriteEnabled: false,
        permission: "MANAGER_REQUIRED",
        state: "HELD_FOR_CONFIRMATION"
      }
    });

    expect(() => previewProviderAction({ action: "EXPORT_PACKET", idempotencyKey: "", subjectId: "packet-1" })).toThrow("idempotency key");
  });

  it("executes review and legal-hold commands with audit/idempotency while leaving provider writes disabled", async () => {
    await expect(executeDocumentLibraryAction(manager, {
      action: "REVIEW_DOCUMENT",
      decision: "NEEDS_CORRECTION",
      documentId: "doc-claim-intake-1",
      idempotencyKey: "review-correction-1",
      reason: "Photos do not match the claim packet."
    })).resolves.toMatchObject({
      auditEvent: {
        action: "DOCUMENT_REVIEW_NEEDS_CORRECTION",
        idempotencyKey: "review-correction-1"
      },
      command: {
        document: {
          status: "NEEDS_CORRECTION"
        }
      }
    });

    await expect(previewDocumentLibraryProviderAction(manager, {
      action: "PREVIEW_ARCHIVE",
      subjectId: "doc-title-hold-1"
    })).resolves.toMatchObject({
      archiveAction: {
        nextStatus: "UNCHANGED",
        state: "BLOCKED"
      }
    });

    await expect(executeDocumentLibraryAction(manager, {
      action: "SET_LEGAL_HOLD",
      documentId: "doc-claim-intake-1",
      idempotencyKey: "hold-claim-intake-1",
      reason: "Claim is under legal review."
    })).resolves.toMatchObject({
      command: {
        document: {
          legalHold: true,
          id: "doc-claim-intake-1"
        }
      }
    });
  });

  it("supports manual document creation and packet linking through the command boundary", async () => {
    await expect(executeDocumentLibraryAction(manager, {
      action: "CREATE_DOCUMENT",
      documentType: "DAMAGE_PHOTOS",
      fileName: "damage-photos-gada-ahmed-jamal.zip",
      idempotencyKey: "create-damage-photos-1",
      owner: { id: "claim-10421", label: "Claim #CLM-10421", type: "CLAIM" },
      packetId: "packet-claim-10421",
      reason: "Customer uploaded damage photos.",
      sensitivity: "CONFIDENTIAL",
      source: "CUSTOMER_PORTAL",
      storage: { provider: "EXTERNAL_LINK", reference: "https://storage.example.test/damage-photos", version: 1 }
    })).resolves.toMatchObject({
      auditEvent: {
        action: "DOCUMENT_CREATED",
        idempotencyKey: "create-damage-photos-1"
      },
      command: {
        document: {
          documentType: "DAMAGE_PHOTOS",
          status: "RECEIVED"
        },
        packet: {
          completion: { accepted: 2, required: 4 },
          status: "MISSING"
        }
      },
      liveProviderWriteEnabled: false
    });
  });

  it("waives packet requirements only with manager authority and a reason", async () => {
    await expect(executeDocumentLibraryAction(manager, {
      action: "WAIVE_REQUIREMENT",
      idempotencyKey: "waive-tow-storage-1",
      packetId: "packet-claim-10421",
      reason: "Tow vendor confirmed no tow/storage charge applies.",
      requirementId: "req-tow-storage"
    })).resolves.toMatchObject({
      auditEvent: {
        action: "DOCUMENT_REQUIREMENT_WAIVED",
        idempotencyKey: "waive-tow-storage-1"
      },
      command: {
        packet: {
          requirements: expect.arrayContaining([
            expect.objectContaining({
              id: "req-tow-storage",
              state: "WAIVED"
            })
          ])
        }
      }
    });
  });
});
