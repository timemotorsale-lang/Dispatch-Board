import { describe, expect, it } from "vitest";
import { inferVehiclePhotoAngle, intakePhotoName, vehiclePhotoAngles } from "@/lib/vehicle-photo-coverage";
describe("shared intake photo coverage", () => {
  it("has ten required angles and optional damage evidence", () => {
    expect(vehiclePhotoAngles.filter(item => item.code !== "damage_closeup")).toHaveLength(10);
  });
  it("labels ordinary camera filenames without requiring staff to rename them", () => {
    expect(intakePhotoName("front_left", "IMG001.jpg")).toBe("front_left-IMG001.jpg");
    expect(inferVehiclePhotoAngle(intakePhotoName("front_left", "IMG001.jpg"))).toBe("front_left");
    expect(() => intakePhotoName("forged", "IMG001.jpg")).toThrow("valid intake photo angle");
  });
  it("gives damage precedence over ordinary angles", () => {
    expect(inferVehiclePhotoAngle("odometer-damage.jpg")).toBe("damage_closeup");
    expect(inferVehiclePhotoAngle("rear_left-dent.jpg")).toBe("damage_closeup");
  });
});
