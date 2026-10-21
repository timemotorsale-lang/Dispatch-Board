import { describe, expect, it } from "vitest";
import { inventoryUnitAge, normalizeInventoryUnitControlUpdate, normalizeInventoryUnitCreate } from "@/server/inventory-unit/domain";

describe("inventory unit foundation domain", () => {
  const now = new Date("2026-07-14T12:00:00Z");
  it("normalizes a financially acquired inventory unit", () => {
    expect(normalizeInventoryUnitCreate({ financialAcquiredAt: "2026-07-14T08:00:00Z", idempotencyKey: "create-1", inventoryNumber: " inv-1 ", locationId: "loc-1", nextAction: "Confirm receipt plan", ownerUserId: "owner-1", reason: "Create dealership inventory unit.", targetAt: "2026-07-17T08:00:00Z", vehicleId: "vehicle-1" }, now)).toMatchObject({ inventoryNumber: "INV-1", lifecycleStage: "PURCHASED_OR_TRADE_IN", operatingState: "ACTIVE", stateReason: null });
  });
  it.each([undefined, null, "", "   "])("automatically assigns a number when the override is %s", inventoryNumber => {
    const input = { financialAcquiredAt: "2026-07-14T08:00:00Z", idempotencyKey: "auto", inventoryNumber, locationId: "loc", nextAction: "Plan receipt", ownerUserId: "owner", reason: "Create automatic numbered inventory.", targetAt: "2026-07-17T08:00:00Z", vehicleId: "vehicle" };
    expect(normalizeInventoryUnitCreate(input, now).inventoryNumber).toBeNull();
    expect(() => normalizeInventoryUnitCreate({ ...input, inventoryNumber: "bad number!" }, now)).toThrow(/inventory number/i);
  });
  it("requires attributable waiting and blocker reasons", () => {
    expect(() => normalizeInventoryUnitControlUpdate({ expectedVersion: 1, idempotencyKey: "one", locationId: "loc", nextAction: "Call carrier", operatingState: "BLOCKED", ownerUserId: "owner", reason: "Update the blocked control state.", stateReason: "short", targetAt: "2026-07-17T08:00:00Z" })).toThrow("at least 10");
    expect(() => normalizeInventoryUnitControlUpdate({ expectedVersion: 1, idempotencyKey: "one", locationId: "loc", nextAction: "Close", operatingState: "CLOSED", ownerUserId: "owner", reason: "Attempt premature close state.", stateReason: "Unit is delivered", targetAt: "2026-07-17T08:00:00Z" })).toThrow("invalid for the foundation");
  });
  it("measures total age, stage age, and overdue targets", () => {
    expect(inventoryUnitAge({ financialAcquiredAt: new Date("2026-07-10T12:00:00Z"), stageStartedAt: new Date("2026-07-12T12:00:00Z"), targetAt: new Date("2026-07-14T10:00:00Z"), now })).toEqual({ overdue: true, stageAgeHours: 48, targetVarianceHours: 2, totalAgeHours: 96 });
  });
  it("rejects future acquisition and targets before acquisition", () => {
    const base = { idempotencyKey: "one", inventoryNumber: "one", locationId: "loc", nextAction: "Plan receipt", ownerUserId: "owner", reason: "Create inventory foundation record.", vehicleId: "vehicle" };
    expect(() => normalizeInventoryUnitCreate({ ...base, financialAcquiredAt: "2026-07-14T13:00:00Z", targetAt: "2026-07-15T13:00:00Z" }, now)).toThrow("cannot be in the future");
    expect(() => normalizeInventoryUnitCreate({ ...base, financialAcquiredAt: "2026-07-14T10:00:00Z", targetAt: "2026-07-14T09:00:00Z" }, now)).toThrow("cannot be before");
  });
});
