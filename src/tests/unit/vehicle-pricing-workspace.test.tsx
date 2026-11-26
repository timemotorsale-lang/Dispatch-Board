import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { VehiclePricingWorkspace, type PricingModel } from "@/features/inventory/vehicle-pricing-workspace";

const unit: PricingModel = { id: "unit", vehicleId: "vehicle", inventoryNumber: "STOCK-1", version: 1, latest: null, history: [], hasMoreHistory: false, costsKnown: false, costs: { incurredCents: 0, estimatedCents: 0, unclassified: 0 }, stale: false };

describe("vehicle pricing workspace", () => {
  it("labels the reason independently and presents explicit optional policy choices", () => {
    const markup = renderToStaticMarkup(<VehiclePricingWorkspace vehicleId="vehicle" unit={unit} />);
    expect(markup).toContain('for="pricing-change-reason"');
    expect(markup).toContain('id="pricing-change-reason"');
    expect(markup).toContain("Minimum percentage of selling price");
    expect(markup).toContain("Optional pack");
    expect(markup).not.toContain('checked=""');
    expect(markup).toContain("Unknown");
    expect(markup).toContain("Proposals do not publish a price or authorize final release");
  });
  it("requires an open inventory cycle before offering proposal entry", () => {
    const markup = renderToStaticMarkup(<VehiclePricingWorkspace vehicleId="vehicle" unit={null} />);
    expect(markup).toContain("An open inventory cycle is required");
    expect(markup).not.toContain("Save price proposal");
  });
  it("shows and prefills a saved confirmed intake price without inventing a proposal", () => {
    const markup = renderToStaticMarkup(<VehiclePricingWorkspace vehicleId="vehicle" unit={{ ...unit, intakePriceCents: 1299500 }} embedded/>);
    expect(markup).toContain("Selling price · Confirmed intake</dt><dd>$12,995.00");
    expect(markup).toContain('value="12995.00"');
    expect(markup).toContain("No price proposals yet.");
  });
  it("shows a saved intake draft even before the inventory cycle is opened", () => {
    const markup = renderToStaticMarkup(<VehiclePricingWorkspace vehicleId="vehicle" unit={null} intakePrice={{ cents: 1149500, draft: true }} embedded/>);
    expect(markup).toContain("Selling price · Intake draft</dt><dd>$11,495.00");
    expect(markup).not.toContain("Save price proposal");
  });
  it("keeps a formal proposal and a different saved intake price distinct", () => {
    const latest = { id: "proposal", inventoryVersion: 2, priceCents: 1399500, packEnabled: false, packCents: 0, includeEstimates: false, marginMode: "OFF", threshold: null, reason: "Local price comparison", createdAt: "2026-11-25T12:00:00Z" };
    const markup = renderToStaticMarkup(<VehiclePricingWorkspace vehicleId="vehicle" unit={{ ...unit, latest, history: [latest], version: 2 }} intakePrice={{ cents: 1299500, draft: true }} embedded/>);
    expect(markup).toContain("Latest proposed selling price</dt><dd>$13,995.00");
    expect(markup).toContain("Selling price · Intake draft</dt><dd>$12,995.00");
    expect(markup).toContain('value="13995.00"');
  });
});
