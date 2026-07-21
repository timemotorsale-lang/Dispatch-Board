import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("DGN-022–023 reasoning persistence", () => {
  it("defines immutable tenant-scoped evaluations, hypotheses, evidence links, and truth-revision lineage", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const sql = await readFile(path.join(process.cwd(), "prisma/migrations/20260721170000_diagnostics_reasoning_core/migration.sql"), "utf8");
    expect(schema).toMatch(/model DiagnosticReasoningEvaluation \{/);
    expect(schema).toMatch(/model DiagnosticHypothesis \{/);
    expect(schema).toMatch(/model DiagnosticHypothesisEvidence \{/);
    expect(sql).toMatch(/DiagnosticReasoning_checksum_check/);
    expect(sql).toMatch(/DiagnosticHypothesisEvidence_target_check/);
    expect(sql).toMatch(/reasoning lineage must remain within one tenant and case/);
    expect(sql).toMatch(/hypothesis lineage must remain within one tenant, case, and key/);
    expect(sql).toMatch(/DiagnosticReasoning_immutable/);
    expect(sql).toMatch(/DiagnosticHypothesisEvidence_immutable/);
  });
});
