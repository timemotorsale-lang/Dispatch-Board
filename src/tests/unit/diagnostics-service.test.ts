import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { assignDiagnosticCase, createDiagnosticCase, listDiagnosticCases, transitionDiagnosticCase } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const limited: AuthenticatedUser = { id: "limited-1", name: "Limited", email: "limited@example.com", isActive: true, roles: ["Advisor"], duties: { all: [], direct: [], roleDefaults: [] } };

function flag(code: string, mode: VehicleFeatureFlagRecord["mode"]): VehicleFeatureFlagRecord {
  return { id: code, organizationId: "org-1", locationId: null, code, mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds: [], version: 1, updatedAt: new Date("2026-07-20T00:00:00Z") };
}

function foundation(overrides: Partial<EnterpriseCommandRepository> = {}): EnterpriseCommandRepository {
  return {
    async commit() { throw new Error("Not used by diagnostic case repository tests."); },
    async listCapabilityGrants() { return []; },
    async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER", "GENERAL"), flag("DIAGNOSTIC_CASES", "GENERAL")]; },
    async updateFeatureFlag() { throw new Error("Not used."); },
    async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; },
    async claimReadyOutbox() { return []; },
    async markOutboxFailed() {},
    async markOutboxPublished() {},
    ...overrides
  };
}

function repository(overrides: Partial<DiagnosticCaseRepository> = {}): DiagnosticCaseRepository {
  return {
    async getRepairOrderContext() { return { closedAt: null, id: "ro-1", locationId: "loc-1", organizationId: "org-1", repairOrderNumber: "RO-1", serviceVisit: { concernSummary: "Intermittent no crank when hot" }, vehicleId: "vehicle-1", version: 4 }; },
    async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "DRAFT", version: 1 }; },
    async get() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "DRAFT", version: 1 }; },
    async list() { return []; },
    async create() { return { duplicate: false, result: { id: "case-1" }, version: 1 }; },
    async assign() { return { duplicate: false, result: { assignedUserId: "tech-2", id: "case-1" }, version: 2 }; },
    async transition() { return { duplicate: false, result: { id: "case-1", status: "TRIAGE" }, version: 2 }; },
    ...overrides
  };
}

describe("diagnostic case service", () => {
  it("creates from the canonical repair-order concern with a version-zero case command", async () => {
    const create = vi.fn<DiagnosticCaseRepository["create"]>(async () => ({ duplicate: false, result: { id: "case-1" }, version: 1 }));
    const result = await createDiagnosticCase(technician, {
      assignedUserId: "tech-1",
      idempotencyKey: "create-1",
      operatingConditions: { manifestation: "hot soak" },
      reason: "Open a diagnostic case from customer intake.",
      reasonCode: "CASE_NEW_CONCERN",
      repairOrderId: "ro-1",
      riskTier: "R1"
    }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository({ create }) });
    expect(result).toMatchObject({ duplicate: false, version: 1 });
    const [command, data] = create.mock.calls[0];
    expect(command).toMatchObject({ domain: "DIAGNOSTICS", expectedVersion: 0, subjectType: "DIAGNOSTIC_CASE" });
    expect(data).toMatchObject({ canonicalConcernStatement: "Intermittent no crank when hot", concernKey: "PRIMARY", concernSource: "REPAIR_ORDER_CONCERN", concernStatement: "Intermittent no crank when hot", repairOrderVersion: 4 });
  });

  it("requires assignment authority when a creator assigns another technician", async () => {
    await expect(createDiagnosticCase(technician, {
      assignedUserId: "tech-2", idempotencyKey: "create-2", reason: "Open and assign this diagnostic concern.", reasonCode: "CASE_NEW_CONCERN", repairOrderId: "ro-1", riskTier: "R1"
    }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository() })).rejects.toThrow("DIAGNOSTIC_CASE_ASSIGN");
  });

  it("allows managers to assign and assigned technicians to progress a case", async () => {
    await expect(assignDiagnosticCase(manager, "case-1", { assignedUserId: "tech-2", expectedVersion: 1, idempotencyKey: "assign-1", reason: "Assign to the qualified starting-system technician.", reasonCode: "CASE_REASSIGNED_CAPABILITY" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository() })).resolves.toMatchObject({ version: 2 });
    await expect(transitionDiagnosticCase(technician, "case-1", { expectedVersion: 1, idempotencyKey: "triage-1", reason: "Start structured diagnostic triage now.", reasonCode: "CASE_TRIAGE_STARTED", targetStatus: "TRIAGE" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository() })).resolves.toMatchObject({ version: 2 });
  });

  it("denies a technician transition when the case belongs to another technician", async () => {
    const otherCase = repository({ async getIdentity() { return { assignedUserId: "tech-2", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "DRAFT", version: 1 }; } });
    await expect(transitionDiagnosticCase(technician, "case-1", { expectedVersion: 1, idempotencyKey: "triage-2", reason: "Attempt work on another technician case.", reasonCode: "CASE_TRIAGE_STARTED", targetStatus: "TRIAGE" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: otherCase })).rejects.toThrow("requires assignment");
  });

  it("lets the repository resolve an exact transition replay after state has advanced", async () => {
    const transition = vi.fn<DiagnosticCaseRepository["transition"]>(async () => ({ duplicate: true, result: { id: "case-1", status: "TRIAGE" }, version: 2 }));
    const advanced = repository({
      async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "TRIAGE", version: 2 }; },
      transition
    });
    await expect(transitionDiagnosticCase(technician, "case-1", { expectedVersion: 1, idempotencyKey: "triage-replay", reason: "Start structured diagnostic triage now.", reasonCode: "CASE_TRIAGE_STARTED", targetStatus: "TRIAGE" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: advanced })).resolves.toMatchObject({ duplicate: true, version: 2 });
    expect(transition).toHaveBeenCalledOnce();
  });

  it("permission-filters case queues for own-resource grants", async () => {
    const ownGrant = { capability: "DIAGNOSTIC_CASE_VIEW", constraints: { ownResourcesOnly: true }, effect: "ALLOW" as const, locationId: null, validFrom: new Date("2026-01-01"), validTo: null };
    const cases = await listDiagnosticCases(limited, {
      foundationRepository: foundation({ async listCapabilityGrants() { return [ownGrant]; } }),
      organizationId: "org-1",
      repository: repository({ async list() { return [
        { assignedUserId: "limited-1", id: "own", locationId: "loc-1", resumeStatus: null, status: "TRIAGE", version: 2 },
        { assignedUserId: "tech-1", id: "other", locationId: "loc-1", resumeStatus: null, status: "TRIAGE", version: 2 }
      ]; } })
    });
    expect(cases.map((item) => item.id)).toEqual(["own"]);
  });

  it("keeps mutations disabled when the diagnostics rollout master is off", async () => {
    const disabled = foundation({ async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER", "OFF"), flag("DIAGNOSTIC_CASES", "GENERAL")]; } });
    await expect(assignDiagnosticCase(manager, "case-1", { assignedUserId: "tech-2", expectedVersion: 1, idempotencyKey: "assign-off", reason: "Attempt assignment while feature is disabled.", reasonCode: "CASE_REASSIGNED_CAPABILITY" }, { foundationRepository: disabled, organizationId: "org-1", repository: repository() })).rejects.toThrow("MASTER_DISABLED");
  });
});
