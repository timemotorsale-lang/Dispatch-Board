import { describe, expect, it } from "vitest";

import { nextTestExecutionState, normalizeDiagnosticTestDefinition, normalizeDiagnosticTestLifecycle, normalizeDiagnosticTestPlan } from "@/server/diagnostics/test-execution-domain";

const command = { expectedVersion: 3, idempotencyKey: "test-command-1", reason: "Create a governed diagnostic test workflow." };

describe("diagnostic test planning and execution domain", () => {
  it("normalizes a source-backed immutable test definition with a semantic checksum", () => {
    const result = normalizeDiagnosticTestDefinition({ ...command, expectedVersion: 0, definitionKey: "battery-loaded-voltage", definitionVersion: 1, name: "Battery loaded voltage", purpose: "Measure available voltage while the starting circuit is loaded.", procedure: [{ step: 1, instruction: "Connect at battery posts." }], sourceVersions: [{ sourceId: "oem-1", version: "2026.1", rightsStatus: "AUTHORIZED" }], estimatedMinutes: 10, riskTier: "R2" }, new Date("2026-07-21T00:00:00Z"));
    expect(result).toMatchObject({ definitionKey: "BATTERY-LOADED-VOLTAGE", definitionVersion: 1, estimatedMinutes: 10, riskTier: "R2" });
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects definitions without procedure or governed sources and invalid time windows", () => {
    const base = { ...command, expectedVersion: 0, definitionKey: "x", definitionVersion: 1, name: "Test", purpose: "A sufficiently specific test purpose.", estimatedMinutes: 5 };
    expect(() => normalizeDiagnosticTestDefinition({ ...base, sourceVersions: [{ sourceId: "s1", version: "1", rightsStatus: "AUTHORIZED" }] })).toThrow("procedure step");
    expect(() => normalizeDiagnosticTestDefinition({ ...base, procedure: [{}] })).toThrow("governed source");
    expect(() => normalizeDiagnosticTestDefinition({ ...base, procedure: [{}], sourceVersions: [{ sourceId: "s1", version: "1", rightsStatus: "AUTHORIZED" }], effectiveAt: "2026-07-22", expiresAt: "2026-07-21" })).toThrow("expiry");
    expect(() => normalizeDiagnosticTestDefinition({ ...base, procedure: [{}], sourceVersions: [{ sourceId: "s1", version: "1", rightsStatus: "AUTHORIZED", validUntil: "2020-01-01" }] }, new Date("2026-07-21"))).toThrow("Expired");
  });

  it("validates graph references, uniqueness, and cycles", () => {
    const node = { nodeKey: "A", definitionVersionId: "def-1", title: "First test", sequence: 1, dependencyNodeKeys: [] };
    expect(normalizeDiagnosticTestPlan({ ...command, rationale: "Use the shortest safe evidence path.", nodes: [node, { ...node, nodeKey: "B", sequence: 2, dependencyNodeKeys: ["A"] }] }).nodes).toHaveLength(2);
    expect(() => normalizeDiagnosticTestPlan({ ...command, rationale: "Use the shortest safe evidence path.", nodes: [{ ...node, dependencyNodeKeys: ["MISSING"] }] })).toThrow("missing dependency");
    expect(() => normalizeDiagnosticTestPlan({ ...command, rationale: "Use the shortest safe evidence path.", nodes: [{ ...node, branchRules: [{ when: "PASS", targetNodeKey: "MISSING" }] }] })).toThrow("missing branch target");
    expect(() => normalizeDiagnosticTestPlan({ ...command, rationale: "Use the shortest safe evidence path.", nodes: [node, { ...node, nodeKey: "B", dependencyNodeKeys: ["C"] }, { ...node, nodeKey: "C", dependencyNodeKeys: ["B"] }] })).toThrow("cycle");
  });

  it("enforces lifecycle transitions, stable reason codes, and deviation disclosure", () => {
    expect(nextTestExecutionState(null, "START")).toBe("RUNNING");
    expect(nextTestExecutionState("RUNNING", "PAUSE")).toBe("PAUSED");
    expect(nextTestExecutionState("PAUSED", "RESUME")).toBe("RUNNING");
    expect(() => nextTestExecutionState("COMPLETED", "PAUSE")).toThrow("cannot pause");
    expect(() => normalizeDiagnosticTestLifecycle({ ...command, reasonCode: "TEST_COMPLETED_WITH_DEVIATION", executionKey: "exec-1" }, "COMPLETE")).toThrow("at least one deviation");
    expect(() => normalizeDiagnosticTestLifecycle({ ...command, reasonCode: "TEST_COMPLETED", executionKey: "exec-1" }, "COMPLETE")).toThrow("structured results");
    expect(normalizeDiagnosticTestLifecycle({ ...command, reasonCode: "TEST_CONNECTION_LOST", executionKey: "exec-1" }, "PAUSE").reasonCode).toBe("TEST_CONNECTION_LOST");
  });
});
