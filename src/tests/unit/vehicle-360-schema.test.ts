import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vehicle 360 persistence", () => {
  it("defines governed content, links, events, and database enforcement", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const migration = await readFile(path.join(process.cwd(), "prisma/migrations/20260714150000_establish_vehicle_evidence_and_360/migration.sql"), "utf8");
    for (const model of ["VehicleEvidenceObject", "VehicleEvidenceLink", "VehicleEvidenceEvent"]) expect(schema).toContain(`model ${model}`);
    expect(migration).toMatch(/VehicleEvidenceObject_content_length_check/);
    expect(migration).toMatch(/VehicleEvidenceObject_scan_check/);
    expect(migration).toMatch(/VehicleEvidenceLink_vehicle_org_fkey/);
    expect(migration).toMatch(/prevent_vehicle_evidence_event_mutation/);
    expect(migration).toMatch(/govern_vehicle_evidence_object_mutation/);
    expect(migration).toMatch(/VehicleEvidenceLink_prevent_update/);
    expect(migration).toMatch(/'VEHICLE_360', 'OFF'/);
  });
});
