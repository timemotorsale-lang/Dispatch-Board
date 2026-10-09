import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VehicleIntakeWorkspace } from "@/features/inventory/vehicle-intake-workspace";
import type { VehicleIntakeModel } from "@/server/inventory-unit/intake-service";
import type { VehicleCostModel } from "@/features/inventory/vehicle-cost-workspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const model: VehicleIntakeModel = {
  vehicle: { id: "vehicle-1", vehicleNumber: "V1", stockNumber: null, vin: null, year: 2020, make: "Test", model: "Car" },
  unit: { id: "unit-1", inventoryNumber: "I1", version: 2, operatingState: "BLOCKED", stateReason: "Title evidence hold" },
  version: 1, status: "DRAFT", canPrice: true, pendingItems: [], purchaseRecords: [],
  details: { source: "AUCTION", seller: "Seller", boughtFrom: "Auction", buyer: "Buyer", acquiredOn: "2026-10-01", reference: "INV1", priceStatus: "INCURRED", purchaseCents: 1000000, proposedPriceCents: 1500000, whereabouts: "Receiving", odometer: 10000, odometerUnit: "MILES", condition: "Runs and drives", keys: 2, titleStatus: "PENDING", documents: "", pendingNotes: "Collect title" },
};
const costs: VehicleCostModel = { id: "unit-1", vehicleId: "vehicle-1", inventoryNumber: "I1", version: 2, closedAt: null, vehicle: { vehicleNumber: "V1", year: 2020, make: "Test", model: "Car" }, costEntries: [], summary: { incurredCents: 10000, estimatedCents: 20000, unclassified: 0 } };
describe("unified intake workspace", () => {
  it("offers a save-before-cycle next action for a new intake", () => {
    const html = renderToStaticMarkup(<VehicleIntakeWorkspace model={{ ...model, unit: null, status: "NOT_STARTED", version: 0 }}/>);
    expect(html).toContain("Save &amp; open inventory cycle");
    expect(html).toContain("Record initial acquisition intake");
    expect(html).toContain("<footer");
    expect(html).not.toContain("Confirm intake &amp; continue to recon");
  });
  it("offers confirmation into recon when the inventory cycle exists", () => {
    const html = renderToStaticMarkup(<VehicleIntakeWorkspace model={model}/>);
    expect(html).toContain("Confirm intake &amp; continue to recon");
    expect(html).toContain("Record / revision reason (required)");
    expect(html).not.toContain("Save &amp; open inventory cycle");
  });
  it("groups intake with a modal cost workspace and retains holds", () => {
    const html = renderToStaticMarkup(<VehicleIntakeWorkspace model={model} costs={costs}/>);
    expect(html).toContain("Acquisition &amp; arrival");
    expect(html).toContain("Cost &amp; pricing");
    expect(html).toContain("<dialog");
    expect(html).toContain("Save &amp; close");
    expect(html).toContain("Title evidence hold");
    expect(html).toContain("$10,100.00");
    expect(html).toContain("$4,900.00");
    expect(html).toContain("$200.00");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("Intake confirmation is not");
    expect(html).not.toContain("Use added costs &amp; corrections to reconcile");
    expect(html).toContain('id="intake-documents"');
    expect(html).toContain('id="intake-pendingNotes"');
  });
  it("does not count a previously recorded purchase twice", () => {
    const recorded = { ...model, purchaseRecords: [{ id: "cost-1", amountCents: 1000000, status: "INCURRED", currency: "USD", reference: "INV1" }] };
    const html = renderToStaticMarkup(<VehicleIntakeWorkspace model={recorded} costs={{ ...costs, summary: { ...costs.summary, incurredCents: 1010000 } }}/>);
    expect(html).toContain("$10,100.00");
    expect(html).not.toContain("$20,100.00");
  });
  it("leaves unknown cost pending rather than presenting zero margin", () => {
    const html = renderToStaticMarkup(<VehicleIntakeWorkspace model={{ ...model, canPrice: false, details: { ...model.details, purchaseCents: null, priceStatus: "PENDING", proposedPriceCents: null } }}/>);
    expect(html).toContain("Pending cost / price");
    expect(html).not.toContain('id="intake-proposed-price"');
  });
});
