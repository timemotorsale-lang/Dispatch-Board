import { describe, expect, it } from "vitest";

import { diagnosticFactId, normalizeDiagnosticEvidenceLink, normalizeDiagnosticMeasurement, normalizeDiagnosticObservation } from "@/server/diagnostics/evidence-domain";

const command = { expectedVersion: 3, idempotencyKey: "evidence-command-1", reason: "Record reproducible diagnostic evidence." };

describe("diagnostic evidence domain", () => {
  it("normalizes compatible automotive units without discarding the entered value", () => {
    const pressure = normalizeDiagnosticMeasurement({ ...command, quantity: "PRESSURE", value: 30, unit: "psi", source: "TEST_EQUIPMENT", independenceGroup: "gauge-1", instrument: { name: "Fuel pressure gauge", calibrationStatus: "CURRENT" } });
    expect(pressure).toMatchObject({ valueDecimal: "30.00000000", unit: "psi", normalizedUnit: "kPa", normalizedValue: "206.84271880", plausibilityStatus: "PLAUSIBLE" });

    const temperature = normalizeDiagnosticMeasurement({ ...command, quantity: "TEMPERATURE", value: 212, unit: "°F", source: "TEST_EQUIPMENT", independenceGroup: "scan-1", instrument: { name: "Scan tool", calibrationStatus: "NOT_APPLICABLE" } });
    expect(temperature.normalizedValue).toBe("100.00000000");
    expect(temperature.normalizedUnit).toBe("°C");
  });

  it("rejects dimensional mismatch and invalid reference ordering", () => {
    expect(() => normalizeDiagnosticMeasurement({ ...command, quantity: "VOLTAGE", value: 12.6, unit: "psi", source: "TEST_EQUIPMENT", independenceGroup: "meter-1", instrument: { name: "DVOM" } })).toThrow("not valid for quantity");
    expect(() => normalizeDiagnosticMeasurement({ ...command, quantity: "VOLTAGE", value: 12.6, unit: "V", referenceMinimum: 14, referenceMaximum: 13, source: "TEST_EQUIPMENT", independenceGroup: "meter-1", instrument: { name: "DVOM" } })).toThrow("minimum cannot exceed");
  });

  it("preserves implausible readings as invalid evidence instead of silently clipping them", () => {
    const result = normalizeDiagnosticMeasurement({ ...command, quantity: "PERCENT", value: 140, unit: "%", source: "TEST_EQUIPMENT", independenceGroup: "scan-2", instrument: { name: "Scan tool" } });
    expect(result).toMatchObject({ normalizedValue: "140.00000000", plausibilityStatus: "OUT_OF_RANGE", qualityStatus: "INVALID", qualityReasonCode: "DATA_IMPLAUSIBLE" });
  });

  it("marks unknown or expired instrument calibration without inventing validity", () => {
    const unknown = normalizeDiagnosticMeasurement({ ...command, quantity: "VOLTAGE", value: 12.6, unit: "V", source: "TEST_EQUIPMENT", independenceGroup: "meter-unknown", instrument: { name: "DVOM" } });
    expect(unknown).toMatchObject({ qualityStatus: "SUSPECT", qualityReasonCode: "DATA_INSTRUMENT_CALIBRATION_UNVERIFIED" });
    const expired = normalizeDiagnosticMeasurement({ ...command, quantity: "VOLTAGE", value: 12.6, unit: "V", source: "TEST_EQUIPMENT", independenceGroup: "meter-expired", instrument: { name: "DVOM", calibrationStatus: "EXPIRED" } });
    expect(expired).toMatchObject({ qualityStatus: "INVALID", qualityReasonCode: "DATA_INSTRUMENT_CALIBRATION_EXPIRED" });
  });

  it("requires time-window integrity, raw provenance, and explicit independence groups", () => {
    expect(() => normalizeDiagnosticObservation({ ...command, statement: "Starter relay clicks", source: "TECHNICIAN" })).toThrow("Independence group");
    expect(() => normalizeDiagnosticObservation({ ...command, statement: "Starter relay clicks", source: "TECHNICIAN", independenceGroup: "direct-1", rawSource: {} })).toThrow("Raw source kind");
    expect(() => normalizeDiagnosticObservation({ ...command, statement: "Starter relay clicks", source: "TECHNICIAN", independenceGroup: "direct-1", observedAt: "2026-07-20T12:00:00Z", timeWindowStart: "2026-07-20T13:00:00Z" })).toThrow("within its time window");
  });

  it("records correction lineage as a new fact and creates deterministic identities", () => {
    const corrected = normalizeDiagnosticObservation({ ...command, idempotencyKey: "correction-1", statement: "Relay sound originated from HVAC actuator", source: "TECHNICIAN", independenceGroup: "direct-1", correctsId: "obs_prior" });
    expect(corrected).toMatchObject({ correctsId: "obs_prior", qualityReasonCode: "DATA_CORRECTED" });
    expect(diagnosticFactId("obs", "org-1", "case-1", "correction-1")).toBe(diagnosticFactId("obs", "org-1", "case-1", "correction-1"));
  });

  it("normalizes evidence link subjects and rejects unknown targets", () => {
    expect(normalizeDiagnosticEvidenceLink({ ...command, evidenceObjectId: "evi-1", purpose: "Photo documents connector corrosion", subjectType: "observation", subjectId: "obs-1" })).toMatchObject({ relationship: "SUPPORTS", subjectType: "OBSERVATION" });
    expect(() => normalizeDiagnosticEvidenceLink({ ...command, evidenceObjectId: "evi-1", purpose: "Bad target", subjectType: "PART", subjectId: "part-1" })).toThrow("subject type is invalid");
  });
});
