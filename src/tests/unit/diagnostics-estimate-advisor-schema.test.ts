import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260721223000_diagnostics_advisor_estimate_foundation/migration.sql", "utf8");

describe("DGN-035-037 advisor estimate persistence", () => {
  it("defines immutable checksum-bound advisor estimate draft lineage", () => {
    expect(schema).toMatch(/model DiagnosticEstimateDraftVersion \{/);
    expect(schema).toMatch(/enum DiagnosticEstimateDraftStatus \{/);
    expect(schema).toContain("diagnosticEstimateDraftVersions");
    expect(migration).toContain("estimate draft must bind to a confirmed conclusion with exact checksum");
    expect(migration).toContain("estimate draft must bind to a published diagnosis handoff with exact checksum");
    expect(migration).toContain('"DiagnosticEstimateDraft_immutable"');
  });
});
