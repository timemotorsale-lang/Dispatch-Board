import { describe, expect, it } from "vitest";

import { buildDiagnosticEvidenceReview } from "@/server/diagnostics/evidence-review";

const observation = { id: "obs-2", statement: "Relay click not repeatable", qualityStatus: "SUSPECT", qualityReasonCode: "DATA_CONFLICTING", source: "TECHNICIAN", reliability: "MEDIUM", observedAt: "2026-07-21T10:00:00Z", correctsId: "obs-1", correctedById: null, rawSource: { kind: "MANUAL" } };
const measurement = { id: "mea-2", quantity: "VOLTAGE", value: "9.00000000", unit: "V", normalizedValue: "9.00000000", normalizedUnit: "V", referenceMinimum: "10.00000000", referenceMaximum: "15.00000000", normalizedReferenceMin: "10.00000000", normalizedReferenceMax: "15.00000000", qualityStatus: "VALID", qualityReasonCode: "DATA_VALID", plausibilityStatus: "PLAUSIBLE", plausibilityReasonCode: "DATA_ENGINEERING_PLAUSIBLE", reliability: "HIGH", measuredAt: "2026-07-21T10:05:00Z", supersedesId: "mea-1", supersededById: null, rawSource: { kind: "DVOM" } };
const execution = { id: "exe-2", executionKey: "load-1", revision: 2, state: "COMPLETED", occurredAt: "2026-07-21T10:10:00Z", previousEventId: "exe-1", repeatOfExecutionKey: null, planNode: { id: "node-1", nodeKey: "LOAD", title: "Loaded voltage" }, reasonCode: "TEST_COMPLETED", results: { outcome: "FAIL" }, deviations: [], actualConditions: {} };

describe("diagnostic evidence review", () => {
  it("reconstructs timeline, matrix, expected/actual comparison, conflicts, sources, and lineage", () => {
    const review = buildDiagnosticEvidenceReview({ permitted: true, now: new Date("2026-07-21T12:00:00Z"), observations: [observation], measurements: [measurement], evidenceLinks: [{ id: "link-1", subjectType: "MEASUREMENT", subjectId: "mea-2", purpose: "Meter capture", relationship: "SUPPORTS", createdAt: "2026-07-21T10:06:00Z", evidence: { fileName: "meter.jpg", status: "AVAILABLE", malwareStatus: "CLEAN", checksumSha256: "abc", createdAt: "2026-07-21T10:06:00Z" } }], testExecutions: [execution], testPlans: [{ id: "plan-1", version: 1, status: "ACTIVE", createdAt: "2026-07-21T09:00:00Z", nodes: [{ id: "node-1", nodeKey: "LOAD", title: "Loaded voltage", definition: { definitionKey: "LOAD", version: 1, checksum: "checksum", effectiveAt: "2026-01-01T00:00:00Z", expiresAt: null, requiredEvidence: [] } }] }] });
    expect(review.timeline.map((item) => item.kind)).toEqual(["TEST", "ATTACHMENT", "MEASUREMENT", "OBSERVATION"]);
    expect(review.measurementMatrix[0]).toMatchObject({ quantity: "VOLTAGE", currentValue: "9.00000000", sampleCount: 1 });
    expect(review.comparisons[0].disposition).toBe("BELOW");
    expect(review.conflicts[0]).toMatchObject({ title: "Observation quality requires review" });
    expect(review.sources[0]).toMatchObject({ freshness: "CURRENT", version: "1" });
    expect(review.lineage.map((item) => item.kind)).toEqual(["RAW_OBSERVATION_SOURCE", "RAW_MEASUREMENT_SOURCE", "OBSERVATION_CORRECTION", "MEASUREMENT_SUPERSESSION", "TEST_REVISION"]);
  });

  it("fails closed when evidence permission is absent", () => {
    expect(buildDiagnosticEvidenceReview({ permitted: false, observations: [observation], measurements: [measurement], evidenceLinks: [], testExecutions: [execution], testPlans: [] })).toMatchObject({ state: "RESTRICTED", timeline: [], reconstructionComplete: false });
  });
});
