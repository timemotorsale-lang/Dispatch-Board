import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260721213000_diagnostics_repair_handoffs/migration.sql", "utf8");

describe("DGN-028-032 repair handoff persistence", () => {
  it("defines immutable checksum-bound repair handoffs and diagnosis publication lineage", () => {
    expect(schema).toMatch(/model DiagnosticRepairHandoffVersion \{/);
    expect(schema).toMatch(/enum DiagnosticRepairHandoffType \{/);
    expect(schema).toMatch(/repairDiagnosisVersionId String\?/);
    expect(migration).toContain("repair handoff must bind to a confirmed conclusion with the exact checksum");
    expect(migration).toContain('"DiagnosticRepairHandoff_immutable"');
    expect(migration).toContain('"DiagnosticRepairHandoff_publish_check"');
  });
});
