import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseDetailRecord, DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { evaluateDiagnosticAdaptiveTests, overrideDiagnosticAdaptiveTest, type DiagnosticAdaptiveTestingProvider } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const flag = (code: string, mode: VehicleFeatureFlagRecord["mode"]): VehicleFeatureFlagRecord => ({ id: code, organizationId: "org-1", locationId: null, code, mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds: [], targetAt: null, version: 1, updatedAt: new Date("2026-07-21T18:00:00Z") });
function foundation(reasoning: VehicleFeatureFlagRecord["mode"] = "GENERAL"): EnterpriseCommandRepository { return { async commit() { throw new Error("unused"); }, async listCapabilityGrants() { return []; }, async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER", "GENERAL"), flag("DIAGNOSTIC_REASONING", reasoning)]; }, async updateFeatureFlag() { throw new Error("unused"); }, async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; }, async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {} }; }
const hypotheses = [{ hypothesisKey: "HYP_A", status: "DISCRIMINATION_REQUIRED" }, { hypothesisKey: "HYP_B", status: "DISCRIMINATION_REQUIRED" }];
const evaluation = { id: "adaptive-1", recommendedTestKey: "TEST_A", eligibleTests: [{ testKey: "TEST_A" }, { testKey: "TEST_B" }], overrides: [] };
const detail = { id: "case-1", version: 4, assignedUserId: "tech-1", vehicle: { id: "vehicle-1", make: "Ford", model: "F-150", year: 2020 }, reasoningEvaluations: [{ id: "reason-1", resultChecksum: "a".repeat(64), generationComplete: true, conflicts: [{ key: "CONFLICT_001" }], hypotheses }], adaptiveTestEvaluations: [evaluation] } as unknown as DiagnosticCaseDetailRecord;
function repository(overrides: Partial<DiagnosticCaseRepository> = {}): DiagnosticCaseRepository { return { async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "TESTING", version: 4 }; }, async get() { return detail; }, async getRepairOrderContext() { return null; }, async list() { return []; }, async create() { throw new Error("unused"); }, async assign() { throw new Error("unused"); }, async transition() { throw new Error("unused"); }, ...overrides }; }
const provider: DiagnosticAdaptiveTestingProvider = async () => ({ definitions: [{ definitionVersionId: "def-1", testKey: "TEST_A", name: "Discriminator A", distinguishesHypothesisKeys: ["HYP_A", "HYP_B"], resolvesConflictKeys: ["CONFLICT_001"], outcomePartitions: [{ outcomeKey: "A", hypothesisKeys: ["HYP_A"] }, { outcomeKey: "B", hypothesisKeys: ["HYP_B"] }], applicability: { makes: ["FORD"] }, prerequisites: [], hazards: [], requiredCapabilities: [], qualifications: [], tools: [], requiredVehicleStates: ["KEY_OFF"], requiredAuthorizations: [], sourceVersions: [{ sourceKey: "OEM", version: "1", rightsStatus: "AUTHORIZED", effectiveAt: "2026-01-01T00:00:00Z" }], effectiveAt: "2026-01-01T00:00:00Z", estimatedMinutes: 10, estimatedCostCents: 1000, invasiveness: 0.1, vehicleRisk: 0.1, setupDelay: 0.1, resourceReadiness: 1, reliability: 0.9, riskReduction: 0.8, downstreamUnblocking: 0.9 }], operationalContext: { satisfiedPrerequisites: [], controlledHazards: [], capabilities: [], qualifications: [], availableTools: [], availableResources: [], authorizations: [], vehicleState: "KEY_OFF" } });

describe("DGN-024–025 adaptive-testing service boundary", () => {
  it("uses server-owned inputs and persists the exact reasoning and policy checksums", async () => {
    const recordAdaptiveTestEvaluation = vi.fn(async () => ({ duplicate: false, result: { id: "adaptive-1" }, version: 5 }));
    await evaluateDiagnosticAdaptiveTests(technician, "case-1", { expectedVersion: 4, idempotencyKey: "adaptive-1", reason: "Choose the safest discriminating next test." }, { adaptiveTestingProvider: provider, foundationRepository: foundation(), organizationId: "org-1", repository: repository({ recordAdaptiveTestEvaluation }), now: () => new Date("2026-07-21T18:00:00Z") });
    const [command, data] = recordAdaptiveTestEvaluation.mock.calls[0]; expect(command).toMatchObject({ commandType: "EVALUATE_DIAGNOSTIC_ADAPTIVE_TESTS", expectedVersion: 4 });
    expect(data.result).toMatchObject({ reasoningEvaluationId: "reason-1", recommendedTestKey: "TEST_A", abstentionRequired: false }); expect(data.result.weightsChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails closed without an approved provider", async () => {
    await expect(evaluateDiagnosticAdaptiveTests(technician, "case-1", { expectedVersion: 4, idempotencyKey: "adaptive-1", reason: "Choose a discriminating next test." }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository() })).rejects.toThrow("approved adaptive-testing provider");
  });

  it("persists authorized override lineage without allowing excluded selections", async () => {
    const recordAdaptiveTestOverride = vi.fn(async () => ({ duplicate: false, result: { id: "override-1" }, version: 5 }));
    await overrideDiagnosticAdaptiveTest(technician, "case-1", "adaptive-1", { expectedVersion: 4, idempotencyKey: "override-1", selectedTestKey: "TEST_B", reason: "Use the safer physical access route first." }, { foundationRepository: foundation(), organizationId: "org-1", repository: repository({ recordAdaptiveTestOverride }), now: () => new Date("2026-07-21T18:00:00Z") });
    expect(recordAdaptiveTestOverride.mock.calls[0][0]).toMatchObject({ commandType: "OVERRIDE_DIAGNOSTIC_ADAPTIVE_TEST" }); expect(recordAdaptiveTestOverride.mock.calls[0][1].override).toMatchObject({ recommendedTestKey: "TEST_A", selectedTestKey: "TEST_B" });
    await expect(overrideDiagnosticAdaptiveTest(technician, "case-1", "adaptive-1", { expectedVersion: 4, idempotencyKey: "override-2", selectedTestKey: "EXCLUDED", reason: "Attempt an excluded next test choice." }, { foundationRepository: foundation(), organizationId: "org-1", repository: repository({ recordAdaptiveTestOverride }) })).rejects.toThrow("excluded test");
  });
});
