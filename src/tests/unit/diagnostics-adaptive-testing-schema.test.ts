import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260721190000_diagnostics_adaptive_testing/migration.sql", "utf8");

describe("DGN-024–025 adaptive-testing persistence", () => {
  it("defines immutable tenant-scoped evaluation and override lineage", () => {
    expect(schema).toMatch(/model DiagnosticAdaptiveTestEvaluation \{/); expect(schema).toMatch(/model DiagnosticAdaptiveTestOverride \{/);
    expect(schema).toMatch(/reasoningResultChecksum\s+String/); expect(schema).toMatch(/weightsChecksum\s+String/); expect(schema).toMatch(/priorOverrideId\s+String\?\s+@unique/);
    expect(migration).toContain("adaptive test evaluation must bind to the same tenant, case, and reasoning checksum");
    expect(migration).toContain('"DiagnosticAdaptiveTestEvaluation_immutable"'); expect(migration).toContain('"DiagnosticAdaptiveTestOverride_immutable"');
    expect(migration).toContain('"DiagnosticAdaptiveTestEvaluation_recommendation_check"');
  });
});
