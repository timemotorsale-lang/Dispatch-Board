import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
describe.skipIf(process.env.RUN_DATABASE_INTEGRATION !== "1")("purchase import draft undo PostgreSQL proof", () => {
  it("appends a reversal and rejects later edits, confirmed revisions and posted acquisition costs", async () => {
    const { prisma } = await import("@/server/db/client");
    const { getVehicleIntake, saveVehicleIntake } = await import("@/server/inventory-unit/intake-service");
    const prefix = `purchase-undo-proof-${randomUUID()}`, organizationId = `${prefix}-org`, locationId = `${prefix}-lot`;
    const actor = { id: `${prefix}-staff`, name: "Synthetic undo proof", email: `${prefix}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    await prisma.organization.create({ data: { id: organizationId, name: prefix, code: prefix } });
    await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "synthetic-disabled-login" } });
    await prisma.location.create({ data: { id: locationId, organizationId, code: prefix, name: "Synthetic undo proof location", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    const deps = { organizationId, enforceRollout: false };
    async function vehicle(label: string, withUnit = false) {
      const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: `${prefix}-${label}`, vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated import undo fixture", vinValidationSource: "SYNTHETIC" } });
      const unit = withUnit ? await prisma.inventoryUnit.create({ data: { organizationId, vehicleId: vehicle.id, inventoryNumber: `${prefix}-${label}`, locationId, ownerUserId: actor.id, financialAcquiredAt: new Date("2026-10-01"), stageStartedAt: new Date("2026-10-01"), targetAt: new Date("2026-10-15"), nextAction: "Synthetic proof only" } }) : null;
      const initial = await getVehicleIntake(actor, vehicle.id, deps);
      const body = { details: { ...initial.details, seller: "Synthetic seller", whereabouts: "Synthetic receiving", condition: "Synthetic arrival condition is pending", pendingNotes: "Missing details remain pending for this isolated proof" }, status: "DRAFT", expectedVersion: 0, expectedUnitVersion: unit?.version ?? null, idempotencyKey: `${prefix}-${label}-draft`, reason: "Save isolated purchase import draft" };
      const saved = await saveVehicleIntake(actor, vehicle.id, body, deps);
      const revision = saved.result as { id: string; version: number };
      const undo = { ...body, details: initial.details, expectedVersion: revision.version, idempotencyKey: `${prefix}-${label}-undo`, reason: "Undo isolated purchase draft allocation" };
      return { vehicle, unit, body, undo, revision };
    }
    const clean = await vehicle("clean");
    await saveVehicleIntake(actor, clean.vehicle.id, clean.undo, { ...deps, undoImportRevisionId: clean.revision.id });
    expect(await prisma.inventoryIntakeRevision.count({ where: { organizationId, vehicleId: clean.vehicle.id } })).toBe(2);
    expect(await getVehicleIntake(actor, clean.vehicle.id, deps)).toMatchObject({ version: 2, status: "DRAFT", details: { seller: "" } });
    await expect(saveVehicleIntake(actor, clean.vehicle.id, clean.undo, { ...deps, undoImportRevisionId: clean.revision.id })).resolves.toMatchObject({ duplicate: true });
    const changed = await vehicle("changed");
    await saveVehicleIntake(actor, changed.vehicle.id, { ...changed.body, expectedVersion: 1, idempotencyKey: `${prefix}-later-edit`, details: { ...changed.body.details, seller: "Later edit" } }, deps);
    await expect(saveVehicleIntake(actor, changed.vehicle.id, { ...changed.undo, expectedVersion: 2 }, { ...deps, undoImportRevisionId: changed.revision.id })).rejects.toThrow("confirmed, changed or posted");
    const confirmed = await vehicle("confirmed", true);
    const saved = await saveVehicleIntake(actor, confirmed.vehicle.id, { ...confirmed.body, status: "CONFIRMED", expectedVersion: 1, idempotencyKey: `${prefix}-confirm` }, deps);
    const confirmation = saved.result as { id: string; version: number };
    await expect(saveVehicleIntake(actor, confirmed.vehicle.id, { ...confirmed.undo, expectedVersion: confirmation.version }, { ...deps, undoImportRevisionId: confirmation.id })).rejects.toThrow("confirmed, changed or posted");
    const posted = await vehicle("posted", true);
    await prisma.inventoryUnitCost.create({ data: { organizationId, inventoryUnitId: posted.unit!.id, category: "ACQUISITION", status: "INCURRED", amountCents: 100000, currency: "USD", reference: prefix, observedAt: new Date(), incurredAt: new Date(), createdByUserId: actor.id, source: "MANUAL_STAFF_REPORT", confidence: "MEDIUM", notes: "Synthetic acquisition proof only" } });
    await expect(saveVehicleIntake(actor, posted.vehicle.id, posted.undo, { ...deps, undoImportRevisionId: posted.revision.id })).rejects.toThrow("downstream work exists");
    expect(await prisma.inventoryIntakeRevision.count({ where: { vehicleId: posted.vehicle.id } })).toBe(1);
  }, 30_000);
});
