import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("repair-order Task bridge persistence", () => {
  it("defines a durable idempotent link between authoritative repair work and Tasks", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const migration = await readFile(
      path.join(process.cwd(), "prisma/migrations/20260903120000_add_repair_order_task_bridge/migration.sql"),
      "utf8"
    );

    expect(schema).toContain("model RepairOrderTaskLink");
    expect(schema).toMatch(/REPAIR_ORDER\s*\n/);
    expect(schema).toMatch(/@@unique\(\[organizationId, repairOrderId, assignmentKey\]\)/);
    expect(migration).toContain('CREATE TABLE "RepairOrderTaskLink"');
    expect(migration).toContain('ALTER TYPE "TaskSourceType" ADD VALUE IF NOT EXISTS \'REPAIR_ORDER\'');
  });
});
