import { describe, expect, it } from "vitest";

import { calculateExpectedInformationGain, createDiagnosticTestOverride, evaluateAdaptiveDiagnosticTests, type DiagnosticAdaptiveTestingContext, type DiagnosticTestCandidateDefinition } from "@/server/diagnostics/adaptive-testing";

const context: DiagnosticAdaptiveTestingContext = {
  diagnosticCaseId: "case-1", reasoningEvaluationId: "reason-1", reasoningResultChecksum: "a".repeat(64), now: "2026-07-21T18:00:00Z",
  vehicle: { make: "Ford", model: "F-150", year: 2020, configuration: { engine: "3.5L" }, state: "KEY_OFF" },
  viableHypothesisKeys: ["HYP_BATTERY", "HYP_GROUND", "HYP_STARTER"], unresolvedConflictKeys: ["CONFLICT_001"],
  satisfiedPrerequisites: ["VISUAL_INSPECTION"], controlledHazards: ["ARC_FLASH"], capabilities: ["DIAGNOSTIC_TEST_EXECUTE"], qualifications: ["ASE_ELECTRICAL"], availableTools: ["DVOM"], availableResources: ["ELECTRICAL_BAY"], authorizations: ["CUSTOMER_DIAGNOSTIC_AUTH"]
};

const definition = (overrides: Partial<DiagnosticTestCandidateDefinition> = {}): DiagnosticTestCandidateDefinition => ({
  definitionVersionId: "def-loaded-drop-v1", testKey: "LOADED_DROP", name: "Loaded voltage drop",
  distinguishesHypothesisKeys: ["HYP_BATTERY", "HYP_GROUND", "HYP_STARTER"], resolvesConflictKeys: ["CONFLICT_001"],
  outcomePartitions: [{ outcomeKey: "SOURCE_LOW", hypothesisKeys: ["HYP_BATTERY"] }, { outcomeKey: "GROUND_HIGH", hypothesisKeys: ["HYP_GROUND"] }, { outcomeKey: "CURRENT_ABNORMAL", hypothesisKeys: ["HYP_STARTER"] }],
  applicability: { makes: ["FORD"], minimumYear: 2015, requiredConfiguration: { engine: "3.5L" } }, prerequisites: ["VISUAL_INSPECTION"], hazards: ["ARC_FLASH"], requiredCapabilities: ["DIAGNOSTIC_TEST_EXECUTE"], qualifications: ["ASE_ELECTRICAL"], tools: ["DVOM"], requiredVehicleStates: ["KEY_OFF"], requiredAuthorizations: ["CUSTOMER_DIAGNOSTIC_AUTH"],
  sourceVersions: [{ sourceKey: "OEM-1", version: "1", rightsStatus: "AUTHORIZED", effectiveAt: "2026-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z" }], effectiveAt: "2026-01-01T00:00:00Z", estimatedMinutes: 20, estimatedCostCents: 3000,
  invasiveness: 0.1, vehicleRisk: 0.1, setupDelay: 0.1, resourceReadiness: 1, reliability: 0.95, riskReduction: 0.8, downstreamUnblocking: 0.9, ...overrides
});

describe("DGN-024–025 adaptive diagnostic testing", () => {
  it("computes normalized expected information gain from outcome partitions", () => {
    expect(calculateExpectedInformationGain(definition(), context)).toBe(1);
    expect(calculateExpectedInformationGain(definition({ outcomePartitions: [{ outcomeKey: "SAME", hypothesisKeys: context.viableHypothesisKeys }] }), context)).toBe(0);
  });

  it("records every failed hard gate and never ranks an excluded test", () => {
    const blocked = definition({ testKey: "BLOCKED", definitionVersionId: "blocked-v1", applicability: { makes: ["TOYOTA"] }, prerequisites: ["SCAN_COMPLETE"], hazards: ["HIGH_VOLTAGE"], requiredCapabilities: ["OEM_FLASH"], qualifications: ["EV_CERTIFIED"], tools: ["SCOPE"], requiredResources: ["HIGH_VOLTAGE_BAY"], requiredVehicleStates: ["ENGINE_RUNNING"], requiredAuthorizations: ["TEARDOWN_AUTH"], sourceVersions: [{ sourceKey: "OEM-X", version: "1", rightsStatus: "PENDING", effectiveAt: "2026-01-01T00:00:00Z", expiresAt: "2026-07-01T00:00:00Z" }], expiresAt: "2026-07-01T00:00:00Z" });
    const result = evaluateAdaptiveDiagnosticTests({ context, definitions: [definition(), blocked] });
    expect(result.eligibleTests.map((item) => item.testKey)).toEqual(["LOADED_DROP"]);
    expect(result.excludedTests[0].reasonCodes).toEqual(expect.arrayContaining(["TEST_WRONG_VEHICLE_MAKE", "TEST_PREREQUISITE_MISSING:SCAN_COMPLETE", "TEST_HAZARD_UNCONTROLLED:HIGH_VOLTAGE", "TEST_CAPABILITY_REQUIRED:OEM_FLASH", "TEST_QUALIFICATION_REQUIRED:EV_CERTIFIED", "TEST_TOOL_UNAVAILABLE:SCOPE", "TEST_RESOURCE_UNAVAILABLE:HIGH_VOLTAGE_BAY", "TEST_VEHICLE_STATE_MISMATCH", "TEST_AUTHORIZATION_REQUIRED:TEARDOWN_AUTH", "TEST_SOURCE_NOT_AUTHORIZED", "TEST_SOURCE_EXPIRED", "TEST_DEFINITION_EXPIRED"]));
  });

  it("excludes tests that cannot discriminate or resolve current uncertainty", () => {
    const result = evaluateAdaptiveDiagnosticTests({ context, definitions: [definition({ distinguishesHypothesisKeys: ["HYP_BATTERY"], resolvesConflictKeys: [] })] });
    expect(result).toMatchObject({ eligibleTests: [], recommendedTestKey: null, abstentionRequired: true });
    expect(result.excludedTests[0].reasonCodes).toEqual(expect.arrayContaining(["TEST_DOES_NOT_DISCRIMINATE_VIABLE_HYPOTHESES", "TEST_DOES_NOT_RESOLVE_UNCERTAINTY"]));
  });

  it("uses disclosed weights, preserves alternatives, and applies stable tie-breaks", () => {
    const a = definition({ testKey: "A_TEST", definitionVersionId: "a-v1" }); const b = definition({ testKey: "B_TEST", definitionVersionId: "b-v1" });
    const first = evaluateAdaptiveDiagnosticTests({ context, definitions: [b, a], maximumLookAheadTests: 2 }); const second = evaluateAdaptiveDiagnosticTests({ context, definitions: [a, b], maximumLookAheadTests: 2 });
    expect(first.recommendedTestKey).toBe("A_TEST"); expect(first.alternatives).toEqual(["B_TEST"]); expect(first.resultChecksum).toBe(second.resultChecksum);
    expect(first.eligibleTests[0].factors.informationGain).toMatchObject({ normalizedValue: 1, weight: 0.26, contribution: 0.26 });
    expect(first.eligibleTests[0].factors.cost.contribution).toBeLessThan(0);
  });

  it("makes cost and safety tradeoffs visible instead of hiding them", () => {
    const safe = definition({ testKey: "SAFE", definitionVersionId: "safe-v1", estimatedMinutes: 10, estimatedCostCents: 1000, vehicleRisk: 0.05 });
    const invasive = definition({ testKey: "INVASIVE", definitionVersionId: "invasive-v1", estimatedMinutes: 120, estimatedCostCents: 80_000, invasiveness: 1, vehicleRisk: 1 });
    const result = evaluateAdaptiveDiagnosticTests({ context, definitions: [invasive, safe] });
    expect(result.recommendedTestKey).toBe("SAFE"); expect(result.eligibleTests.find((item) => item.testKey === "INVASIVE")?.factors.invasivenessAndVehicleRisk.contribution).toBeLessThan(0);
  });

  it("rejects hidden or malformed weights", () => {
    expect(() => evaluateAdaptiveDiagnosticTests({ context, definitions: [definition()], weights: { informationGain: 1, riskReduction: 1, downstreamUnblocking: 0, reliability: 0, technicianTime: 0, cost: 0, invasivenessAndVehicleRisk: 0, setupAndResourceDelay: 0, lookAhead: 0 } })).toThrow("sum to one");
  });

  it("records an authorized eligible override and blocks hard-gate bypass", () => {
    const override = createDiagnosticTestOverride({ evaluationId: "adaptive-1", recommendedTestKey: "A_TEST", selectedTestKey: "B_TEST", eligibleTestKeys: ["A_TEST", "B_TEST"], actorUserId: "tech-1", reason: "Start with the safer access point.", authorized: true });
    expect(override).toMatchObject({ recommendedTestKey: "A_TEST", selectedTestKey: "B_TEST", reasonCode: "TEST_RECOMMENDATION_OVERRIDDEN" }); expect(override.lineageChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(() => createDiagnosticTestOverride({ evaluationId: "adaptive-1", recommendedTestKey: "A_TEST", selectedTestKey: "BLOCKED", eligibleTestKeys: ["A_TEST"], actorUserId: "tech-1", reason: "Attempt excluded selection.", authorized: true })).toThrow("excluded test");
    expect(() => createDiagnosticTestOverride({ evaluationId: "adaptive-1", recommendedTestKey: "A_TEST", selectedTestKey: "B_TEST", eligibleTestKeys: ["A_TEST", "B_TEST"], actorUserId: "tech-1", reason: "Attempt without authority.", authorized: false })).toThrow("explicit technician authority");
  });
});
