import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseDetailRecord, DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { recordDiagnosticAdvisorEstimateDraft } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const flag = (code: string): VehicleFeatureFlagRecord => ({ id: code, organizationId: "org-1", locationId: null, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [], version: 1, updatedAt: new Date("2026-07-21T23:00:00Z") });
function foundation(): EnterpriseCommandRepository { return { async commit() { throw new Error("unused"); }, async listCapabilityGrants() { return []; }, async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER"), flag("DIAGNOSTIC_PUBLISHING")]; }, async updateFeatureFlag() { throw new Error("unused"); }, async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; }, async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {} }; }

const operation = { key: "starter-ground-repair", description: "Repair starter ground cable connection.", workTypeCode: "DIAGNOSTIC_REPAIR", durationMinutes: { minimum: 30, likely: 90, maximum: 150 }, requiredSkills: ["DIAGNOSTIC_REPAIR"], requiredCertifications: [], bayRequirements: ["SERVICE_BAY"], toolRequirements: ["DVOM"], parts: [], hazards: ["BATTERY_SAFE_WORK"], procedures: ["Follow approved service information."], qcChecks: ["Verify crank performance."] };
const conclusion = { id: "conclusion-1", version: 2, status: "CONFIRMED", causeStatement: "Starter ground path has excessive resistance.", uncertainty: "LOW", conclusionChecksum: "a".repeat(64), occurredAt: new Date("2026-07-21T22:00:00Z") };
const handoff = { id: "handoff-1", version: 1, handoffType: "PUBLISH_DIAGNOSIS", status: "PUBLISHED", repairDiagnosisVersionId: "diag-1", handoffChecksum: "b".repeat(64), operations: [operation], estimateBoundary: { advisorReviewRequired: true }, recommendation: "Repair starter ground path.", proposedCorrection: "Repair starter ground cable connection.", occurredAt: new Date("2026-07-21T22:10:00Z") };
function detail(published = true) { return { id: "case-1", version: 11, status: "HANDED_OFF", riskTier: "R1", repairOrderId: "ro-1", assignedUserId: "tech-1", concernVersions: [{ id: "concern-1", statement: "No crank no start.", version: 1, operatingConditions: {} }], conclusionVersions: [conclusion], repairHandoffVersions: published ? [handoff] : [], estimateDraftVersions: [] } as unknown as DiagnosticCaseDetailRecord; }
function repository(recordEstimateDraft: ReturnType<typeof vi.fn>, published = true): DiagnosticCaseRepository { return { async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "HANDED_OFF", version: 11 }; }, async get() { return detail(published); }, async getRepairOrderContext() { return null; }, async list() { return []; }, async create() { throw new Error("unused"); }, async assign() { throw new Error("unused"); }, async transition() { throw new Error("unused"); }, recordEstimateDraft }; }

const request = { expectedVersion: 11, idempotencyKey: "estimate-draft-1", reason: "Create advisor estimate draft.", selectedStrategy: "STANDARD_SHOP_MODEL", advisorSummary: "Advisor should review labor, parts, and customer authorization.", customerConcernSummary: "No crank no start.", customerCauseSummary: "Starter ground path has excessive resistance.", customerCorrectionSummary: "Repair starter ground cable connection.", laborRateCents: 16500, expiresAt: "2026-07-30T10:00:00Z" };

describe("DGN-035-037 advisor estimate service boundary", () => {
  it("records an advisor-ready draft from the published diagnosis handoff", async () => {
    const persist = vi.fn(async () => ({ duplicate: false, result: { id: "draft-1" }, version: 12 }));
    await recordDiagnosticAdvisorEstimateDraft(technician, "case-1", request, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(persist), now: () => new Date("2026-07-21T23:00:00Z") });
    expect(persist.mock.calls[0][0]).toMatchObject({ commandType: "DIAGNOSTIC_ADVISOR_ESTIMATE_DRAFT", expectedVersion: 11 });
    expect(persist.mock.calls[0][1].control).toMatchObject({ allowed: true, status: "READY_FOR_ADVISOR_REVIEW", laborSubtotalCents: 33000 });
  });

  it("fails closed without a published repair diagnosis handoff", async () => {
    await expect(recordDiagnosticAdvisorEstimateDraft(technician, "case-1", request, { foundationRepository: foundation(), organizationId: "org-1", repository: repository(vi.fn(), false), now: () => new Date("2026-07-21T23:00:00Z") })).rejects.toThrow("ADVISOR_ESTIMATE_PUBLISHED_REPAIR_HANDOFF_REQUIRED");
  });
});
