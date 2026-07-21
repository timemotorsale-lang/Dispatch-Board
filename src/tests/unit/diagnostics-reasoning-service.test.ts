import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseDetailRecord, DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { evaluateDiagnosticCaseReasoning } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const flag = (code: string, mode: VehicleFeatureFlagRecord["mode"]): VehicleFeatureFlagRecord => ({ id: code, organizationId: "org-1", locationId: null, code, mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds: [], version: 1, updatedAt: new Date("2026-07-21T17:00:00Z") });
function foundation(reasoning: VehicleFeatureFlagRecord["mode"] = "GENERAL"): EnterpriseCommandRepository { return { async commit() { throw new Error("unused"); }, async listCapabilityGrants() { return []; }, async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER", "GENERAL"), flag("DIAGNOSTIC_REASONING", reasoning)]; }, async updateFeatureFlag() { throw new Error("unused"); }, async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; }, async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {} }; }
const detail = {
  id: "case-1", version: 3, assignedUserId: "tech-1", concernVersions: [{ id: "concern-1" }],
  vehicle: { id: "vehicle-1", make: "Ford", model: "F-150", year: 2020 },
  observations: [{ id: "obs-1", correctedBy: null, independenceGroup: "TECH-1", observedAt: new Date("2026-07-21T16:00:00Z"), qualityReasonCode: "DATA_VALID", qualityStatus: "VALID" }], measurements: []
} as unknown as DiagnosticCaseDetailRecord;
function repository(overrides: Partial<DiagnosticCaseRepository> = {}): DiagnosticCaseRepository { return { async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "TESTING", version: 3 }; }, async get() { return detail; }, async getRepairOrderContext() { return null; }, async list() { return []; }, async create() { throw new Error("unused"); }, async assign() { throw new Error("unused"); }, async transition() { throw new Error("unused"); }, ...overrides }; }
const model = {
  modelVersion: "MODEL/1", ruleSetVersion: "RULES/1", knowledgeChecksum: "a".repeat(64), calculationVersions: ["DGN-021/1.0.0"], sourceVersions: [{ sourceKey: "DGN-SRC-005", version: "1", rightsStatus: "AUTHORIZED" }], applicability: { allowedMakes: ["FORD"] },
  assumptions: [{ key: "GROUND_PATH", label: "Ground path normal", abnormalModes: ["HIGH_RESISTANCE"], expectedEffectKeys: ["GROUND_DROP_EXCESSIVE"] }],
  rules: [{ key: "GROUND", conditions: [{ factKey: "GROUND_DROP_EXCESSIVE", state: "PRESENT" as const }], conflictAssumptions: ["GROUND_PATH"], reasonCode: "REASONING_GROUND_PATH_CONFLICT", explanation: "Loaded drop conflicts with a healthy ground path." }]
};
const provider = async () => ({ model, evidence: [{ key: "EV_GROUND", evidenceId: "obs-1", evidenceType: "OBSERVATION" as const, factKey: "GROUND_DROP_EXCESSIVE", state: "PRESENT" as const, quality: "VALID" as const, qualityReasonCode: "DATA_VALID", independenceGroup: "TECH-1", observedAt: "2026-07-21T16:00:00Z", supportsAssumptions: ["GROUND_PATH"] }] });
const request = { expectedVersion: 3, idempotencyKey: "reason-1", reason: "Evaluate the approved no-start reasoning model." };

describe("DGN-023 reasoning service boundary", () => {
  it("evaluates only server-provided approved models and persists exact checksums", async () => {
    const recordReasoningEvaluation = vi.fn(async () => ({ duplicate: false, result: { id: "eval-1" }, version: 4 }));
    await evaluateDiagnosticCaseReasoning(technician, "case-1", request, { foundationRepository: foundation(), organizationId: "org-1", repository: repository({ recordReasoningEvaluation }), reasoningProvider: provider, now: () => new Date("2026-07-21T17:00:00Z") });
    const [command, data] = recordReasoningEvaluation.mock.calls[0];
    expect(command).toMatchObject({ commandType: "EVALUATE_DIAGNOSTIC_CASE", expectedVersion: 3, subjectId: "case-1" });
    expect(data.result).toMatchObject({ modelVersion: "MODEL/1", generationComplete: true, abstentionRequired: false, candidates: [expect.objectContaining({ status: "SUPPORTED" })] });
    expect(data.result.inputChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails closed without a provider or when reasoning rollout is disabled", async () => {
    await expect(evaluateDiagnosticCaseReasoning(technician, "case-1", request, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository() })).rejects.toThrow("approved diagnostic reasoning model provider");
    await expect(evaluateDiagnosticCaseReasoning(technician, "case-1", request, { foundationRepository: foundation("OFF"), organizationId: "org-1", repository: repository(), reasoningProvider: provider })).rejects.toThrow("reasoning mutations are not enabled");
  });
});
