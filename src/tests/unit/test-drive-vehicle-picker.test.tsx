import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { availableTestDriveVehicles, testDriveInventoryIdentity, TestDriveVehiclePicker } from "@/features/crm-next/test-drive-vehicle-picker";

const unit = {
  id: "unit-1", inventoryNumber: "INV-123", lifecycleStage: "FRONTLINE_READY", operatingState: "ACTIVE",
  vehicle: { vin: "1NXBR32E85Z123456", stockNumber: "123456", year: 2005, make: "Toyota", model: "Corolla" }
};

describe("test-drive vehicle picker", () => {
  it("offers inventory selection and VIN entry without replacing the standard form", () => {
    const html = renderToStaticMarkup(<TestDriveVehiclePicker vehicle="" fields={{ vin: "", stockNumber: "", year: "", make: "", model: "", trim: "" }} onApply={vi.fn()} onVinChange={vi.fn()} />);
    expect(html).toContain("Select available vehicle");
    expect(html).toContain("Add vehicle / VIN");
    expect(html).toContain("Search available vehicles");
  });

  it("excludes sold, reserved, blocked, and incomplete identities", () => {
    expect(availableTestDriveVehicles([
      unit, { ...unit, id: "sold", lifecycleStage: "SOLD" }, { ...unit, id: "reserved", lifecycleStage: "RESERVED_DEAL_PENDING" },
      { ...unit, id: "blocked", operatingState: "BLOCKED" }, { ...unit, id: "missing", vehicle: { ...unit.vehicle, vin: null } }
    ])).toEqual([unit]);
  });

  it("fills the selected identity and uses the inventory number when stock is missing", () => {
    expect(testDriveInventoryIdentity(unit)).toEqual({ vin: unit.vehicle.vin, stockNumber: "123456", year: "2005", make: "Toyota", model: "Corolla", trim: "" });
    expect(testDriveInventoryIdentity({ ...unit, vehicle: { ...unit.vehicle, stockNumber: null, year: null } })).toMatchObject({ stockNumber: "INV-123", year: "" });
  });
});
