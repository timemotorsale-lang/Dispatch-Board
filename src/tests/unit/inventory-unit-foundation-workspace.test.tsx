import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InventoryUnitFoundationWorkspace } from "@/features/inventory/inventory-unit-foundation-workspace";
describe("inventory unit foundation workspace", () => {
  it("renders search, ownership boundary, creation, and honest lifecycle scope", () => {
    const html = renderToStaticMarkup(<InventoryUnitFoundationWorkspace initial={{ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 }} options={{ locations: [], users: [], vehicles: [] }} />);
    expect(html).toContain("Inventory unit foundation"); expect(html).toContain("Search inventory, vehicle, VIN"); expect(html).toContain("Create inventory unit"); expect(html).toContain("No eligible vehicles");
  });
});
