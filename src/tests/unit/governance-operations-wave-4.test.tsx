import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GovernanceOperationsWorkspace } from "@/features/inventory/governance-operations-workspace";
import { EXPORT_FIELDS, normalizeControlledExport, normalizePrivacySupport, normalizeReportSnapshot } from "@/server/governance-operations/domain";
import { executeGovernanceOperation } from "@/server/governance-operations/service";

const now = new Date("2026-07-18T15:00:00.000Z");
const generalManager = { id: "gm-1", name: "General Manager", email: "gm@test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } } as never;

describe("Inventory Console gap closure Wave 4", () => {
  it("enforces controlled export resource, field, reason, and volume boundaries", () => {
    expect(EXPORT_FIELDS.APPROVALS).toContain("amountCents");
    expect(() => normalizeControlledExport({ resource: "APPROVALS", fields: ["password"], rowLimit: 10, idempotencyKey: "export-key", reason: "Provide governed approval review evidence." }, now)).toThrow("not permitted");
    expect(() => normalizeControlledExport({ resource: "APPROVALS", fields: ["id"], rowLimit: 501, idempotencyKey: "export-key", reason: "Provide governed approval review evidence." }, now)).toThrow("1 through 500");
  });

  it("requires a closed historical period and an approved privacy/support request kind", () => {
    expect(() => normalizeReportSnapshot({ periodStart: "2026-07-19", periodEnd: "2026-07-20", idempotencyKey: "snapshot-key", reason: "Freeze the governed reporting period for review." }, now)).toThrow("future");
    expect(() => normalizePrivacySupport({ requestKind: "DELETE_NOW", ownerUserId: "owner", subjectType: "EVIDENCE", subjectId: "one", runbookReference: "RB-1", idempotencyKey: "privacy-key", reason: "Review governed deletion evidence and legal hold." })).toThrow("invalid");
  });

  it("creates an attributed, bounded, hashed, expiring export snapshot", async () => {
    const create = vi.fn(async input => ({ duplicate: false, record: input }));
    const governanceSource = vi.fn(async () => ({ scope: { locationIds: ["loc-1"] }, reports: { facts: [{ code: "INV_OPEN_UNITS", label: "Open", value: 2, unit: "COUNT", definitionVersion: "v1", quality: "AUTHORITATIVE", drillHref: "/vehicles" }], snapshot: { cutoffAt: now.toISOString(), cohort: "AUTHORIZED" }, inventoryStages: [], repairStates: [] }, reviews: [], approvals: [], administration: { operations: { projections: [] } } })) as never;
    const result = await executeGovernanceOperation(generalManager, { action: "CREATE_CONTROLLED_EXPORT", resource: "REPORT_FACTS", fields: ["code", "value", "cutoffAt"], rowLimit: 10, idempotencyKey: "export-wave-4", reason: "Create a bounded internal scorecard export for audit." }, { now: () => now, organizationId: "org-1", governanceSource, repository: { create } as never });
    expect(result).toMatchObject({ duplicate: false });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ contentHash: expect.stringMatching(/^[a-f0-9]{64}$/), expiresAt: new Date("2026-07-19T15:00:00.000Z"), recordType: "CONTROLLED_EXPORT", rowCount: 1, status: "READY", watermark: expect.stringContaining("gm-1") }));
  });

  it("renders all four durable governance queues and truthful boundaries", () => {
    const markup = renderToStaticMarkup(<GovernanceOperationsWorkspace initial={{ contractVersion: "inventory-governance-operations/wave-4.0.0", generatedAt: now.toISOString(), capability: { exportDelivery: "AUTHENTICATED_INLINE_CSV", providerRetry: "DEAD_LETTER_TO_INTERNAL_OUTBOX_ONLY", privacyDeletion: "EVIDENCE_SERVICE_ONLY", restatement: "INDEPENDENT_APPROVAL_REQUIRED" }, reports: [], restatements: [], exports: [], incidents: [], privacySupport: [], background: { evaluatedAt: now.toISOString(), pending: [], deadLetters: [], projections: [] }, retention: { evaluatedAt: now.toISOString(), policy: { deletionRequiresExpiredRetentionAndNoLegalHold: true, auditEvidencePreserved: true }, summary: { dueForDisposition: 0, legalHolds: 0, quarantined: 0, deleted: 0 }, dueForDisposition: [] } } as never}/>);
    for (const token of ["Governance Operations", "Reports &amp; restatements", "Controlled exports", "Operations recovery", "Privacy &amp; support", "EVIDENCE_SERVICE_ONLY"]) expect(markup).toContain(token);
  });

  it("defines a source-controlled durable aggregate and immutable event history", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8"), migration = readFileSync("prisma/migrations/20260718233000_inventory_console_gap_closure_wave_4/migration.sql", "utf8");
    for (const token of ["model InventoryGovernanceRecord", "model InventoryGovernanceRecordEvent", "idempotencyKey", "requestHash", "watermark", "contentHash"]) expect(schema).toContain(token);
    expect(migration).toContain('CREATE TABLE "InventoryGovernanceRecord"');
    expect(migration).toContain('CREATE UNIQUE INDEX "InventoryGovernanceRecordEvent_recordId_version_key"');
  });
});
