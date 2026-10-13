import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryControlTower } from "@/features/inventory/inventory-control-tower";

describe("InventoryControlTower", () => {
  it("renders the approved lifecycle control-tower structure", () => {
    const markup = renderToStaticMarkup(<InventoryControlTower />);

    expect(markup).toContain("Inventory Lifecycle Control Tower");
    expect(markup).toContain("Retail Inventory");
    expect(markup).toContain("Shop / Recon");
    expect(markup).toContain("Repair Parts");
    expect(markup).toContain("Flow Exceptions");
    expect(markup).toContain("Shop Capacity Board");
    expect(markup).toContain("Capital &amp; Aging Portfolio");
  });

  it("renders the selected-asset command and accountability controls", () => {
    const markup = renderToStaticMarkup(<InventoryControlTower />);

    expect(markup).toContain("Flow Clock");
    expect(markup).toContain("Next Best Action");
    expect(markup).toContain("Coaching &amp; Operating Health");
    expect(markup).toContain("Simplified Command Forms");
    expect(markup).toContain("Open Vehicle Workbench");
    expect(markup).toContain("Resolve Blocker");
    expect(markup).toContain("Escalate");
  });

  it("exposes the approved inventory module workspaces", () => {
    const markup = renderToStaticMarkup(<InventoryControlTower />);

    for (const tab of ["Control Tower", "Vehicles", "Acquisition", "Recon", "Shop Work", "Parts", "Purchase Orders", "Locations", "Aging", "Exceptions"]) {
      expect(markup).toContain(`>${tab}</button>`);
    }
  });
});
