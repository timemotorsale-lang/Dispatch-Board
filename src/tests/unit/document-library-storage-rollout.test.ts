import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildDocumentStorageContract,
  DOCUMENT_STORAGE_REQUIRED_INDEXES,
  DOCUMENT_STORAGE_REQUIRED_MODELS,
  evaluateDocumentStorageReleaseGate
} from "@/server/document-library/storage-rollout";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = readFileSync(join(process.cwd(), "prisma/migrations/20260922223000_document_library_storage_rollout/migration.sql"), "utf8");

describe("document library storage rollout", () => {
  it("keeps the Prisma schema migration-ready for enterprise document storage", () => {
    for (const model of DOCUMENT_STORAGE_REQUIRED_MODELS) {
      expect(schema).toContain(`model ${model} {`);
      expect(migration).toContain(`CREATE TABLE "${model}"`);
    }

    for (const index of DOCUMENT_STORAGE_REQUIRED_INDEXES) {
      expect(schema).toContain(index);
    }
  });

  it("models the relationships needed for packet work and immutable document versions", () => {
    expect(schema).toContain("versions               DocumentLibraryObjectVersion[]");
    expect(schema).toContain("packetLinks            DocumentLibraryPacketDocument[]");
    expect(schema).toContain("providerReferences     DocumentLibraryProviderReference[]");
    expect(schema).toContain("requirements           DocumentLibraryPacketRequirement[]");
    expect(schema).toContain("auditEvents            DocumentLibraryAuditEvent[]");
    expect(schema).toContain("onDelete: Cascade");
    expect(schema).toContain("onDelete: SetNull");
  });

  it("blocks release until every production milestone has evidence", () => {
    const gate = evaluateDocumentStorageReleaseGate({
      PRISMA_SCHEMA: true,
      OBJECT_VERSIONING: true
    });

    expect(gate.readyForRelease).toBe(false);
    expect(gate.blockers.map((blocker) => blocker.key)).toEqual([
      "AUDIT_LEDGER",
      "PACKET_TEMPLATES",
      "DURABLE_REPOSITORY",
      "UPLOAD_PIPELINE",
      "PROVIDER_ADAPTERS",
      "PERMISSION_ENFORCEMENT",
      "ROLLOUT_EVIDENCE"
    ]);
  });

  it("allows rollout only when all required milestones are complete", () => {
    const gate = evaluateDocumentStorageReleaseGate({
      AUDIT_LEDGER: true,
      DURABLE_REPOSITORY: true,
      OBJECT_VERSIONING: true,
      PACKET_TEMPLATES: true,
      PERMISSION_ENFORCEMENT: true,
      PRISMA_SCHEMA: true,
      PROVIDER_ADAPTERS: true,
      ROLLOUT_EVIDENCE: true,
      UPLOAD_PIPELINE: true
    });

    expect(gate.readyForRelease).toBe(true);
    expect(gate.blockers).toEqual([]);
    expect(gate.milestones.every((milestone) => milestone.status === "COMPLETE")).toBe(true);
  });

  it("documents the storage contract invariants for the remaining buildout", () => {
    const contract = buildDocumentStorageContract();

    expect(contract.models).toEqual(DOCUMENT_STORAGE_REQUIRED_MODELS);
    expect(contract.invariants).toEqual(expect.arrayContaining([
      expect.stringContaining("never physically deleted"),
      expect.stringContaining("immutable object versions"),
      expect.stringContaining("Provider references are read-only"),
      expect.stringContaining("organization-scoped")
    ]));
  });
});
