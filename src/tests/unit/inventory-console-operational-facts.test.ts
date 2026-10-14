import { describe, expect, it } from "vitest";
import { buildInventoryConsoleOperationalFacts } from "@/server/inventory-console-home";

describe("Inventory Console operational facts", () => {
  it("derives live Shop, Parts, throughput, and integration attention without representative values", () => {
    expect(buildInventoryConsoleOperationalFacts({ activeShop: 8, blockedShop: 2, demands: [{ quantityRequired: 4, quantityReserved: 1 }, { quantityRequired: 1, quantityReserved: 1 }], inventoryTransitions: 6, repairOrdersClosed: 3, integrationGroups: [{ state: "ACKNOWLEDGED", count: 5 }, { state: "RECONCILIATION_REQUIRED", count: 2 }], latestExchangeAt: new Date("2026-07-18T12:00:00Z") })).toEqual({ shop: { active: 8, blocked: 2 }, parts: { waitingDemands: 2, unreservedUnits: 3 }, throughput: { inventoryTransitions: 6, repairOrdersClosed: 3, windowHours: 24 }, integration: { exchanges: 7, exceptions: 2, status: "ATTENTION", latestAt: "2026-07-18T12:00:00.000Z" } });
  });
  it("reports not configured instead of claiming disabled or healthy", () => { expect(buildInventoryConsoleOperationalFacts({ activeShop: 0, blockedShop: 0, demands: [], inventoryTransitions: 0, repairOrdersClosed: 0, integrationGroups: [], latestExchangeAt: null }).integration.status).toBe("NOT_CONFIGURED"); });
});
