import { describe, expect, it } from "vitest";
import { industryOptions } from "../src/lib/industry-options";
import { vehicleColorSwatch } from "../src/lib/vehicle-colors";

describe("vehicle color samples", () => {
  it("covers every standard exterior and interior color with a valid color", () => {
    for (const color of [...industryOptions.exteriorColor, ...industryOptions.interiorColor]) expect(vehicleColorSwatch(color)).toMatch(/^#[0-9A-F]{6}$/);
    expect(vehicleColorSwatch("White")).toBe("#FFFFFF");
    expect(vehicleColorSwatch("Silver")).toBe("#C0C0C0");
    expect(vehicleColorSwatch("Burgundy")).toBe("#800020");
  });
  it("normalizes known names without guessing manufacturer-specific or multi-tone finishes", () => {
    expect(vehicleColorSwatch("  BLUE ")).toBe(vehicleColorSwatch("Blue"));
    expect(vehicleColorSwatch("Grey")).toBe(vehicleColorSwatch("Gray"));
    for (const color of ["Midnight Mystery", "Blue / White", "", "#FF0000", "constructor", "toString"]) expect(vehicleColorSwatch(color)).toBeNull();
  });
});
