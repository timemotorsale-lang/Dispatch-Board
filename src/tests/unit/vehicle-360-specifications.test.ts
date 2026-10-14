import { describe, expect, it } from "vitest";
import { projectVehicleSpecifications } from "@/server/vehicle-360/service";

describe("Vehicle 360 specification projection", () => {
  it("projects one canonical snapshot with field-level origins", () => {
    const decodedOrigin = { authority: "MANUFACTURER_SUBMITTED_VIN_DATA", confirmedAt: "2026-07-31T15:00:00.000Z", source: "NHTSA_VPIC", sourceReference: "1HGCM82633A004352" };
    const projected = projectVehicleSpecifications({
      canonicalOrigins: { make: decodedOrigin, year: decodedOrigin },
      color: "Black",
      licensePlate: "ABC123",
      licensePlateState: "MN",
      make: "HONDA",
      model: "Accord",
      specificationSnapshot: { addMode: "DETAILED", decodedAt: "2026-07-31T15:00:00.000Z", fieldOrigins: { bodyClass: decodedOrigin, detailedNotes: { authority: "STAFF_OBSERVATION", source: "STAFF_OBSERVED" } }, mappingVersion: 1, provider: "NHTSA_VPIC", specifications: { bodyClass: "Sedan/Saloon", detailedNotes: "Auction intake", displacementLiters: "3", engineCylinders: "6", transmissionStyle: "Automatic" }, warnings: [] },
      vin: "1HGCM82633A004352",
      year: 2003
    });

    expect(projected.available).toBe(true);
    expect(projected.canonical).toEqual(expect.objectContaining({ licensePlateState: "MN", make: "HONDA", year: 2003 }));
    expect(projected.specifications).toEqual(expect.objectContaining({ bodyClass: "Sedan/Saloon", engineCylinders: "6" }));
    expect(projected.fieldOrigins.bodyClass).toEqual(decodedOrigin);
    expect(projected.canonicalOrigins.make).toEqual(decodedOrigin);
  });

  it("keeps legacy canonical identity visible without inventing decoded details", () => {
    const projected = projectVehicleSpecifications({ make: "Toyota", model: "RAV4", specificationSnapshot: null, year: 2023 });

    expect(projected.available).toBe(false);
    expect(projected.provider).toBeNull();
    expect(projected.specifications).toEqual({});
    expect(projected.canonical).toEqual(expect.objectContaining({ make: "Toyota", model: "RAV4", year: 2023 }));
  });

  it("drops malformed warning and origin payloads at the read boundary", () => {
    const projected = projectVehicleSpecifications({ canonicalOrigins: ["invalid"], specificationSnapshot: { fieldOrigins: "invalid", specifications: "invalid", warnings: ["Valid warning", 42, ""] } });

    expect(projected.available).toBe(false);
    expect(projected.canonicalOrigins).toEqual({});
    expect(projected.fieldOrigins).toEqual({});
    expect(projected.warnings).toEqual(["Valid warning"]);
  });
});
