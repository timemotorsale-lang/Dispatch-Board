import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { EDIT_ACQUISITION_INTAKE_DUTY_NAME, evaluateIntakeAccess } from "@/server/inventory-unit/intake-access";
import { getVehicleIntake, saveVehicleIntake } from "@/server/inventory-unit/intake-service";
import { EDIT_INVENTORY_PRICING_DUTY_NAME } from "@/server/inventory-unit/pricing-access";

vi.mock("@/server/inventory-unit/repository", () => ({
  executeInventoryMutation: vi.fn(async (database, _command, mutate) => mutate(database, 1))
}));

const staff: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Parts"], duties: { all: [], direct: [], roleDefaults: [] } };
const now = new Date("2026-10-10T12:00:00Z");
const authorized = (assignment: "direct" | "roleDefaults"): AuthenticatedUser => ({ ...staff, duties: { ...staff.duties, all: [EDIT_ACQUISITION_INTAKE_DUTY_NAME], [assignment]: [EDIT_ACQUISITION_INTAKE_DUTY_NAME] } });
function database() {
  return {
    vehicleCapabilityGrant: { findMany: vi.fn().mockResolvedValue([]) },
    vehicle: { findFirst: vi.fn().mockResolvedValue({ id: "vehicle", vehicleNumber: "V1", custodyEvents: [], odometerObservations: [], specificationSnapshot: {} }) },
    inventoryUnit: { findFirst: vi.fn().mockResolvedValue(null) },
    inventoryIntakeRevision: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(async ({ data }) => ({ id: "draft", ...data })) },
    enterpriseDomainEvent: { findFirst: vi.fn().mockResolvedValue(null) },
    vehicleCustodyEvent: { findFirst: vi.fn().mockResolvedValue(null) },
    $executeRaw: vi.fn()
  };
}

describe("existing team functions authorize acquisition intake", () => {
  it.each(["direct", "roleDefaults"] as const)("requires the pricing function for provisional intake prices via %s", async assignment => {
    const db = database(), intakeActor = authorized("direct");
    const deps = { database: db as unknown as PrismaClient, organizationId: "org", enforceRollout: false, now: () => now };
    const initial = await getVehicleIntake(intakeActor, "vehicle", deps);
    const body = { details: { ...initial.details, proposedPriceCents: 1500000 }, status: "DRAFT", expectedVersion: 0, expectedUnitVersion: null, idempotencyKey: "priced-draft", reason: "Record proposed selling price" };
    await expect(saveVehicleIntake(intakeActor, "vehicle", body, deps)).rejects.toThrow(EDIT_INVENTORY_PRICING_DUTY_NAME);
    expect(db.inventoryIntakeRevision.create).not.toHaveBeenCalled();
    const pricedActor = { ...intakeActor, duties: { ...intakeActor.duties, all: [...intakeActor.duties.all, EDIT_INVENTORY_PRICING_DUTY_NAME], [assignment]: [...intakeActor.duties[assignment], EDIT_INVENTORY_PRICING_DUTY_NAME] } };
    expect(await getVehicleIntake(pricedActor, "vehicle", deps)).toMatchObject({ canPrice: true, canManageInventory: false });
    await saveVehicleIntake(pricedActor, "vehicle", body, deps);
    expect(db.inventoryIntakeRevision.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ details: expect.objectContaining({ proposedPriceCents: 1500000 }) }) }));
  });
  it.each(["direct", "roleDefaults"] as const)("allows %s function assignments to load and save a draft", async assignment => {
    const db = database(), actor = authorized(assignment);
    const deps = { database: db as unknown as PrismaClient, organizationId: "org", enforceRollout: false, now: () => now };
    const model = await getVehicleIntake(actor, "vehicle", deps);
    expect(model).toMatchObject({ canManageInventory: false, canPrice: false, status: "NOT_STARTED" });
    await saveVehicleIntake(actor, "vehicle", { details: model.details, status: "DRAFT", expectedVersion: 0, expectedUnitVersion: null, idempotencyKey: "draft", reason: "Record arrival details" }, deps);
    expect(db.inventoryIntakeRevision.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT", actorUserId: staff.id }) }));
    expect(evaluateVehicleCapability({ actor, capability: "INVENTORY_UNIT_MANAGE", locationId: null }).allowed).toBe(false);
    await expect(saveVehicleIntake(actor, "vehicle", { details: { ...model.details, whereabouts: "Receiving", condition: "Arrival inspection pending", pendingNotes: "Manager will confirm purchasing details" }, status: "CONFIRMED", expectedVersion: 0, expectedUnitVersion: null, idempotencyKey: "confirm", reason: "Confirm arrival details" }, deps)).rejects.toThrow("INVENTORY_ACQUISITION_MANAGE");
  });

  it("rejects staff without the function or after it is removed, before reading intake", async () => {
    const db = database();
    await expect(getVehicleIntake(staff, "vehicle", { database: db as unknown as PrismaClient })).rejects.toThrow(EDIT_ACQUISITION_INTAKE_DUTY_NAME);
    expect(db.vehicle.findFirst).not.toHaveBeenCalled();
    expect(evaluateIntakeAccess({ actor: { ...authorized("direct"), duties: staff.duties }, locationId: null }).allowed).toBe(false);
  });

  it("preserves inactive-account, deny and constrained-grant restrictions", () => {
    const actor = authorized("direct");
    expect(evaluateIntakeAccess({ actor: { ...actor, isActive: false }, locationId: null }).allowed).toBe(false);
    const grant = { capability: "INVENTORY_UNIT_MANAGE", effect: "DENY" as const, locationId: "location", validFrom: new Date("2026-01-01"), validTo: null };
    expect(evaluateIntakeAccess({ actor, locationId: "location", grants: [grant], now }).allowed).toBe(false);
    expect(evaluateIntakeAccess({ actor, locationId: "location", grants: [{ ...grant, effect: "ALLOW", constraints: { maxAmountCents: 100 } }], amountCents: 200, now }).allowed).toBe(false);
  });

  it("preserves existing inventory staff access", () => {
    for (const role of ["General Manager", "Inventory Manager", "Service Advisor", "Vehicle Operations Lead"]) {
      expect(evaluateIntakeAccess({ actor: { ...staff, roles: [role] }, locationId: null }).allowed).toBe(true);
    }
  });
});
