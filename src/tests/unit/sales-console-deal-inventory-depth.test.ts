import { describe, expect, it } from "vitest";

import {
  salesConsoleM14DealDeskHasOperatingRows,
  salesConsoleM14DealInventoryDepth,
  salesConsoleM14DealInventoryRemainReadOnly,
  salesConsoleM14InventoryHasReadinessRows
} from "@/features/sales/sales-console-m14-deal-inventory-depth";

describe("Sales Console M14 Deal Desk and Inventory depth", () => {
  it("creates operating deal rows with source verification guidance", () => {
    expect(salesConsoleM14DealDeskHasOperatingRows()).toBe(true);
    expect(salesConsoleM14DealInventoryDepth.dealOperatingRows.length).toBeGreaterThan(0);
    expect(salesConsoleM14DealInventoryDepth.dealOperatingRows.every((deal) => deal.sourcePrompt.length > 0)).toBe(true);
  });

  it("creates inventory readiness rows with blocked/verify-first guidance", () => {
    expect(salesConsoleM14InventoryHasReadinessRows()).toBe(true);
    expect(salesConsoleM14DealInventoryDepth.inventoryOperatingRows.length).toBeGreaterThan(0);
    expect(salesConsoleM14DealInventoryDepth.inventoryOperatingRows.some((vehicle) => vehicle.readiness === "Verify First")).toBe(true);
  });

  it("keeps deal and inventory workflows read-only", () => {
    expect(salesConsoleM14DealInventoryRemainReadOnly()).toBe(true);
    expect(salesConsoleM14DealInventoryDepth.dealOperatingRows.every((deal) => deal.readOnlyAction.includes("do not submit quotes"))).toBe(true);
    expect(salesConsoleM14DealInventoryDepth.inventoryOperatingRows.every((vehicle) => vehicle.readOnlyAction.includes("do not hold"))).toBe(true);
  });
});
