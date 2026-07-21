import { describe, expect, it } from "vitest";

import { assertDiagnosticGateReady, buildDiagnosticCaseQualitySummary, evaluateDiagnosticQualitySafetyGates } from "@/server/diagnostics/quality-safety-gates";

const now = new Date("2026-07-21T12:00:00Z");
const definition = {
  applicability: { allowedMakes: ["FORD"], allowedRiskTiers: ["R1", "R2"], minimumYear: 2015, maximumYear: 2026 },
  effectiveAt: "2026-01-01T00:00:00Z", expiresAt: null, hazards: [], prerequisites: [], qualifications: [], requiredEvidence: [], riskTier: "R2",
  sourceVersions: [{ sourceId: "oem-1", version: "2026.1", rightsStatus: "AUTHORIZED", validUntil: "2027-01-01T00:00:00Z" }], tools: [], vehicleState: {}
};
const vehicle = { id: "vehicle-1", vin: "VIN1", year: 2020, make: "Ford", model: "F-150" };
const base = { caseRiskTier: "R2", definition, now, phase: "START" as const, vehicle };
const measurement = {
  instrument: { name: "DVOM", calibrationStatus: "CURRENT" }, independenceGroup: "METER-1", measuredAt: "2026-07-21T11:55:00Z", normalizedUnit: "V", normalizedValue: "12.60000000",
  plausibilityStatus: "PLAUSIBLE", qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", quantity: "VOLTAGE", supersededById: null
};

describe("DGN-019 diagnostic quality and safety gates", () => {
  it("passes an applicable, authorized, dependency-free low-risk test", () => {
    const result = evaluateDiagnosticQualitySafetyGates(base);
    expect(result).toMatchObject({ policyVersion: "DGN-019/1.0.0", disposition: "READY", ready: true, abstentionRequired: false, reasonCodes: [] });
    expect(() => assertDiagnosticGateReady(result)).not.toThrow();
  });

  it("blocks wrong-vehicle applicability and requires abstention", () => {
    const result = evaluateDiagnosticQualitySafetyGates({ ...base, vehicle: { ...vehicle, make: "Toyota" } });
    expect(result).toMatchObject({ disposition: "NOT_APPLICABLE", ready: false, abstentionRequired: true });
    expect(result.reasonCodes).toContain("SOURCE_WRONG_VEHICLE_MAKE");
    const planMismatch = evaluateDiagnosticQualitySafetyGates({ ...base, planApplicability: { allowedModels: ["MUSTANG"] } });
    expect(planMismatch.reasonCodes).toContain("SOURCE_WRONG_VEHICLE_MODEL");
    const prohibited = evaluateDiagnosticQualitySafetyGates({ ...base, caseRiskTier: "R4" });
    expect(prohibited.reasonCodes).toContain("SAFETY_R4_PROHIBITED");
  });

  it("blocks expired, withdrawn, and rights-held sources", () => {
    const expired = evaluateDiagnosticQualitySafetyGates({ ...base, definition: { ...definition, sourceVersions: [{ rightsStatus: "AUTHORIZED", validUntil: "2026-07-20T00:00:00Z" }] } });
    expect(expired).toMatchObject({ disposition: "BLOCKED", reasonCodes: expect.arrayContaining(["SOURCE_EXPIRED"]) });
    const withdrawn = evaluateDiagnosticQualitySafetyGates({ ...base, definition: { ...definition, sourceVersions: [{ rightsStatus: "WITHDRAWN" }] } });
    expect(withdrawn.reasonCodes).toContain("SOURCE_WITHDRAWN");
  });

  it("enforces exact prerequisites, hazards, tools, vehicle state, qualifications, and plan dependencies", () => {
    const controlledDefinition = { ...definition, prerequisites: [{ code: "BATTERY_SECURED" }], hazards: [{ code: "ROTATING_COMPONENTS" }], tools: [{ code: "DVOM_CAT_III" }], vehicleState: { ignition: "OFF" }, qualifications: [{ code: "ELECTRICAL_L2" }] };
    const blocked = evaluateDiagnosticQualitySafetyGates({ ...base, definition: controlledDefinition, dependencyNodeKeys: ["IDENTITY"], prerequisiteSnapshot: {} });
    expect(blocked.reasonCodes).toEqual(expect.arrayContaining(["TEST_DEPENDENCY_INCOMPLETE", "SAFETY_PREREQUISITE_MISSING", "SAFETY_HAZARD_UNCONTROLLED", "TEST_TOOL_UNAVAILABLE", "AUTH_QUALIFICATION_MISSING", "TEST_VEHICLE_STATE_UNVERIFIED"]));
    const ready = evaluateDiagnosticQualitySafetyGates({ ...base, actualConditions: { ignition: "OFF" }, completedDependencyNodeKeys: ["IDENTITY"], definition: controlledDefinition, dependencyNodeKeys: ["IDENTITY"], prerequisiteSnapshot: { satisfiedPrerequisiteCodes: ["BATTERY_SECURED"], controlledHazardCodes: ["ROTATING_COMPONENTS"], availableToolCodes: ["DVOM_CAT_III"] }, verifiedQualificationCodes: ["ELECTRICAL_L2"] });
    expect(ready.disposition).toBe("READY");
  });

  it("fails invalid units, impossible values, expired instruments, and stale evidence", () => {
    const result = evaluateDiagnosticQualitySafetyGates({ ...base, phase: "COMPLETE", definition: { ...definition, applicability: { ...definition.applicability, evidenceMaxAgeMinutes: 5 } }, measurements: [{ ...measurement, instrument: { calibrationStatus: "EXPIRED" }, measuredAt: "2026-07-21T11:00:00Z", normalizedUnit: "", normalizedValue: "not-a-number", plausibilityStatus: "OUT_OF_RANGE", qualityStatus: "INVALID" }] });
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["DATA_INVALID", "DATA_UNIT_INVALID", "DATA_IMPLAUSIBLE", "DATA_INSTRUMENT_CALIBRATION_EXPIRED", "DATA_STALE"]));
    expect(result.disposition).toBe("BLOCKED");
  });

  it("requires complete, current, independent evidence instead of accepting a correlated count", () => {
    const evidenceDefinition = { ...definition, requiredEvidence: [{ code: "LOADED_VOLTAGE", type: "MEASUREMENT", quantity: "VOLTAGE", normalizedUnit: "V", minimumCount: 2, minimumIndependentGroups: 2, maxAgeMinutes: 30 }] };
    const correlated = evaluateDiagnosticQualitySafetyGates({ ...base, definition: evidenceDefinition, evidenceSummary: {}, measurements: [measurement, { ...measurement, measuredAt: "2026-07-21T11:56:00Z" }], phase: "COMPLETE" });
    expect(correlated.reasonCodes).toContain("DATA_EVIDENCE_NOT_INDEPENDENT");
    const independent = evaluateDiagnosticQualitySafetyGates({ ...base, definition: evidenceDefinition, evidenceSummary: {}, measurements: [measurement, { ...measurement, independenceGroup: "METER-2", measuredAt: "2026-07-21T11:56:00Z" }], phase: "COMPLETE" });
    expect(independent.disposition).toBe("READY");
  });

  it("abstains on unresolved suspect evidence and fails closed when gate assertion is invoked", () => {
    const result = evaluateDiagnosticQualitySafetyGates({ ...base, measurements: [{ ...measurement, instrument: { calibrationStatus: "UNKNOWN" }, qualityStatus: "SUSPECT" }], phase: "COMPLETE" });
    expect(result).toMatchObject({ disposition: "ABSTAIN", abstentionRequired: true });
    expect(() => assertDiagnosticGateReady(result)).toThrow("require abstain");
  });

  it("produces a permission-neutral case quality summary without inventing readiness", () => {
    expect(buildDiagnosticCaseQualitySummary({ measurements: [], observations: [], now })).toMatchObject({ disposition: "ABSTAIN", reasonCodes: ["REASONING_INSUFFICIENT_EVIDENCE"] });
    expect(buildDiagnosticCaseQualitySummary({ measurements: [{ ...measurement, qualityStatus: "INVALID" }], observations: [], now })).toMatchObject({ disposition: "BLOCKED", reasonCodes: ["DATA_INVALID"] });
  });
});
