import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InventoryUnitFoundationWorkspace } from "@/features/inventory/inventory-unit-foundation-workspace";
describe("inventory unit foundation workspace", () => {
  it("renders search, ownership boundary, creation, and honest lifecycle scope", () => {
    const html = renderToStaticMarkup(<InventoryUnitFoundationWorkspace initial={{ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 }} options={{ locations: [], users: [], vehicles: [] }} />);
    expect(html).toContain("Inventory unit worklist"); expect(html).toContain("Search inventory, vehicle, VIN"); expect(html).toContain("Create inventory unit"); expect(html).toContain("No eligible vehicles");
  });

  it("renders live location and aging views for the inventory tabs", () => {
    const item = {
      _count: { stateEvents: 2 },
      age: { overdue: true, stageAgeHours: 12, targetVarianceHours: 9, totalAgeHours: 88 },
      financialAcquiredAt: "2026-07-10T14:00:00.000Z",
      id: "unit-1",
      inventoryNumber: "TMS-1001",
      lifecycleStage: "INSPECTION",
      location: { code: "MAIN", id: "loc-1", name: "Main Lot" },
      nextAction: "Complete inspection",
      operatingState: "BLOCKED",
      ownerUser: { id: "user-1", name: "Alex Manager" },
      stageStartedAt: "2026-07-12T14:00:00.000Z",
      stateReason: "Awaiting lift time",
      targetAt: "2026-07-13T14:00:00.000Z",
      vehicle: { id: "vehicle-1", make: "Toyota", model: "Camry", stockNumber: "STK1001", vehicleNumber: "VEH-1001", vin: "1TESTVIN", year: 2019 },
      version: 2
    };
    const options = { locations: [item.location], users: [], vehicles: [] };
    const initial = { items: [item], page: 1, pageSize: 25, total: 1, totalPages: 1 };
    const locationHtml = renderToStaticMarkup(<InventoryUnitFoundationWorkspace initial={initial} initialView="locations" options={options} />);
    const agingHtml = renderToStaticMarkup(<InventoryUnitFoundationWorkspace initial={initial} initialView="aging" options={options} />);

    expect(locationHtml).toContain("Inventory location health");
    expect(locationHtml).toContain("Main Lot");
    expect(agingHtml).toContain("Aging risk");
    expect(agingHtml).toContain("1 overdue units");
    expect(agingHtml).toContain("TMS-1001 - 2019 Toyota Camry");
  });
});
