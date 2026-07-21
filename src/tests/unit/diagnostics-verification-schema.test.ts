import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260721220000_diagnostics_verification_closed_loop/migration.sql", "utf8");

describe("DGN-033-034 verification persistence", () => {
  it("defines immutable checksum-bound verification plan and result lineage", () => {
    expect(schema).toMatch(/model DiagnosticVerificationVersion \{/);
    expect(schema).toMatch(/enum DiagnosticVerificationAction \{/);
    expect(schema).toMatch(/enum DiagnosticVerificationStatus \{/);
    expect(migration).toContain("verification must bind to a confirmed conclusion with exact checksum");
    expect(migration).toContain("verification must bind to a published repair handoff with exact checksum");
    expect(migration).toContain('"DiagnosticVerification_immutable"');
  });
});
