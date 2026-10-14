import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { DiagnosticCaseRepository } from "@/server/diagnostics/repository";
import { linkDiagnosticEvidence, recordDiagnosticMeasurement, recordDiagnosticObservation } from "@/server/diagnostics/service";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";

const technician: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };

function flag(code: string, mode: VehicleFeatureFlagRecord["mode"]): VehicleFeatureFlagRecord {
  return { id: code, organizationId: "org-1", locationId: null, code, mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds: [], targetAt: null, version: 1, updatedAt: new Date("2026-07-20T00:00:00Z") };
}

function foundation(mode: VehicleFeatureFlagRecord["mode"] = "GENERAL", grants: Awaited<ReturnType<EnterpriseCommandRepository["listCapabilityGrants"]>> = []): EnterpriseCommandRepository {
  return {
    async commit() { throw new Error("Not used."); }, async listCapabilityGrants() { return grants; },
    async listFeatureFlags() { return [flag("DIAGNOSTICS_MASTER", "GENERAL"), flag("DIAGNOSTIC_CASES", "GENERAL"), flag("DIAGNOSTIC_EVIDENCE", mode)]; },
    async updateFeatureFlag() { throw new Error("Not used."); }, async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; },
    async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {}
  };
}

function repository(overrides: Partial<DiagnosticCaseRepository> = {}): DiagnosticCaseRepository {
  return {
    async getIdentity() { return { assignedUserId: "tech-1", id: "case-1", locationId: "loc-1", resumeStatus: null, status: "TRIAGE", version: 3 }; },
    async get() { return { id: "case-1", vehicleId: "vehicle-1" } as never; }, async getRepairOrderContext() { return null; }, async list() { return []; },
    async create() { throw new Error("Not used."); }, async assign() { throw new Error("Not used."); }, async transition() { throw new Error("Not used."); },
    ...overrides
  };
}

const command = { expectedVersion: 3, idempotencyKey: "fact-1", reason: "Record reproducible technician evidence." };

describe("diagnostic evidence service", () => {
  it("records observations and measurements through case-scoped commands", async () => {
    const recordObservation = vi.fn(async () => ({ duplicate: false, result: { observationId: "obs-1" }, version: 4 }));
    await recordDiagnosticObservation(technician, "case-1", { ...command, statement: "Starter relay clicks once", factClass: "OBSERVED", source: "TECHNICIAN", independenceGroup: "direct-1" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository({ recordObservation }) });
    expect(recordObservation.mock.calls[0][0]).toMatchObject({ commandType: "RECORD_DIAGNOSTIC_OBSERVATION", domain: "DIAGNOSTICS", expectedVersion: 3, subjectId: "case-1" });

    const recordMeasurement = vi.fn(async () => ({ duplicate: false, result: { measurementId: "mea-1" }, version: 4 }));
    await recordDiagnosticMeasurement(technician, "case-1", { ...command, idempotencyKey: "measurement-1", quantity: "VOLTAGE", value: 12.6, unit: "V", source: "TEST_EQUIPMENT", independenceGroup: "dvom-1", instrument: { name: "DVOM", calibrationStatus: "CURRENT" } }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: repository({ recordMeasurement }) });
    expect(recordMeasurement.mock.calls[0][1]).toMatchObject({ normalizedValue: "12.60000000", normalizedUnit: "V", plausibilityStatus: "PLAUSIBLE" });
  });

  it("keeps evidence mutations behind the dedicated rollout flag", async () => {
    await expect(recordDiagnosticObservation(technician, "case-1", { ...command, statement: "Starter relay clicks once", source: "TECHNICIAN", independenceGroup: "direct-1" }, { foundationRepository: foundation("OFF"), organizationId: "org-1", repository: repository() })).rejects.toThrow("Diagnostic evidence mutations are not enabled");
  });

  it("rejects quarantined and restricted Vehicle Evidence before repository linking", async () => {
    const quarantined = repository({ async getEvidenceContext() { return { accessLevel: "INTERNAL", id: "evi-1", malwareStatus: "DETECTED", status: "QUARANTINED", vehicleIds: ["vehicle-1"] }; }, async linkEvidence() { throw new Error("must not execute"); } });
    await expect(linkDiagnosticEvidence(technician, "case-1", { ...command, evidenceObjectId: "evi-1", purpose: "Connector image", subjectType: "CASE", subjectId: "case-1" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: quarantined })).rejects.toThrow("malware-clean");

    const restricted = repository({ async getEvidenceContext() { return { accessLevel: "RESTRICTED", id: "evi-2", malwareStatus: "CLEAN", status: "AVAILABLE", vehicleIds: ["vehicle-1"] }; }, async linkEvidence() { throw new Error("must not execute"); } });
    await expect(linkDiagnosticEvidence(technician, "case-1", { ...command, evidenceObjectId: "evi-2", purpose: "Restricted image", subjectType: "CASE", subjectId: "case-1" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: restricted })).rejects.toThrow("VEHICLE_EVIDENCE_RESTRICTED_VIEW");
  });

  it("rejects cross-tenant, deleted, and wrong-vehicle evidence", async () => {
    const crossTenant = repository({ async getEvidenceContext() { return null; }, async linkEvidence() { throw new Error("must not execute"); } });
    await expect(linkDiagnosticEvidence(technician, "case-1", { ...command, evidenceObjectId: "other-org", purpose: "Cross tenant", subjectType: "CASE", subjectId: "case-1" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: crossTenant })).rejects.toThrow("not found");

    const deleted = repository({ async getEvidenceContext() { return { accessLevel: "INTERNAL", id: "deleted", malwareStatus: "CLEAN", status: "DELETED", vehicleIds: ["vehicle-1"] }; }, async linkEvidence() { throw new Error("must not execute"); } });
    await expect(linkDiagnosticEvidence(technician, "case-1", { ...command, evidenceObjectId: "deleted", purpose: "Deleted object", subjectType: "CASE", subjectId: "case-1" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: deleted })).rejects.toThrow("available and malware-clean");

    const wrongVehicle = repository({ async getEvidenceContext() { return { accessLevel: "INTERNAL", id: "wrong", malwareStatus: "CLEAN", status: "AVAILABLE", vehicleIds: ["vehicle-2"] }; }, async linkEvidence() { throw new Error("must not execute"); } });
    await expect(linkDiagnosticEvidence(technician, "case-1", { ...command, evidenceObjectId: "wrong", purpose: "Wrong vehicle", subjectType: "CASE", subjectId: "case-1" }, { enforceRollout: false, foundationRepository: foundation(), organizationId: "org-1", repository: wrongVehicle })).rejects.toThrow("does not belong");
  });

  it("allows explicitly authorized restricted evidence while retaining the governed object", async () => {
    const linkEvidence = vi.fn(async () => ({ duplicate: false, result: { diagnosticEvidenceLinkId: "del-1" }, version: 4 }));
    const restrictedGrant = { capability: "VEHICLE_EVIDENCE_RESTRICTED_VIEW", constraints: {}, effect: "ALLOW" as const, locationId: null, validFrom: new Date("2026-01-01"), validTo: null };
    const evidenceRepository = repository({ async getEvidenceContext() { return { accessLevel: "RESTRICTED", id: "restricted", malwareStatus: "CLEAN", status: "AVAILABLE", vehicleIds: ["vehicle-1"] }; }, linkEvidence });
    await expect(linkDiagnosticEvidence(technician, "case-1", { ...command, evidenceObjectId: "restricted", purpose: "Restricted engineering record", subjectType: "CASE", subjectId: "case-1" }, { enforceRollout: false, foundationRepository: foundation("GENERAL", [restrictedGrant]), organizationId: "org-1", repository: evidenceRepository })).resolves.toMatchObject({ version: 4 });
    expect(linkEvidence).toHaveBeenCalledOnce();
  });
});
