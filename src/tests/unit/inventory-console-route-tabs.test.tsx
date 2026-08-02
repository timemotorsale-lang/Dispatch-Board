import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryConsoleRouteTabs } from "@/components/layout/inventory-console-route-tabs";

describe("Inventory Console route tabs", () => {
  it("provides a return link, shared pages, and vehicle-context tabs", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleRouteTabs pathname="/vehicles/360/vehicle-1" searchParams={new URLSearchParams("returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning")} showFullNavigation />);

    expect(markup).toContain('aria-label="Inventory Console page navigation"');
    expect(markup).toContain('href="/vehicles/vehicle-1/inventory-planning"');
    expect(markup).toContain('/vehicles/repair-workbench?vehicleId=vehicle-1&amp;returnTo=%2Fvehicles%2F360%2Fvehicle-1%3FreturnTo%3D%252Fvehicles%252Fvehicle-1%252Finventory-planning');
    expect(markup).toContain("Return to previous page");
    for (const label of ["Home", "Inventory Lifecycle", "Find Vehicle", "Add Vehicle", "Shop &amp; Recon", "Repair Workbench", "Parts", "Quality Control", "Vehicle 360", "Inventory Planning", "Vehicle Workbench"]) expect(markup).toContain(label);
    expect(markup).toContain('aria-current="page"');
  });

  it("returns deep pages to Inventory Console and carries source context into Add Vehicle", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleRouteTabs pathname="/vehicles/quality-control" searchParams={new URLSearchParams()} showFullNavigation />);

    expect(markup).toContain('href="/vehicles"');
    expect(markup).toContain("Return to Inventory Console");
    expect(markup).toContain("/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Fquality-control");
  });

  it("rejects unsafe return targets", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleRouteTabs pathname="/vehicles/repair-workbench" searchParams={new URLSearchParams("returnTo=%2F%2Fevil.example")} showFullNavigation />);

    expect(markup).not.toContain("evil.example");
    expect(markup).toContain("Return to Inventory Console");
  });

  it("limits specialized staff to permitted and vehicle-context destinations", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleRouteTabs allowedHrefs={["/vehicles/repair-workbench", "/vehicles/quality-control"]} pathname="/vehicles/360/vehicle-1" searchParams={new URLSearchParams()} />);

    expect(markup).toContain("Repair Workbench");
    expect(markup).toContain("Quality Control");
    expect(markup).toContain("Vehicle 360");
    expect(markup).toContain("Vehicle Workbench");
    expect(markup).not.toContain("Inventory Planning");
    expect(markup).not.toContain("Add Vehicle");
  });
});
