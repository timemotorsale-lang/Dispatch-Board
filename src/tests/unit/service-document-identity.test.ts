import { describe, expect, it, vi } from "vitest";
import { serviceIdentity } from "@/server/repair-order/service-documents";

const issuedAt = new Date("2026-10-28T18:30:00Z");
function fixture(observations: { reading: number; unit: "MILES" | "KILOMETERS"; observedAt: Date }[] = []) {
  const findFirst = vi.fn().mockResolvedValue({
    customer: { displayName: "Customer" }, repairOrderNumber: "RO-1",
    vehicle: { year: 2010, make: "Mazda", model: "3", vin: "VIN", vehicleNumber: "VEH-1", color: "Gray", stockNumber: "STK-42", licensePlate: "ABC123", licensePlateState: "MN", odometerObservations: observations },
    serviceVisit: { concernSummary: "Replace starter" }, organization: { name: "Time Motor Sales" },
    location: { name: "Minneapolis", addressLine1: "1101 E. Lake Street", city: "Minneapolis", region: "MN", postalCode: "55407", timezone: "America/Chicago" },
  });
  return { repairOrder: { findFirst } };
}
describe("frozen service document vehicle identity", () => {
  it("uses the latest accepted mileage at estimate issue time and scopes the query to the organization", async () => {
    const db = fixture([{ reading: 125430, unit: "MILES", observedAt: new Date("2026-10-28T15:00:00Z") }]);
    const identity = await serviceIdentity(db as never, "org-1", "ro-1", issuedAt);
    expect(identity).toMatchObject({ vehicle: "2010 Mazda 3", color: "Gray", stockNumber: "STK-42", licensePlate: "ABC123", licensePlateState: "MN", odometer: { reading: 125430, unit: "MILES", observedAt: "2026-10-28T15:00:00.000Z" } });
    expect(db.repairOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "ro-1", organizationId: "org-1" }, include: expect.objectContaining({ vehicle: { include: { odometerObservations: { where: { organizationId: "org-1", status: "ACCEPTED", observedAt: { lte: issuedAt } }, orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 1 } } } }) }));
  });
  it("does not manufacture a zero reading when no accepted mileage is recorded", async () => {
    expect((await serviceIdentity(fixture() as never, "org-1", "ro-1", issuedAt)).odometer).toBeNull();
  });
  it("copies zero and kilometer readings into an immutable value snapshot", async () => {
    const reading = { reading: 0, unit: "KILOMETERS" as const, observedAt: issuedAt };
    const identity = await serviceIdentity(fixture([reading]) as never, "org-1", "ro-1", issuedAt);
    reading.reading = 100;
    expect(identity.odometer).toEqual({ reading: 0, unit: "KILOMETERS", observedAt: issuedAt.toISOString() });
  });
});
