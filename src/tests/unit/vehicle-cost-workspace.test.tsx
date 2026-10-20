import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { VehicleCostWorkspace } from "@/features/inventory/vehicle-cost-workspace";
import { InventoryConsoleRouteTabs } from "@/components/layout/inventory-console-route-tabs";

describe("vehicle cost workspace", () => {
  it("presents saved records, separate totals, explicit unknown margin and a cost form", () => {
    const markup = renderToStaticMarkup(<VehicleCostWorkspace vehicleId="vehicle" unit={{ id: "unit", vehicleId: "vehicle", inventoryNumber: "STOCK-1", version: 1, closedAt: null, vehicle: { vehicleNumber: "V1", year: 2020, make: "Synthetic", model: "Fixture" }, summary: { incurredCents: 123450, estimatedCents: 50000, unclassified: 1 }, costEntries: [{ id: "cost", category: "ACQUISITION", status: "INCURRED", currency: "USD", amountCents: 123450, source: "MANUAL_STAFF_REPORT", reference: "invoice", notes: "Purchase", observedAt: "2026-10-01T00:00:00Z" }] }} />);
    for (const text of ["$1,234.50", "$500.00", "Pending policy", "Add cost", "Invoice / unique reference", "Record / correction reason", "Void invoice", "excluded"]) expect(markup).toContain(text);
    expect(markup).not.toContain("Approve price");
    expect(markup).toContain("10/1/2026");
  });
  it("does not present cost capture when no inventory cycle exists", () => {
    const markup = renderToStaticMarkup(<VehicleCostWorkspace vehicleId="vehicle" unit={null}/>);
    expect(markup).toContain("Inventory acquisition required");
    expect(markup).not.toContain("Save cost");
  });
  it("retains the vehicle context and makes costs directly discoverable", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleRouteTabs pathname="/vehicles/vehicle/costs" searchParams={new URLSearchParams()} showFullNavigation />);
    expect(markup).toContain('href="/vehicles/vehicle/costs"');
    expect(markup).toContain("Costs &amp; Investment");
    expect(markup).toContain('href="/vehicles/vehicle/workbench"');
  });
});
