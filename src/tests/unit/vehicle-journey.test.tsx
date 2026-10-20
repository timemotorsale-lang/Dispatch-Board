import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { nextJourneyStep, vehicleJourneySteps } from "@/server/inventory-unit/journey-domain";
import { VehicleJourneyWorkspace } from "@/features/inventory/vehicle-journey-workspace";
import type { VehicleJourneyModel } from "@/server/inventory-unit/journey-service";
import { normalizeCostRecord, summarizeRecordedCosts } from "@/server/inventory-unit/cost-domain";
const access = { inventory: true, costs: true, pricing: true, repair: true, evidence: true };
const base = { vehicleId: "vehicle-1", unitId: "unit-1", blocked: false, hasPurchase: true, costCount: 3, receiptStatus: "RECEIVED", pricing: "saved" as const, access };
describe("connected vehicle journey", () => {
  it.each(["TRANSPORT", "FEES", "OTHER_READINESS"])("captures %s readiness charges without dropping them from investment", category => {
    const cost = normalizeCostRecord({ action: "RECORD_COST", expectedVersion: 1, idempotencyKey: "charge-1", reason: "Record a documented readiness charge", category, status: "INCURRED", currency: "USD", amountCents: 12500, observedAt: "2026-10-01T00:00:00.000Z", reference: "invoice-1", notes: "Documented staff-reported readiness charge" }, new Date("2026-10-07"));
    expect(cost).toMatchObject({ category, amountCents: 12500 });
    expect(summarizeRecordedCosts([cost as { status: string; currency: string; amountCents: number }])).toMatchObject({ incurredCents: 12500, estimatedCents: 0, unclassified: 0 });
  });
  it("preserves canonical vehicle/cycle and return context across source links", () => {
    const steps = vehicleJourneySteps(base);
    expect(steps.find(step => step.id === "acquisition")?.href).toContain("inventoryUnitId=unit-1");
    for (const step of steps.filter(step => step.href)) expect(step.href).toContain("returnTo=%2Fvehicles%2Fvehicle-1%2Fjourney");
    expect(steps.at(-1)).toMatchObject({ status: "Unavailable", href: null });
  });
  it("does not convert a saved record to approval or release readiness", () => {
    const steps = vehicleJourneySteps(base);
    expect(steps.find(step => step.id === "pricing")?.status).toBe("Proposal saved");
    expect(steps.find(step => step.id === "readiness")?.status).toBe("Review required");
    expect(nextJourneyStep(steps, false)?.id).toBe("readiness");
  });
  it("prioritizes held inventory controls and stale pricing review", () => {
    expect(nextJourneyStep(vehicleJourneySteps(base), true)?.id).toBe("acquisition");
    expect(nextJourneyStep(vehicleJourneySteps({ ...base, pricing: "stale" }), false)?.id).toBe("pricing");
  });
  it("does not choose restricted or unavailable actions", () => {
    const steps = vehicleJourneySteps({ ...base, access: { inventory: false, costs: false, pricing: false, repair: false, evidence: false } });
    expect(nextJourneyStep(steps, false)).toBeNull();
    expect(steps.find(step => step.id === "costs")).toMatchObject({ status: "Restricted", href: null });
  });
  it("opens the requested vehicle rather than another unit when acquisition is absent", () => {
    const steps = vehicleJourneySteps({ ...base, unitId: null, receiptStatus: null, hasPurchase: false, pricing: "missing" });
    expect(nextJourneyStep(steps, false)?.href).toContain("vehicleId=vehicle-1");
    expect(steps.find(step => step.id === "costs")?.href).toBeNull();
  });
  it("renders source status without release controls or hidden financial values", () => {
    const model = { vehicle: { id: "vehicle-1", vehicleNumber: "V1", year: 2020, make: "Synthetic", model: "Fixture", vin: null, stockNumber: null }, unit: null, blocked: false, frontline: null, access, steps: vehicleJourneySteps({ ...base, unitId: null }), next: null, asOf: "2026-10-07T00:00:00Z", costs: null, proposal: null } as VehicleJourneyModel;
    const markup = renderToStaticMarkup(<VehicleJourneyWorkspace model={model}/>);
    expect(markup).toContain("2020 Synthetic Fixture");
    expect(markup).toContain("Not opened");
    expect(markup).toContain("Final release");
    expect(markup).not.toContain("Recorded incurred costs");
    expect(markup).not.toContain("<button");
  });
});
