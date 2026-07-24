import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const workspaceRoot = process.cwd();
const schema = readFileSync(join(workspaceRoot, "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(
    workspaceRoot,
    "prisma",
    "migrations",
    "20260723220000_time_attendance_foundation",
    "migration.sql"
  ),
  "utf8"
);

describe("time attendance persistence foundation", () => {
  it("defines the core persistence models", () => {
    for (const model of [
      "TimeAttendancePolicyProfile",
      "TimeAttendancePolicyAssignment",
      "TimeAttendanceSession",
      "TimeAttendanceEvent",
      "TimeAttendanceBreakInterval",
      "TimeCard",
      "TimeCardException",
      "TimeCardAttestation",
      "TimeCardApproval",
      "TimeOffRequest",
      "TimeOffBalance",
      "TimeAttendanceExportBatch",
      "TimeAttendanceExportLine"
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it("keeps raw events command-linked and time cards versioned", () => {
    expect(schema).toMatch(/command\s+EnterpriseCommandLedger\?/);
    expect(schema).toContain("@@unique([organizationId, staffUserId, periodStart, periodEnd, version])");
    expect(migration).toContain("TimeAttendanceSession_one_active_per_staff_key");
    expect(migration).toContain("WHERE \"state\" IN ('OPEN', 'ON_MEAL')");
    expect(migration).toContain("\"roundingPolicy\" = 'EXACT_TIME'");
  });
});
