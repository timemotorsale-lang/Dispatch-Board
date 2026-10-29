import { describe, expect, it, vi } from "vitest";
import { serviceIdentity, invoiceReceiptIdentity } from "@/server/repair-order/service-documents";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

const issuedAt = new Date("2026-10-28T18:30:00Z");
function fixture(observations: { reading: number; unit: "MILES" | "KILOMETERS"; observedAt: Date }[] = []) {
  const findFirst = vi.fn().mockResolvedValue({
    customer: { displayName: "Customer" }, repairOrderNumber: "RO-1",
    vehicle: { year: 2010, make: "Mazda", model: "3", vin: "VIN", vehicleNumber: "VEH-1", color: "Gray", stockNumber: "STK-42", licensePlate: "ABC123", licensePlateState: "MN", odometerObservations: observations },
    serviceVisit: { concernSummary: "Replace starter" }, organization: { name: "Time Motor Sales" },
    location: { name: "Minneapolis", addressLine1: "1101 E. Lake Street", city: "Minneapolis", region: "MN", postalCode: "55407", timezone: "America/Chicago" },
  });
  return { repairOrder: { findFirst }, serviceDocument: { findFirst: vi.fn().mockResolvedValue(null) } };
}
describe("frozen service document vehicle identity", () => {
  it("carries saved customer details into later documents and payment receipts without changing prior snapshots", async () => {
    const db = fixture();
    const original = await serviceIdentity(db as never, "org-1", "ro-1", issuedAt);
    const identity = { ...original, customer: "Complete Customer Name", customerContact: { phone: "612-555-0100", email: "customer@example.test", address: "123 Example St" } };
    const content = { identity, customerDetailsEdited: true };
    db.serviceDocument.findFirst.mockResolvedValue({ content, templateVersion: "service-document-v3", sha256: hashEnterpriseCommand({ templateVersion: "service-document-v3", content }) });
    expect((await serviceIdentity(db as never, "org-1", "ro-1", issuedAt)).customerContact).toEqual(identity.customerContact);
    expect(await invoiceReceiptIdentity(db as never, "org-1", "ro-1", "invoice-1", original)).toEqual(identity);
    expect(original.customer).toBe("Customer");
    expect(db.serviceDocument.findFirst).toHaveBeenLastCalledWith({ where: { organizationId: "org-1", repairOrderId: "ro-1", kind: "INVOICE", sourceId: "invoice-1" }, orderBy: { sourceVersion: "desc" } });
  });
  it("refuses corrupt contact snapshots rather than printing unverified details", async () => {
    const db = fixture();
    const identity = await serviceIdentity(db as never, "org-1", "ro-1", issuedAt);
    db.serviceDocument.findFirst.mockResolvedValue({ content: { identity }, templateVersion: "v1", sha256: "corrupt" });
    await expect(invoiceReceiptIdentity(db as never, "org-1", "ro-1", "invoice-1", identity)).rejects.toThrow("integrity");
  });
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
