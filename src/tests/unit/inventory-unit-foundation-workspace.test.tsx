import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { InventoryUnitFoundationWorkspace } from "@/features/inventory/inventory-unit-foundation-workspace";
describe("inventory unit foundation workspace", () => {
  it("offers a direct return to the same vehicle check-in but not external destinations", () => {
    const props = { initial: { items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 }, options: { locations: [], users: [], vehicles: [] } };
    const returnTo = "/vehicles/repair-orders?intakeSource=INVENTORY_RECON&vehicleId=vehicle-1";
    const html = renderToStaticMarkup(<InventoryUnitFoundationWorkspace {...props} returnTo={returnTo} />);
    expect(html).toContain("Return to vehicle check-in");
    expect(html).toContain('href="/vehicles/repair-orders?intakeSource=INVENTORY_RECON&amp;vehicleId=vehicle-1"');
    expect(renderToStaticMarkup(<InventoryUnitFoundationWorkspace {...props} returnTo="https://example.test" />)).not.toContain("Return to vehicle check-in");
  });
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
