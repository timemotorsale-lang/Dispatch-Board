import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseDetailRecord, DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { recordDiagnosticRepairHandoff } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const flag = (code: string): VehicleFeatureFlagRecord => ({ id: code, organizationId: "org-1", locationId: null, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [], version: 1, updatedAt: new Date("2026-07-21T22:00:00Z") });
function foundation(): EnterpriseCommandRepository { return { async commit() { throw new Error("unused"); }, async listCapabilityGrants() { return []; }, async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER"), flag("DIAGNOSTIC_PUBLISHING")]; }, async updateFeatureFlag() { throw new Error("unused"); }, async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; }, async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {} }; }
const conclusion = { id: "conclusion-1", version: 2, status: "CONFIRMED", hypothesisId: "hyp-1", causeStatement: "Starter ground path has excessive resistance.", uncertainty: "LOW", sourceVersions: [{ sourceKey: "OEM", version: "1", rightsStatus: "AUTHORIZED", current: true }], conclusionChecksum: "a".repeat(64), occurredAt: new Date("2026-07-21T22:00:00Z") };
function detail(published = false) { return { id: "case-1", version: published ? 8 : 7, status: "CONFIRMED", riskTier: "R1", repairOrderId: "ro-1", assignedUserId: "tech-1", concernVersions: [{ id: "concern-1", statement: "No crank no start.", version: 1, operatingConditions: {} }], conclusionVersions: [conclusion], repairHandoffVersions: published ? [{ id: "handoff-1", version: 1, handoffType: "PUBLISH_DIAGNOSIS", status: "PUBLISHED", repairDiagnosisVersionId: "diag-1" }] : [] } as unknown as DiagnosticCaseDetailRecord; }
function repository(recordRepairHandoff: ReturnType<typeof vi.fn>, published = false): DiagnosticCaseRepository { return { async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "CONFIRMED", version: published ? 8 : 7 }; }, async get() { return detail(published); }, async getRepairOrderContext() { return null; }, async list() { return []; }, async create() { throw new Error("unused"); }, async assign() { throw new Error("unused"); }, async transition() { throw new Error("unused"); }, recordRepairHandoff }; }

const request = { handoffType: "PUBLISH_DIAGNOSIS", expectedVersion: 7, idempotencyKey: "handoff-1", reason: "Publish confirmed diagnosis to repair order.", recommendation: "Repair the starter ground path and verify crank performance.", proposedCorrection: "Clean and repair the ground cable connection.", operations: [{ key: "ground-repair", description: "Repair starter ground path.", workTypeCode: "ELECTRICAL", minimumMinutes: 30, likelyMinutes: 60, maximumMinutes: 90, requiredSkills: ["Electrical"], procedures: ["Follow approved wiring repair procedure."], qcChecks: ["Voltage drop passes under load."] }] };

describe("DGN-028-032 repair handoff service boundary", () => {
  it("publishes a confirmed conclusion through the server-bound latest case state", async () => {
    const persist = vi.fn(async () => ({ duplicate: false, result: { id: "handoff-1" }, version: 8 }));
    await recordDiagnosticRepairHandoff(technician, "case-1", request, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(persist), now: () => new Date("2026-07-21T22:10:00Z") });
    expect(persist.mock.calls[0][0]).toMatchObject({ commandType: "DIAGNOSTIC_REPAIR_HANDOFF_PUBLISH_DIAGNOSIS", expectedVersion: 7 });
    expect(persist.mock.calls[0][1]).toMatchObject({ control: { allowed: true, status: "PUBLISHED" } });
  });

  it("requires diagnosis publication before downstream handoff packages", async () => {
    const persist = vi.fn();
    await expect(recordDiagnosticRepairHandoff(technician, "case-1", { ...request, handoffType: "DISPATCH_REQUIREMENTS" }, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(persist) })).rejects.toThrow("HANDOFF_REPAIR_DIAGNOSIS_PUBLICATION_REQUIRED");
  });

  it("permits downstream review package only after the repair diagnosis is published", async () => {
    const persist = vi.fn(async () => ({ duplicate: false, result: { id: "handoff-2" }, version: 9 }));
    await recordDiagnosticRepairHandoff(technician, "case-1", { ...request, handoffType: "PARTS_READINESS", expectedVersion: 8, idempotencyKey: "handoff-2", supersedesId: "handoff-1" }, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(persist, true), now: () => new Date("2026-07-21T22:20:00Z") });
    expect(persist.mock.calls[0][1].control.status).toBe("READY_FOR_REVIEW");
  });
});
