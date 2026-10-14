import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Wave 3 enterprise persistence", () => {
  it("defines governed knowledge, controlled output, immutable evidence, and search indexes", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8"), migration = await readFile(path.join(process.cwd(), "prisma/migrations/20260714170000_add_enterprise_discovery_knowledge_output/migration.sql"), "utf8");
    for (const model of ["WorkKnowledgeLink", "WorkKnowledgeEvent", "VehicleControlledOutput", "VehicleControlledOutputEvent"]) expect(schema).toContain(`model ${model}`);
    expect(migration).toMatch(/WorkKnowledgeLink_approval_check/);
    expect(migration).toMatch(/WorkKnowledgeLink_authority_check/);
    expect(migration).toMatch(/WorkKnowledgeEvent_prevent_mutation/);
    expect(migration).toMatch(/VehicleControlledOutput_prevent_mutation/);
    expect(migration).toMatch(/VehicleControlledOutput_watermark_check/);
    expect(migration).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_trgm/);
    expect(migration).toMatch(/Vehicle_vehicleNumber_trgm_idx/);
    expect(migration).toMatch(/'VEHICLE_DISCOVERY', 'OFF'/);
  });

  it("defines durable Console-owned personal and team saved views", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8"), migration = await readFile(path.join(process.cwd(), "prisma/migrations/20260718223000_inventory_console_gap_closure_wave_1/migration.sql"), "utf8");
    expect(schema).toContain("model InventoryConsoleSavedView");
    expect(schema).toContain("InventoryConsoleSavedViewVisibility");
    expect(migration).toContain("InventoryConsoleSavedView_name_check");
    expect(migration).toContain("InventoryConsoleSavedView_organizationId_createdByUserId_name_key");
  });
});
