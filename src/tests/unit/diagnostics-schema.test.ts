import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("diagnostic case persistence", () => {
  it("defines additive tenant-scoped case, concern, history, immutability, and disabled rollout controls", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const sql = await readFile(path.join(process.cwd(), "prisma/migrations/20260720200000_diagnostics_case_core/migration.sql"), "utf8");
    expect(schema).toMatch(/model DiagnosticCase \{/);
    expect(schema).toMatch(/model DiagnosticConcernVersion \{/);
    expect(schema).toMatch(/model DiagnosticCaseStateEvent \{/);
    expect(sql).toMatch(/DiagnosticCase_repair_order_tenant_fkey/);
    expect(sql).toMatch(/DiagnosticCase_repairOrderId_concernKey_key/);
    expect(sql).toMatch(/prevent_diagnostic_immutable_mutation/);
    expect(sql).toMatch(/'DIAGNOSTICS_MASTER', 'OFF'/);
    expect(sql).toMatch(/'DIAGNOSTIC_AI', 'OFF'/);
  });
});
