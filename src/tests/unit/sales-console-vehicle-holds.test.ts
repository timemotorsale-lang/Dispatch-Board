import { describe, expect, it } from "vitest";

import {
  salesConsoleVehicleHoldReadModel,
  staleOrVerifyFirstInventoryBlocksHold,
  vehicleHoldFoundationIsDisabled,
  vehicleHoldsHaveAuditAndPermissionCoverage,
  vehicleHoldsRequireManagerApprovalExpiryAndVerification
} from "@/features/sales/sales-console-m9-vehicle-holds";

describe("Sales Console vehicle holds foundation", () => {
  it("keeps vehicle holds disabled and source-write free", () => {
    expect(vehicleHoldFoundationIsDisabled()).toBe(true);
    expect(salesConsoleVehicleHoldReadModel.requests.every((request) => request.sourceWrite === false)).toBe(true);
  });

  it("requires manager approval, expiration, inventory verification, and audit", () => {
    expect(vehicleHoldsRequireManagerApprovalExpiryAndVerification()).toBe(true);
  });

  it("blocks stale or verify-first inventory from hold activation", () => {
    expect(staleOrVerifyFirstInventoryBlocksHold()).toBe(true);
    expect(salesConsoleVehicleHoldReadModel.requests.some((request) => request.status === "verify-first")).toBe(true);
  });

  it("has audit and permission coverage while holds remain disabled", () => {
    expect(vehicleHoldsHaveAuditAndPermissionCoverage()).toBe(true);
  });

  it("defines customer, salesperson, and vehicle hold limits", () => {
    expect(salesConsoleVehicleHoldReadModel.limits.map((limit) => limit.scope).sort()).toEqual(["customer", "salesperson", "vehicle"]);
  });
});
