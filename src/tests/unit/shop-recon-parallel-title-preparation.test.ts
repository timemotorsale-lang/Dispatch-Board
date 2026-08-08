import { describe, expect, it } from "vitest";
import { emptyTitlePreparationChecklist, evaluateTitlePreparationBinding, normalizeTitlePreparationUpdate, TITLE_PREPARATION_CHECKS } from "@/server/shop-recon/parallel-title-preparation-domain";

function validUpdate(overrides: Record<string, unknown> = {}) {
  return {
    action: "SAVE",
    checklist: emptyTitlePreparationChecklist(),
    evidenceReferences: [],
    expectedVersion: 1,
    handoffNote: "Inventory should verify original title receipt and payoff status.",
    idempotencyKey: "parallel-title-test-1",
    reason: "Save bounded preparation work.",
    ...overrides,
  };
}

describe("safe parallel title preparation", () => {
  it("normalizes work without granting lifecycle authority", () => {
    const result = normalizeTitlePreparationUpdate(validUpdate());
    expect(result.action).toBe("SAVE");
    expect(Object.keys(result.checklist)).toEqual(TITLE_PREPARATION_CHECKS.map(item => item.code));
  });

  it("requires a blocker explanation", () => {
    expect(() => normalizeTitlePreparationUpdate(validUpdate({ action: "BLOCK", blockerNote: "" }))).toThrow("blocker note");
  });

  it("fails closed when review submission lacks preparation evidence", () => {
    const checklist = Object.fromEntries(TITLE_PREPARATION_CHECKS.map(item => [item.code, true]));
    expect(() => normalizeTitlePreparationUpdate(validUpdate({ action: "SUBMIT_FOR_REVIEW", checklist, evidenceReferences: [] }))).toThrow("At least one document");
  });

  it("allows a fully evidenced packet to be submitted only for inventory review", () => {
    const checklist = Object.fromEntries(TITLE_PREPARATION_CHECKS.map(item => [item.code, true]));
    const result = normalizeTitlePreparationUpdate(validUpdate({ action: "SUBMIT_FOR_REVIEW", checklist, evidenceReferences: ["DMS title scan #1842"] }));
    expect(result.action).toBe("SUBMIT_FOR_REVIEW");
  });

  it("requires revalidation when vehicle, inventory, or recon scope binding changes", () => {
    const result = evaluateTitlePreparationBinding({
      operation: { inventoryUnitId: "unit-1", sourceScopeVersion: 1, sourceVin: "VIN-1", vehicleId: "vehicle-1" },
      current: { inventoryUnitId: "unit-2", scopeVersion: 2, vin: "VIN-2", vehicleId: "vehicle-1", workLane: "INVENTORY_RECON" },
    });
    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(["VIN_CHANGED", "INVENTORY_UNIT_CHANGED", "RECON_SCOPE_CHANGED"]);
  });

  it("keeps a stage progression valid when the bounded source facts do not change", () => {
    const result = evaluateTitlePreparationBinding({
      operation: { inventoryUnitId: "unit-1", sourceScopeVersion: 3, sourceVin: "VIN-1", vehicleId: "vehicle-1" },
      current: { inventoryUnitId: "unit-1", scopeVersion: 3, vin: "VIN-1", vehicleId: "vehicle-1", workLane: "INVENTORY_RECON" },
    });
    expect(result).toMatchObject({ valid: true, reasons: [] });
  });
});
