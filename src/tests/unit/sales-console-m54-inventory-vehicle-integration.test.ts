import { describe, expect, it } from "vitest";

import {
  mapSalesInventoryVehicle,
  salesInventoryHoldGuardrailsRemainDisabled,
  salesInventoryIntegration
} from "@/features/sales/sales-console-m54-inventory-vehicle-integration";

describe("Sales Console M54 inventory vehicle integration", () => {
  it("maps inventory records into sellability context", () => {
    const vehicle = mapSalesInventoryVehicle(
      {
        vehicleId: "VEH-1",
        stockNumber: "TMS22145",
        vin: "2T3P1RFV1NW123456",
        label: "2022 Toyota RAV4 XLE",
        availability: "available",
        readiness: "frontline-ready",
        ageDays: 27,
        pricingPosture: "market-aligned",
        blockers: [],
        sourceRoute: "/inventory/VEH-1",
        updatedAt: "2026-07-30T13:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(vehicle.stockNumber).toBe("TMS22145");
    expect(vehicle.sellability).toBe("sellable");
    expect(vehicle.freshness).toBe("current");
  });

  it("explains blockers and keeps holds/reservations disabled", () => {
    const vehicle = mapSalesInventoryVehicle(
      {
        vehicleId: "VEH-2",
        stockNumber: "TMS20011",
        label: "2020 Chevy Malibu LT",
        availability: "available",
        readiness: "title-blocked",
        ageDays: 66,
        pricingPosture: "verify-first",
        blockers: [{ code: "TITLE", label: "Title missing", owner: "Inventory", severity: "blocked" }],
        sourceRoute: "/inventory/VEH-2",
        updatedAt: "2026-07-30T08:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(vehicle.sellability).toBe("blocked");
    expect(salesInventoryHoldGuardrailsRemainDisabled(vehicle)).toBe(true);
    expect(salesInventoryIntegration.governedWrites).toContain("vehicle reservation");
  });
});
