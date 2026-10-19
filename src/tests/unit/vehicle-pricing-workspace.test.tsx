import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { VehiclePricingWorkspace } from "@/features/inventory/vehicle-pricing-workspace";

describe("vehicle pricing workspace", () => {
  it("labels the reason independently and presents explicit optional policy choices", () => {
    const markup = renderToStaticMarkup(<VehiclePricingWorkspace vehicleId="vehicle" unit={{ id: "unit", vehicleId: "vehicle", inventoryNumber: "STOCK-1", version: 1, latest: null, history: [], hasMoreHistory: false, costsKnown: false, costs: { incurredCents: 0, estimatedCents: 0, unclassified: 0 }, stale: false }} />);
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
});
