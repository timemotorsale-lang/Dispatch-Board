import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8"); const migration = readFileSync("prisma/migrations/20260721210000_diagnostics_conclusion_no_start_proof/migration.sql", "utf8");
describe("DGN-026 conclusion persistence", () => {
  it("defines immutable checksum-bound conclusion and review lineage", () => {
    expect(schema).toMatch(/model DiagnosticConclusionVersion \{/); expect(schema).toMatch(/enum DiagnosticConclusionAction \{/); expect(schema).toMatch(/enum DiagnosticConclusionStatus \{/);
    expect(migration).toContain("same tenant, case, concern, reasoning result, and checksum"); expect(migration).toContain('"DiagnosticConclusion_immutable"'); expect(migration).toContain('"DiagnosticConclusion_review_check"'); expect(migration).toContain('"DiagnosticConclusion_cause_check"');
  });
});
