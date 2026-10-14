import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("DGN-020 diagnostic knowledge persistence", () => {
  it("defines immutable, tenant-scoped source, rule-set, citation, review, withdrawal, and rollback lineage", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const sql = await readFile(path.join(process.cwd(), "prisma/migrations/20260721150000_diagnostics_knowledge_calculations/migration.sql"), "utf8");
    expect(schema).toMatch(/model DiagnosticKnowledgeSourceVersion \{/);
    expect(schema).toMatch(/model DiagnosticRuleSetVersion \{/);
    expect(schema).toMatch(/model DiagnosticRuleSetSourceLink \{/);
    expect(sql).toMatch(/DiagnosticKnowledgeSource_review_check/);
    expect(sql).toMatch(/DiagnosticKnowledgeSource_withdrawal_check/);
    expect(sql).toMatch(/DiagnosticRuleSet_review_check/);
    expect(sql).toMatch(/DiagnosticRuleSetSource_source_tenant_fkey/);
    expect(sql).toMatch(/rule-set rollback must remain within one tenant and key/);
    expect(sql).toMatch(/DiagnosticRuleSetSource_immutable/);
  });
});
