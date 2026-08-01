import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createRegistryVehicle: vi.fn(), decodeVinWithNhtsa: vi.fn(), findVehicleRegistryByPlate: vi.fn(), listVehicleRegistry: vi.fn(), previewVehicleRegistryImport: vi.fn() }));
vi.mock("@/server/vehicle-identification/nhtsa", () => ({ decodeVinWithNhtsa: mocks.decodeVinWithNhtsa }));
vi.mock("@/server/vehicle-registry/service", () => ({ createRegistryVehicle: mocks.createRegistryVehicle, findVehicleRegistryByPlate: mocks.findVehicleRegistryByPlate, listVehicleRegistry: mocks.listVehicleRegistry, previewVehicleRegistryImport: mocks.previewVehicleRegistryImport }));

import { normalizeAddVehicleWorkflowInput, previewAddVehicleIdentity, startAddVehicleWorkflow } from "@/server/inventory-workflow-launcher/add-vehicle";

const vin = "1HGCM82633A004352";
const decode = { provider: "NHTSA_VPIC", mappingVersion: 1, retrievedAt: "2026-07-31T12:00:00.000Z", vin, warnings: [], decoded: { bodyClass: "Sedan/Saloon", cabType: null, displacementLiters: "3", doors: "4", driveType: "FWD", engineConfiguration: "V-Shaped", engineCylinders: "6", fuelTypePrimary: "Gasoline", fuelTypeSecondary: null, gvwr: null, make: "HONDA", manufacturer: "HONDA", model: "Accord", modelYear: 2003, plantCountry: "USA", series: null, transmissionStyle: "Automatic", trim: "EX", vehicleType: "PASSENGER CAR" } };

describe("Add Vehicle canonical identification service", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.decodeVinWithNhtsa.mockResolvedValue(decode); mocks.previewVehicleRegistryImport.mockResolvedValue({ rows: [{ status: "VALID", normalized: { vin, vinState: "VALID", vinValidationSource: "ISO_3779_CHECK_DIGIT_V1" }, potentialDuplicate: null }] }); });

  it("returns a free NHTSA decode after canonical duplicate validation", async () => {
    const result = await previewAddVehicleIdentity(null, { lookupType: "VIN", vin });
    expect(result).toMatchObject({ lookupType: "VIN", decode, identity: { validationSource: "NHTSA_VPIC", vin }, potentialDuplicate: null });
  });

  it("uses plate and state only to search existing dealership records", async () => {
    mocks.findVehicleRegistryByPlate.mockResolvedValue({ id: "vehicle-1", vehicleNumber: "VEH-1", vin });
    const result = await previewAddVehicleIdentity(null, { lookupType: "PLATE", licensePlate: "ABC123", licensePlateState: "MN" });
    expect(mocks.findVehicleRegistryByPlate).toHaveBeenCalledWith(null, expect.objectContaining({ licensePlateState: "MN" }));
    expect(result).toMatchObject({ lookupType: "PLATE", plateMatch: true, potentialDuplicate: { id: "vehicle-1" } });
    expect(mocks.decodeVinWithNhtsa).not.toHaveBeenCalled();
  });

  it("searches only the local canonical registry when VIN is unknown", async () => {
    mocks.listVehicleRegistry.mockResolvedValue({ items: [{ id: "vehicle-1", make: "Mazda", model: "3", vehicleNumber: "VEH-1", vin: "JM1BL1SF3A1257561", year: 2010 }], page: 1, pageSize: 25, total: 1, totalPages: 1 });
    const result = await previewAddVehicleIdentity(null, { lookupType: "DETAILS", make: "Mazda", model: "3", year: 2010 });
    expect(mocks.listVehicleRegistry).toHaveBeenCalledWith(null, { page: 1, pageSize: 25, query: "2010 Mazda 3" });
    expect(result).toMatchObject({ lookupType: "DETAILS", matches: [{ id: "vehicle-1", vehicleNumber: "VEH-1" }] });
    expect(mocks.decodeVinWithNhtsa).not.toHaveBeenCalled();
  });

  it("rejects unknown or merely unavailable VINs from the new-vehicle path", () => {
    const base = { addMode: "QUICK", description: "Vehicle needs an initial inspection.", idempotencyKey: "add-no-vin", locationId: "loc-1", make: "Ford", model: "Tractor", nonVinReason: "VIN could not be found", odometer: 20, reasonCode: "INSPECTION_DIAGNOSIS", relationship: "OWNERSHIP_NOT_CONFIRMED", year: 1970 };
    expect(() => normalizeAddVehicleWorkflowInput(base)).toThrow("VIN is required unless staff attest that no VIN was assigned");
    expect(() => normalizeAddVehicleWorkflowInput({ ...base, nonVinAttested: true, nonVinExceptionCode: "NO_VIN_ASSIGNED" })).toThrow("does not qualify");
    const valid = normalizeAddVehicleWorkflowInput({ ...base, nonVinAttested: true, nonVinExceptionCode: "NO_VIN_ASSIGNED", nonVinReason: "Manufacturer documentation confirms this unit was produced without an assigned VIN." });
    expect(valid.nonVinReason).toContain("NO_VIN_ASSIGNED:");
  });

  it("blocks VIN-backed creation when authoritative decoding fails", async () => {
    mocks.decodeVinWithNhtsa.mockRejectedValueOnce(new Error("NHTSA decoding unavailable"));
    await expect(startAddVehicleWorkflow(null, { addMode: "QUICK", description: "Vehicle needs an initial inspection.", idempotencyKey: "add-decode-required", locationId: "loc-1", make: "Manual", model: "Entry", odometer: 20, reasonCode: "INSPECTION_DIAGNOSIS", relationship: "CUSTOMER_VEHICLE", vin, year: 2003 })).rejects.toThrow("NHTSA decoding unavailable");
    expect(mocks.createRegistryVehicle).not.toHaveBeenCalled();
  });

  it("creates one canonical record with decode origins, specifications, and initial odometer", async () => {
    mocks.createRegistryVehicle.mockResolvedValue({ result: { id: "vehicle-1", vehicleNumber: "VEH-1" }, version: 1 });
    await startAddVehicleWorkflow(null, { addMode: "DETAILED", description: "Customer reports a brake warning light.", idempotencyKey: "add-1", locationId: "loc-1", make: "manual make", model: "manual model", odometer: 42183, odometerUnit: "MILES", reasonCode: "SERVICE_REPAIR", relationship: "CUSTOMER_VEHICLE", vin, year: 2000 });
    expect(mocks.createRegistryVehicle).toHaveBeenCalledWith(null, expect.objectContaining({ make: "HONDA", model: "Accord", year: 2003 }), {}, expect.objectContaining({ canonicalOrigins: expect.objectContaining({ make: expect.objectContaining({ source: "NHTSA_VPIC" }) }), initialOdometer: expect.objectContaining({ reading: 42183, unit: "MILES" }), specificationSnapshot: expect.objectContaining({ provider: "NHTSA_VPIC", specifications: expect.objectContaining({ trim: "EX" }) }) }));
  });

  it("opens the new canonical vehicle in Inventory Control", async () => {
    mocks.createRegistryVehicle.mockResolvedValue({ result: { id: "vehicle-1", vehicleNumber: "VEH-1" }, version: 1 });
    const result = await startAddVehicleWorkflow(null, { acquisitionSource: "AUCTION", addMode: "QUICK", description: "Visible front damage; vehicle remains drivable.", externalLocation: "Copart — Des Moines, IA", idempotencyKey: "add-inventory-1", locationId: "loc-1", make: "manual make", model: "manual model", odometer: 42183, reasonCode: "INVENTORY_RECON", relationship: "DEALERSHIP_INVENTORY", vin, whereabouts: "AUCTION_FACILITY", year: 2000 });
    expect(result.nextWorkflow.href).toBe("/vehicles/vehicle-1/workbench");
    expect(mocks.createRegistryVehicle).toHaveBeenCalledWith(null, expect.anything(), {}, expect.objectContaining({ specificationSnapshot: expect.objectContaining({ specifications: expect.objectContaining({ externalLocation: "Copart — Des Moines, IA", whereabouts: "AUCTION_FACILITY" }) }) }));
  });
});
