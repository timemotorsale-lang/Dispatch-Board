import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260720232000_diagnostics_evidence_foundation/migration.sql", "utf8");

describe("diagnostic evidence schema", () => {
  it("defines immutable tenant-scoped fact and link records", () => {
    for (const model of ["DiagnosticObservation", "DiagnosticMeasurement", "DiagnosticEvidenceLink"]) expect(schema).toContain(`model ${model}`);
    for (const trigger of ["DiagnosticObservation_immutable", "DiagnosticMeasurement_immutable", "DiagnosticEvidenceLink_immutable"]) expect(migration).toContain(trigger);
    expect(migration).toContain("DiagnosticObservation_case_tenant_fkey");
    expect(migration).toContain("DiagnosticMeasurement_concern_tenant_fkey");
    expect(migration).toContain("DiagnosticEvidenceLink_evidence_tenant_fkey");
  });

  it("enforces correction, availability, malware, vehicle, and target integrity", () => {
    expect(migration).toContain("validate_diagnostic_fact_lineage");
    expect(migration).toContain("validate_diagnostic_evidence_link");
    expect(migration).toContain("evidence_status <> 'AVAILABLE'");
    expect(migration).toContain("malware_status <> 'CLEAN'");
    expect(migration).toContain("diagnostic evidence must belong to the case vehicle");
    expect(migration).toContain("diagnostic evidence target type is not active yet");
  });
});
