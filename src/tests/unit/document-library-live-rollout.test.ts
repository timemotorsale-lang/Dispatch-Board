import { describe, expect, it } from "vitest";

import { syncDocumentLibraryDurableRollout, type DocumentLibraryLiveRolloutDependencies } from "@/server/document-library/live-rollout";
import type { DocumentLibraryState } from "@/server/document-library/repository";

const manager = {
  duties: { all: ["Document workflow"], direct: [], roleDefaults: [] },
  email: "manager@example.test",
  id: "manager-1",
  isActive: true,
  name: "Manager",
  roles: ["General Manager"]
};

const state: DocumentLibraryState = {
  auditEvents: [{
    action: "DOCUMENT_CREATED",
    actorId: "manager-1",
    at: "2026-09-22T00:00:00.000Z",
    idempotencyKey: "create-doc-1",
    note: "Seeded.",
    subjectId: "doc-1"
  }],
  documents: [],
  idempotencyKeys: ["create-doc-1"],
  packets: []
};

describe("document library live rollout", () => {
  it("skips durable sync while the rollout switch is off", async () => {
    await expect(syncDocumentLibraryDurableRollout({
      actor: manager,
      dependencies: { durableRepositoryEnabled: false },
      state
    })).resolves.toEqual({ enabled: false, mode: "IN_MEMORY_REVIEW" });
  });

  it("seeds templates, persists snapshots, and records the release gate when enabled", async () => {
    const calls: string[] = [];
    const repository: NonNullable<DocumentLibraryLiveRolloutDependencies["repository"]> = {
      async persistReleaseGate() {
        calls.push("gate");
        return { blockerCount: 0, readyForRelease: true };
      },
      async persistSnapshot() {
        calls.push("snapshot");
        return { auditEvents: 1, documents: 0, packetDocuments: 0, packetRequirements: 0, packets: 0, providerReferences: 0 };
      },
      async seedPacketTemplates() {
        calls.push("templates");
        return { templates: 3 };
      }
    };

    await expect(syncDocumentLibraryDurableRollout({
      actor: manager,
      dependencies: { durableRepositoryEnabled: true, repository },
      state
    })).resolves.toMatchObject({
      enabled: true,
      gate: { readyForRelease: true },
      mode: "DATABASE_BACKED",
      templates: { templates: 3 }
    });
    expect(calls).toEqual(["templates", "snapshot", "gate"]);
  });
});
