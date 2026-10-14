import { describe, expect, it } from "vitest";

import { assertKnowledgePackageUsable, normalizeDiagnosticKnowledgePackage, normalizeDiagnosticKnowledgeSource, traverseDiagnosticKnowledgeGraph } from "@/server/diagnostics/knowledge-domain";
import { createControlledNoStartKnowledgePackage, createControlledNoStartTestDefinitions } from "@/server/diagnostics/no-start-knowledge";

const now = new Date("2026-07-21T15:00:00Z");
const governance = {
  authoredByUserId: "author-1", technicalReviewedByUserId: "technical-reviewer-1", rightsReviewedByUserId: "rights-reviewer-1",
  ruleSetReviewedByUserId: "rule-reviewer-1", approvedAt: "2026-07-21T14:00:00Z", effectiveAt: "2026-07-21T14:30:00Z",
  retrievedAt: "2026-07-21T13:00:00Z", rightsStatus: "AUTHORIZED" as const, releaseState: "SHADOW" as const
};

describe("DGN-020 governed no-start knowledge", () => {
  it("builds a reviewed, citation-complete generic shadow package with a deterministic checksum", () => {
    const first = createControlledNoStartKnowledgePackage(governance, now);
    const second = createControlledNoStartKnowledgePackage(governance, now);
    expect(first).toMatchObject({ contractVersion: "DGN-020/1.0.0", ruleSetKey: "STARTING_CHARGING_NO_START", releaseState: "SHADOW" });
    expect(first.sources[0]).toMatchObject({ sourceKey: "DGN-SRC-005", rightsStatus: "AUTHORIZED", sourceClass: "ENGINEERING" });
    expect(first.sourceCitations[0]).toMatchObject({ sourceKey: "DGN-SRC-005", locator: { documents: ["DGN-003", "DGN-004"] } });
    expect(first.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(first.checksum).toBe(second.checksum);
    expect(() => assertKnowledgePackageUsable(first, now)).not.toThrow();
  });

  it("traverses functional, failure, test, verification, and escalation relationships without looping", () => {
    const pkg = createControlledNoStartKnowledgePackage(governance, now);
    const downstream = traverseDiagnosticKnowledgeGraph(pkg, "START_REQUEST", { maximumDepth: 20 });
    expect(downstream.map((node) => node.key)).toEqual(expect.arrayContaining(["CONTROL_INTERLOCKS", "MECHANICAL_ROTATION", "LOADED_PATH_DROP_TEST", "CHARGING_VERIFIED", "SECURITY_ESCALATION"]));
    const detectors = traverseDiagnosticKnowledgeGraph(pkg, "LOADED_PATH_DROP_TEST", { direction: "INBOUND", edgeKinds: ["DETECTED_BY"] });
    expect(detectors.map((node) => node.key)).toEqual(expect.arrayContaining(["HIGH_RESISTANCE_PATH", "LOADED_PATH_DROP_TEST"]));
  });

  it("emits four governed DGN-015 test definitions without inventing universal thresholds", () => {
    const definitions = createControlledNoStartTestDefinitions(governance, now);
    expect(definitions.map((definition) => definition.definitionKey)).toEqual(["NS_LOADED_SOURCE_VOLTAGE", "NS_LOADED_PATH_VOLTAGE_DROP", "NS_STARTER_CURRENT_SPEED", "NS_POST_REPAIR_CHARGING"]);
    expect(definitions.every((definition) => definition.checksum.match(/^[0-9a-f]{64}$/))).toBe(true);
    expect(definitions.every((definition) => definition.applicability.requiresVehicleSpecificLimitsWhenInterpreting === true)).toBe(true);
    expect(JSON.stringify(definitions)).not.toMatch(/passThreshold|failThreshold|replace/i);
    expect(() => createControlledNoStartTestDefinitions({ ...governance, rightsStatus: "HOLD" }, now)).toThrow("authorized engineering source");
  });

  it("rejects self-approval, unknown citations, held execution, and vehicle-specific active knowledge without applicability", () => {
    expect(() => createControlledNoStartKnowledgePackage({ ...governance, technicalReviewedByUserId: "author-1" }, now)).toThrow("cannot independently approve");
    expect(() => createControlledNoStartKnowledgePackage({ ...governance, rightsStatus: "HOLD" }, now)).toThrow("only authorized");
    const pkg = createControlledNoStartKnowledgePackage(governance, now);
    expect(() => normalizeDiagnosticKnowledgePackage({ ...pkg, nodes: [{ ...pkg.nodes[0], sourceKeys: ["UNKNOWN"] }] }, now)).toThrow("unknown source");
    expect(() => normalizeDiagnosticKnowledgePackage({ ...pkg, sourceCitations: [] }, now)).toThrow("explicit source citations");
    expect(() => normalizeDiagnosticKnowledgePackage({ ...pkg, sourceCitations: [{ sourceKey: "UNKNOWN", purpose: "Invalid source citation", locator: {} }] }, now)).toThrow("unknown source");
    expect(() => normalizeDiagnosticKnowledgePackage({ ...pkg, sources: [{ ...pkg.sources[0], sourceClass: "OEM_LICENSED", applicability: {} }], releaseState: "ACTIVE" }, now)).toThrow("explicit applicability");
  });

  it("fails closed after source withdrawal while preserving the historical shadow checksum", () => {
    const pkg = createControlledNoStartKnowledgePackage(governance, now);
    const withdrawn = normalizeDiagnosticKnowledgeSource({ ...pkg.sources[0], version: 2, rightsStatus: "WITHDRAWN", withdrawnAt: "2026-07-21T15:01:00Z", withdrawalReasonCode: "SOURCE_WITHDRAWN", approvedAt: null, technicalReviewedByUserId: null, rightsReviewedByUserId: null, supersedesId: "source-v1" }, now);
    expect(withdrawn).toMatchObject({ rightsStatus: "WITHDRAWN", supersedesId: "source-v1" });
    expect(() => assertKnowledgePackageUsable({ ...pkg, sources: [withdrawn] }, new Date("2026-07-21T15:02:00Z"))).toThrow("must abstain");
    expect(pkg.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects invalid graph edges and bounded traversal abuse", () => {
    const pkg = createControlledNoStartKnowledgePackage(governance, now);
    expect(() => normalizeDiagnosticKnowledgePackage({ ...pkg, edges: [...pkg.edges, { from: "START_REQUEST", to: "MISSING", kind: "ENABLES", sourceKeys: ["DGN-SRC-005"] }] }, now)).toThrow("unknown node");
    expect(() => traverseDiagnosticKnowledgeGraph(pkg, "START_REQUEST", { maximumDepth: 101 })).toThrow("0 through 100");
  });
});
