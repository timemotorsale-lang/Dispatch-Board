import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("diagnostic test execution persistence", () => {
  it("defines versioned plans and append-only execution history with tenant integrity", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const sql = await readFile(path.join(process.cwd(), "prisma/migrations/20260721013000_diagnostics_test_execution/migration.sql"), "utf8");
    expect(schema).toMatch(/model DiagnosticTestDefinitionVersion \{/);
    expect(schema).toMatch(/model DiagnosticTestPlanVersion \{/);
    expect(schema).toMatch(/model DiagnosticTestPlanNode \{/);
    expect(schema).toMatch(/model DiagnosticTestExecution \{/);
    expect(sql).toMatch(/DiagnosticTestExecution_case_tenant_fkey/);
    expect(sql).toMatch(/DiagnosticTestExecution_key_revision_key/);
    expect(sql).toMatch(/DiagnosticTestExecution_immutable/);
    expect(sql).toMatch(/validate_diagnostic_test_lineage/);
    expect(sql).toMatch(/test execution evidence target is invalid/);
  });
});
