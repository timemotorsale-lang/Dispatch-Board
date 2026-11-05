import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ vehicle: vi.fn(), booking: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { vehicle: { findFirst: mocks.vehicle }, vehicleUseBooking: { findFirst: mocks.booking } } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "company-a" }) }));
import { dealVehicle } from "@/server/deal-continuity/identities";
const actor = { id: "staff", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } } as AuthenticatedUser;
const record = { id: "vehicle-a", vin: "2T3W1RFVXRW333586", year: 2024, make: "Toyota", model: "RAV4", color: "Silver", licensePlate: "DEMO42", specificationSnapshot: { specifications: { trim: "XLE" } }, inventoryUnits: [{ id: "unit-a", inventoryNumber: "STOCK-42", locationId: "location-a", lifecycleStage: "FRONTLINE_READY", operatingState: "ACTIVE" }], odometerObservations: [{ reading: 54000, observedAt: new Date("2026-11-03T18:00:00Z") }] };
beforeEach(() => { vi.resetAllMocks(); mocks.vehicle.mockResolvedValue(record); mocks.booking.mockResolvedValue(null); });
describe("shared vehicle prefill", () => {
  it("returns recorded identity, trim and accepted mileage within the company boundary", async () => {
    expect(await dealVehicle(actor, "vehicle-a")).toMatchObject({ vin: record.vin, year: "2024", stockNumber: "STOCK-42", trim: "XLE", recordedMileage: "54000", mileageRecordedAt: "2026-11-03T18:00:00.000Z", licensePlate: "DEMO42" });
    expect(mocks.vehicle).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "vehicle-a", organizationId: "company-a", status: "ACTIVE" }), include: expect.objectContaining({ odometerObservations: { where: { organizationId: "company-a", status: "ACCEPTED", unit: "MILES" }, orderBy: { observedAt: "desc" }, take: 1 } }) }));
  });
  it("leaves absent trim and mileage empty without inferring values", async () => {
    mocks.vehicle.mockResolvedValue({ ...record, specificationSnapshot: null, odometerObservations: [] });
    expect(await dealVehicle(actor, "vehicle-a")).toMatchObject({ trim: "", recordedMileage: "", mileageRecordedAt: "" });
  });
});
