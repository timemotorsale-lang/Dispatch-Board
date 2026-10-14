import { describe, expect, it } from "vitest";

import { getNextShopReconStageHref, getShopReconStageHref } from "@/features/inventory/shop-recon-navigation";

describe("shop recon navigation", () => {
  it("builds a stage detail url for the same repair order", () => {
    expect(getShopReconStageHref("RO-42", "VEHICLE_INTAKE_CUSTODY")).toBe("/vehicles/shop-recon/RO-42?stage=4");
  });

  it("advances to the next stage detail url", () => {
    expect(getNextShopReconStageHref("RO-42", "VEHICLE_INTAKE_CUSTODY")).toBe("/vehicles/shop-recon/RO-42?stage=5");
  });

  it("preserves a safe parent return path when present", () => {
    expect(getNextShopReconStageHref("RO-42", "VEHICLE_INTAKE_CUSTODY", "/vehicles/shop-recon")).toBe(
      "/vehicles/shop-recon/RO-42?stage=5&returnTo=%2Fvehicles%2Fshop-recon",
    );
  });
});
