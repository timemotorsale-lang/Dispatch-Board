import { describe, expect, it } from "vitest";

import { evaluateDiagnosticReasoning, generateMinimalHittingSets, reviseDiagnosticTruth, type DiagnosticReasoningInput, type DiagnosticReasoningModel, type ReasoningEvidence } from "@/server/diagnostics/reasoning-core";

const assumptions = [
  { key: "BATTERY_HEALTH", label: "Battery behaves normally", abnormalModes: ["INSUFFICIENT_LOADED_CAPACITY"], expectedEffectKeys: ["LOADED_VOLTAGE_LOW"] },
  { key: "GROUND_PATH", label: "Ground path behaves normally", abnormalModes: ["HIGH_RESISTANCE"], expectedEffectKeys: ["GROUND_DROP_EXCESSIVE"] },
  { key: "STARTER_FUNCTION", label: "Starter behaves normally", abnormalModes: ["INTERNAL_FAILURE"], expectedEffectKeys: ["CURRENT_SPEED_INCONSISTENT"] },
  { key: "MECHANICAL_PATH", label: "Mechanical path rotates normally", abnormalModes: ["BINDING", "SEIZED"], expectedEffectKeys: ["ROTATION_ABSENT"] },
  { key: "MEASUREMENT_SETUP", label: "Measurement setup is valid", abnormalModes: ["INVALID_REFERENCE", "PROBE_ERROR"], expectedEffectKeys: ["EVIDENCE_CONFLICT"] },
  { key: "SHARED_POWER_GROUND", label: "Shared power and ground behave normally", abnormalModes: ["SHARED_HIGH_RESISTANCE"], expectedEffectKeys: ["MULTIPLE_MODULES_OFFLINE"], commonCauseFor: ["BATTERY_HEALTH", "STARTER_FUNCTION"] },
  { key: "INTERMITTENT_CONNECTION", label: "Intermittent connection remains stable", abnormalModes: ["INTERMITTENT_OPEN"], expectedEffectKeys: ["HOT_SOAK_FAILURE"], intermittent: true }
];
const model: DiagnosticReasoningModel = {
  modelVersion: "NO_START/1.0.0", ruleSetVersion: "RULES/1.0.0", knowledgeChecksum: "a".repeat(64), calculationVersions: ["DGN-021/1.0.0"],
  sourceVersions: [{ sourceKey: "DGN-SRC-005", version: "1", rightsStatus: "AUTHORIZED" }], applicability: { allowedMakes: ["FORD"], minimumYear: 2000, maximumYear: 2026 }, assumptions,
  rules: [
    { key: "GROUND_DROP", conditions: [{ factKey: "GROUND_DROP_EXCESSIVE", state: "PRESENT" }], conflictAssumptions: ["GROUND_PATH", "MEASUREMENT_SETUP"], reasonCode: "REASONING_GROUND_PATH_CONFLICT", explanation: "Healthy ground path and valid setup cannot explain excessive loaded drop.", resolutionTestKeys: ["NS_LOADED_PATH_VOLTAGE_DROP"] },
    { key: "LOW_SOURCE", conditions: [{ factKey: "LOADED_VOLTAGE_LOW", state: "PRESENT" }], conflictAssumptions: ["BATTERY_HEALTH", "MEASUREMENT_SETUP"], reasonCode: "REASONING_SOURCE_CAPACITY_CONFLICT", explanation: "Healthy source and setup cannot explain low loaded voltage." },
    { key: "NO_ROTATION", conditions: [{ factKey: "STARTER_COMMAND_PRESENT", state: "PRESENT" }, { factKey: "ROTATION_ABSENT", state: "PRESENT" }], conflictAssumptions: ["STARTER_FUNCTION", "MECHANICAL_PATH"], reasonCode: "REASONING_ROTATION_CONFLICT", explanation: "Commanded starting without rotation conflicts with healthy conversion and mechanical paths." },
    { key: "STARTER_CONFLICT", conditions: [{ factKey: "CURRENT_SPEED_INCONSISTENT", state: "PRESENT" }], conflictAssumptions: ["STARTER_FUNCTION"], reasonCode: "REASONING_STARTER_CONFLICT", explanation: "The qualified current/speed relationship conflicts with normal starter behavior." },
    { key: "INTERMITTENT", conditions: [{ factKey: "HOT_SOAK_FAILURE", state: "PRESENT" }], conflictAssumptions: ["INTERMITTENT_CONNECTION"], reasonCode: "REASONING_INTERMITTENT_CONFLICT", explanation: "The time-bounded manifestation conflicts with a continuously healthy connection." }
  ]
};

const evidence = (key: string, state: "PRESENT" | "ABSENT" = "PRESENT", extra: Partial<ReasoningEvidence> = {}): ReasoningEvidence => ({ key: `EV_${key}_${state}`, evidenceId: `id-${key}-${state}`, evidenceType: "MEASUREMENT", factKey: key, state, quality: "VALID", qualityReasonCode: "DATA_VALID", independenceGroup: `GROUP_${key}`, observedAt: "2026-07-21T17:00:00Z", ...extra });
const input = (items: ReasoningEvidence[], overrides: Partial<DiagnosticReasoningInput> = {}): DiagnosticReasoningInput => ({ diagnosticCaseId: "case-1", concernVersionId: "concern-1", vehicle: { id: "vehicle-1", make: "Ford", model: "F-150", year: 2020 }, model, evidence: items, gateDisposition: "READY", gateReasonCodes: [], now: new Date("2026-07-21T17:00:00Z"), ...overrides });

describe("DGN-022–023 deterministic reasoning core", () => {
  it("generates minimal single-fault candidates and distinguishes support from compatibility", () => {
    const result = evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE", "PRESENT", { supportsAssumptions: ["GROUND_PATH"] })]), () => 100);
    expect(result.conflicts).toHaveLength(1);
    expect(result.candidates.map((candidate) => candidate.assumptions)).toEqual([["GROUND_PATH"], ["MEASUREMENT_SETUP"]]);
    expect(result.candidates[0]).toMatchObject({ status: "SUPPORTED", causalState: "CAUSAL_SUPPORT", missingExpectedEvidenceKeys: [] });
    expect(result.recommendedTests).toEqual(["NS_LOADED_PATH_VOLTAGE_DROP"]);
    expect(result.abstentionRequired).toBe(false);
  });

  it("creates subset-minimal multiple-fault hitting sets with deterministic ordering", () => {
    const independentModel = { ...model, assumptions: model.assumptions.map((assumption) => ({ ...assumption, commonCauseFor: undefined })) };
    const result = evaluateDiagnosticReasoning(input([evidence("LOADED_VOLTAGE_LOW"), evidence("STARTER_COMMAND_PRESENT"), evidence("ROTATION_ABSENT")], { model: independentModel }), () => 100);
    expect(result.conflicts.map((conflict) => conflict.assumptions)).toEqual([["BATTERY_HEALTH", "MEASUREMENT_SETUP"], ["MECHANICAL_PATH", "STARTER_FUNCTION"]]);
    expect(result.candidates.map((candidate) => candidate.assumptions)).toEqual([
      ["BATTERY_HEALTH", "MECHANICAL_PATH"], ["BATTERY_HEALTH", "STARTER_FUNCTION"], ["MEASUREMENT_SETUP", "MECHANICAL_PATH"], ["MEASUREMENT_SETUP", "STARTER_FUNCTION"]
    ]);
  });

  it("retains a modeled common cause alongside an independent multiple-fault diagnosis", () => {
    const commonModel = { ...model, rules: [model.rules[1], model.rules[3]] };
    const result = evaluateDiagnosticReasoning(input([evidence("LOADED_VOLTAGE_LOW"), evidence("CURRENT_SPEED_INCONSISTENT")], { model: commonModel }), () => 100);
    expect(result.candidates.some((candidate) => candidate.assumptions.join("|") === "BATTERY_HEALTH|STARTER_FUNCTION")).toBe(true);
    expect(result.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ assumptions: ["SHARED_POWER_GROUND"], commonCause: true })]));
  });

  it("marks intermittent candidates and preserves missing expected effects", () => {
    const result = evaluateDiagnosticReasoning(input([evidence("HOT_SOAK_FAILURE"), evidence("GROUND_DROP_EXCESSIVE", "ABSENT")]), () => 100);
    expect(result.candidates[0]).toMatchObject({ assumptions: ["INTERMITTENT_CONNECTION"], intermittent: true, causalState: "CAUSAL_SUPPORT" });
  });

  it("discloses bounded incomplete search and requires abstention", () => {
    const result = evaluateDiagnosticReasoning(input([evidence("LOADED_VOLTAGE_LOW"), evidence("STARTER_COMMAND_PRESENT"), evidence("ROTATION_ABSENT")], { bounds: { maximumExpansions: 1 } }), () => 100);
    expect(result).toMatchObject({ generationComplete: false, abstentionRequired: true, degraded: true });
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["REASONING_BOUNDED_SEARCH_INCOMPLETE", "REASONING_ABSTENTION_REQUIRED"]));
  });

  it("retracts prior hypotheses after evidence correction without changing history", () => {
    const prior = evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE")]), () => 100);
    const current = evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE", "ABSENT")]), () => 100);
    const revision = reviseDiagnosticTruth(prior, current);
    expect(revision.retractedHypothesisKeys).toEqual(["HYP_GROUND_PATH", "HYP_MEASUREMENT_SETUP"]);
    expect(prior.resultChecksum).not.toBe(current.resultChecksum);
    expect(current.reasonCodes).toContain("REASONING_INSUFFICIENT_EVIDENCE");
  });

  it("blocks wrong applicability and gate failures before treating candidates as actionable", () => {
    const wrongVehicle = evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE")], { vehicle: { id: "vehicle-1", make: "Toyota", model: "Camry", year: 2020 } }), () => 100);
    expect(wrongVehicle).toMatchObject({ abstentionRequired: true, hardBlockers: expect.arrayContaining(["SOURCE_WRONG_VEHICLE_MAKE"]) });
    const blocked = evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE")], { gateDisposition: "BLOCKED", gateReasonCodes: ["SAFETY_HAZARD_UNCONTROLLED"] }), () => 100);
    expect(blocked.reasonCodes).toContain("SAFETY_HAZARD_UNCONTROLLED");
  });

  it("lets direct contradiction defeat AI/common-fix association", () => {
    const result = evaluateDiagnosticReasoning(input([
      evidence("CURRENT_SPEED_INCONSISTENT", "PRESENT", { associatedAssumptions: ["STARTER_FUNCTION"], evidenceType: "MODEL_FACT", evidenceId: null }),
      evidence("STARTER_DIRECT_DISPROOF", "PRESENT", { contradictsAssumptions: ["STARTER_FUNCTION"], evidenceType: "TEST_EXECUTION" })
    ]), () => 100);
    const starter = result.candidates.find((candidate) => candidate.assumptions.includes("STARTER_FUNCTION"));
    expect(starter).toMatchObject({ assumptions: ["STARTER_FUNCTION"], status: "CONTRADICTED", causalState: "CONTRADICTED" });
    expect(starter?.explanationCodes).toContain("REASONING_CANDIDATE_CONTRADICTED");
    expect(result).toMatchObject({ abstentionRequired: true, reasonCodes: expect.arrayContaining(["REASONING_NO_CONSISTENT_DIAGNOSIS"]) });
  });

  it("detects incompatible qualified observations through evidence-validity assumptions", () => {
    const result = evaluateDiagnosticReasoning(input([
      evidence("GROUND_DROP_EXCESSIVE", "PRESENT", { validityAssumptionKey: "MEASUREMENT_SETUP" }),
      evidence("GROUND_DROP_EXCESSIVE", "ABSENT", { key: "EV_SECOND_METER", validityAssumptionKey: "MEASUREMENT_SETUP", independenceGroup: "SECOND_METER" })
    ]), () => 100);
    expect(result.conflicts).toEqual(expect.arrayContaining([expect.objectContaining({ assumptions: ["MEASUREMENT_SETUP"], hardBlocker: true })]));
    expect(result.abstentionRequired).toBe(true);
  });

  it("replays deterministically regardless of evidence input order", () => {
    const items = [evidence("LOADED_VOLTAGE_LOW"), evidence("STARTER_COMMAND_PRESENT"), evidence("ROTATION_ABSENT")];
    const first = evaluateDiagnosticReasoning(input(items), () => 100);
    const second = evaluateDiagnosticReasoning(input([...items].reverse()), () => 100);
    expect(first.inputChecksum).toBe(second.inputChecksum);
    expect(first.resultChecksum).toBe(second.resultChecksum);
    expect(first.candidates).toEqual(second.candidates);
  });

  it("validates rights, models, and hard computational ceilings", () => {
    expect(() => evaluateDiagnosticReasoning(input([], { model: { ...model, sourceVersions: [{ sourceKey: "held", version: "1", rightsStatus: "HOLD" }] } }), () => 100)).toThrow("authorized source");
    expect(() => generateMinimalHittingSets([["A"]], { maximumCandidateSize: 11 })).toThrow("safety ceiling");
    expect(() => evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE", "PRESENT", { evidenceId: null })]), () => 100)).toThrow("canonical evidence ID");
    expect(() => evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE", "PRESENT", { supportsAssumptions: ["UNKNOWN"] })]), () => 100)).toThrow("unknown assumption");
  });

  it("excludes invalid evidence instead of using it to generate a diagnosis", () => {
    const result = evaluateDiagnosticReasoning(input([evidence("GROUND_DROP_EXCESSIVE", "PRESENT", { quality: "INVALID", qualityReasonCode: "DATA_SETUP_INVALID" })]), () => 100);
    expect(result.candidates).toEqual([]);
    expect(result.excludedEvidence).toEqual([{ evidenceKey: "EV_GROUND_DROP_EXCESSIVE_PRESENT", reasonCode: "DATA_INVALID" }]);
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["DATA_EVIDENCE_EXCLUDED", "REASONING_INSUFFICIENT_EVIDENCE", "REASONING_ABSTENTION_REQUIRED"]));
  });
});
