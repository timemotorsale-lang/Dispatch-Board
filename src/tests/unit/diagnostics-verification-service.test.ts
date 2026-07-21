import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseDetailRecord, DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { recordDiagnosticVerification } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const flag = (code: string): VehicleFeatureFlagRecord => ({ id: code, organizationId: "org-1", locationId: null, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [], version: 1, updatedAt: new Date("2026-07-21T23:00:00Z") });
function foundation(): EnterpriseCommandRepository { return { async commit() { throw new Error("unused"); }, async listCapabilityGrants() { return []; }, async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER"), flag("DIAGNOSTIC_PUBLISHING")]; }, async updateFeatureFlag() { throw new Error("unused"); }, async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; }, async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {} }; }
const conclusion = { id: "conclusion-1", version: 2, status: "CONFIRMED", causeStatement: "Starter ground path has excessive resistance.", uncertainty: "LOW", conclusionChecksum: "a".repeat(64), occurredAt: new Date("2026-07-21T22:00:00Z") };
const handoff = { id: "handoff-1", version: 1, handoffType: "PUBLISH_DIAGNOSIS", status: "PUBLISHED", repairDiagnosisVersionId: "diag-1", handoffChecksum: "b".repeat(64), occurredAt: new Date("2026-07-21T22:10:00Z") };
const plan = { id: "verification-1", version: 1, status: "PLANNED", planChecks: [{ key: "ORIGINAL_CONCERN", label: "Original concern", method: "CUSTOMER_CONCERN_REPRODUCTION", expectedResult: "No crank no longer reproduces.", required: true, safetyCritical: false }] };
function detail(planned = false) { return { id: "case-1", version: planned ? 10 : 9, status: planned ? "POST_REPAIR_VERIFICATION" : "HANDED_OFF", riskTier: "R1", repairOrderId: "ro-1", assignedUserId: "tech-1", concernVersions: [{ id: "concern-1", statement: "No crank no start.", version: 1, operatingConditions: {} }], conclusionVersions: [conclusion], repairHandoffVersions: [handoff], verificationVersions: planned ? [plan] : [], testExecutions: [] } as unknown as DiagnosticCaseDetailRecord; }
function repository(recordVerification: ReturnType<typeof vi.fn>, planned = false): DiagnosticCaseRepository { return { async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: planned ? "POST_REPAIR_VERIFICATION" : "HANDED_OFF", version: planned ? 10 : 9 }; }, async get() { return detail(planned); }, async getRepairOrderContext() { return null; }, async list() { return []; }, async create() { throw new Error("unused"); }, async assign() { throw new Error("unused"); }, async transition() { throw new Error("unused"); }, recordVerification }; }

const planRequest = { action: "PLAN", expectedVersion: 9, idempotencyKey: "verification-plan", reason: "Create post repair verification plan.", originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks: [{ key: "ORIGINAL_CONCERN", label: "Original concern", method: "CUSTOMER_CONCERN_REPRODUCTION", expectedResult: "No crank no longer reproduces.", required: true, safetyCritical: false }] };

describe("DGN-033-034 verification service boundary", () => {
  it("creates a verification plan from the server-bound published repair diagnosis", async () => {
    const persist = vi.fn(async () => ({ duplicate: false, result: { id: "verification-1" }, version: 10 }));
    await recordDiagnosticVerification(technician, "case-1", planRequest, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(persist), now: () => new Date("2026-07-21T23:00:00Z") });
    expect(persist.mock.calls[0][0]).toMatchObject({ commandType: "DIAGNOSTIC_VERIFICATION_PLAN", expectedVersion: 9 });
    expect(persist.mock.calls[0][1]).toMatchObject({ control: { allowed: true, status: "PLANNED" } });
  });

  it("passes and closes only after an active plan and required checks", async () => {
    const persist = vi.fn(async () => ({ duplicate: false, result: { id: "verification-2" }, version: 11 }));
    await recordDiagnosticVerification(technician, "case-1", { ...planRequest, action: "PASS", expectedVersion: 10, idempotencyKey: "verification-pass", supersedesId: "verification-1", performedChecks: [{ checkKey: "ORIGINAL_CONCERN", result: "PASS", evidenceKeys: [], notes: "Concern does not reproduce." }], regressionChecks: ["ORIGINAL_CONCERN"] }, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(persist, true), now: () => new Date("2026-07-21T23:10:00Z") });
    expect(persist.mock.calls[0][1].control.status).toBe("PASSED");
  });

  it("fails closed when result is submitted without an active plan", async () => {
    await expect(recordDiagnosticVerification(technician, "case-1", { ...planRequest, action: "PASS", performedChecks: [{ checkKey: "ORIGINAL_CONCERN", result: "PASS", evidenceKeys: [] }], regressionChecks: ["ORIGINAL_CONCERN"] }, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(vi.fn()) })).rejects.toThrow("VERIFICATION_ACTIVE_PLAN_REQUIRED");
  });
});
