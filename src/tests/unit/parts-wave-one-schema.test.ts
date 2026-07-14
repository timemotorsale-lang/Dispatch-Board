import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("enterprise parts Wave 1 persistence", () => {
  it("defines count, recommendation, and barcode aggregates with hard controls", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8"), sql = await readFile(path.join(process.cwd(), "prisma/migrations/20260714110000_complete_enterprise_parts_wave_one/migration.sql"), "utf8");
    for (const model of ["PartCycleCount", "PartCycleCountLine", "PartCycleCountEvent", "PartInventoryPolicy", "PartRecommendationRun", "PartInventoryRecommendation", "PartBarcodeAlias"]) expect(schema).toContain(`model ${model}`);
    expect(sql).toMatch(/PartCycleCount_one_active_location_key/);
    expect(sql).toMatch(/PartCycleCountLine_approval_check/);
    expect(sql).toMatch(/PartInventoryPolicy_one_active_key/);
    expect(sql).toMatch(/PartInventoryRecommendation_decision_check/);
    expect(sql).toMatch(/prevent_frozen_part_stock_movement/);
    expect(sql).toMatch(/PartRecommendationRun_prevent_mutation/);
  });
});
