import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { createDiagnosticTestPlan, executeDiagnosticTestLifecycle, registerDiagnosticTestDefinition } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const manager: AuthenticatedUser = { ...technician, id: "manager-1", roles: ["General Manager"] };

function flag(code: string, mode: VehicleFeatureFlagRecord["mode"]): VehicleFeatureFlagRecord { return { id: code, organizationId: "org-1", locationId: null, code, mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds: [], targetAt: null, version: 1, updatedAt: new Date("2026-07-21") }; }
function foundation(mode: VehicleFeatureFlagRecord["mode"] = "GENERAL"): EnterpriseCommandRepository { return { async commit() { throw new Error("unused"); }, async listCapabilityGrants() { return []; }, async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER", "GENERAL"), flag("DIAGNOSTIC_EVIDENCE", mode)]; }, async updateFeatureFlag() { throw new Error("unused"); }, async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; }, async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {} }; }
function repository(overrides: Partial<DiagnosticCaseRepository> = {}): DiagnosticCaseRepository { return { async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "TRIAGE", version: 3 }; }, async get() { return null; }, async getRepairOrderContext() { return null; }, async list() { return []; }, async create() { throw new Error("unused"); }, async assign() { throw new Error("unused"); }, async transition() { throw new Error("unused"); }, ...overrides }; }

const plan = { expectedVersion: 3, idempotencyKey: "plan-1", reason: "Create a safe diagnostic test plan.", rationale: "Collect independent evidence before forming a cause.", nodes: [{ nodeKey: "LOAD", definitionVersionId: "def-1", title: "Loaded voltage", dependencyNodeKeys: [] }] };

describe("diagnostic test execution service", () => {
  it("creates case-scoped test plans and starts an append-only execution", async () => {
    const createTestPlan = vi.fn(async () => ({ duplicate: false, result: { planId: "plan-1" }, version: 4 }));
    await createDiagnosticTestPlan(technician, "case-1", plan, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository({ createTestPlan }) });
    expect(createTestPlan.mock.calls[0][0]).toMatchObject({ commandType: "CREATE_DIAGNOSTIC_TEST_PLAN", subjectId: "case-1" });

    const executeTestLifecycle = vi.fn(async () => ({ duplicate: false, result: { state: "RUNNING" }, version: 4 }));
    await executeDiagnosticTestLifecycle(technician, "case-1", "START", { expectedVersion: 3, idempotencyKey: "start-1", reason: "Begin the approved loaded-voltage test.", reasonCode: "TEST_STARTED", planNodeId: "node-1", prerequisiteSnapshot: { prerequisitesSatisfied: true, hazardsControlled: true, qualifications: [] } }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository({ executeTestLifecycle }) });
    expect(executeTestLifecycle.mock.calls[0][0]).toMatchObject({ commandType: "START_DIAGNOSTIC_TEST", expectedVersion: 3 });
  });

  it("keeps plans and executions behind the evidence rollout boundary", async () => {
    await expect(createDiagnosticTestPlan(technician, "case-1", plan, { foundationRepository: foundation("OFF"), organizationId: "org-1", repository: repository() })).rejects.toThrow("evidence mutations are not enabled");
  });

  it("restricts test-definition registration to management authority", async () => {
    const definition = { expectedVersion: 0, idempotencyKey: "def-1", reason: "Register an approved diagnostic test definition.", definitionKey: "LOAD", definitionVersion: 1, name: "Loaded voltage", purpose: "Measure supply voltage under a controlled electrical load.", procedure: [{}], sourceVersions: [{ sourceId: "source-1", version: "1", rightsStatus: "AUTHORIZED" }], estimatedMinutes: 10 };
    await expect(registerDiagnosticTestDefinition(technician, definition, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository() })).rejects.toThrow("manager authority");
    const registerTestDefinition = vi.fn(async () => ({ duplicate: false, result: { id: "def-1" }, version: 1 }));
    await registerDiagnosticTestDefinition(manager, definition, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository({ registerTestDefinition }) });
    expect(registerTestDefinition.mock.calls[0][0]).toMatchObject({ expectedVersion: 0, subjectType: "DIAGNOSTIC_TEST_DEFINITION" });
  });
});
