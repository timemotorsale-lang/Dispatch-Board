import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DealVehicleChoice } from "@/lib/deal-continuity";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ context: vi.fn(), customer: vi.fn(), vehicle: vi.fn(), occupied: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { dealWorkflowContext: { findFirst: mocks.context }, vehicleUseBooking: { findFirst: mocks.occupied } } }));
vi.mock("@/server/sales-documents/service", () => ({ requireSalesDocumentsUser: (actor: unknown) => actor }));
vi.mock("@/server/deal-continuity/identities", () => ({ dealOrganization: () => "company-a", dealDocumentOrganization: () => "company-a", dealCustomer: mocks.customer, dealVehicle: mocks.vehicle }));
import { bhphDocumentIdentity } from "@/lib/bhph-document-identity";
import { validateDealDocumentContext } from "@/server/deal-continuity/service";

const actor = { id: "staff", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } } as AuthenticatedUser;
const context = { workflowContextId: "draft-1", customerId: "customer-1", customerName: "Fictional Buyer", pathway: "bhph", vehicleId: "vehicle-1", dealNumber: "1080", jacketReference: "jacket-1" };
const vehicle: DealVehicleChoice = { id: "vehicle-1", label: "2016 · Ford · Fusion · STOCK-42", vin: "3FA6P0H74GR123456", stockNumber: "STOCK-42", year: "2016", make: "Ford", model: "Fusion", color: "Blue", licensePlate: "", inventoryUnitId: "unit-1", locationId: "location-1", availability: "Available", eligibleForUse: true };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({ id: context.workflowContextId, organizationId: "company-a", customerId: context.customerId, vehicleId: vehicle.id, draft: { ownerUserId: actor.id, pathway: "bhph", dealNumber: "1080" } });
  mocks.customer.mockResolvedValue({ id: context.customerId, name: context.customerName });
  mocks.vehicle.mockResolvedValue(vehicle); mocks.occupied.mockResolvedValue(null);
});
describe("BHPH packet binds the saved canonical identity", () => {
  it("generates a valid identity when the display label has no VIN and retains the deal number and stock", async () => {
    expect(vehicle.label).not.toContain(vehicle.vin);
    const request = bhphDocumentIdentity(context, vehicle, "82000");
    expect(request).toMatchObject({ dealNumber: "1080", jacketReference: "jacket-1", customerId: "customer-1", vehicle: { vin: vehicle.vin, stockNumber: "STOCK-42", mileage: "82000", make: "Ford", model: "Fusion" } });
    expect(await validateDealDocumentContext(actor, request)).toEqual({ dealNumber: "1080" });
  });
  it("reproduces the rejected legacy request with a blank parsed VIN", async () => {
    await expect(validateDealDocumentContext(actor, { ...context, vehicle: { vin: "" } })).rejects.toMatchObject({ status: 409 });
  });
  it.each(["workflowContextId", "customerId", "customerName"])("requires saved %s without replacing it", key => {
    expect(() => bhphDocumentIdentity({ ...context, [key]: "" }, vehicle, "82000")).toThrow("shared customer and save");
  });
  it("does not silently convert another pathway", () => {
    expect(() => bhphDocumentIdentity({ ...context, pathway: "lease-to-own" }, vehicle, "82000")).toThrow("Change revenue pathway");
  });
  it("rejects missing or mismatched canonical vehicles", () => {
    for (const selected of [null, { ...vehicle, id: "another-vehicle" }]) expect(() => bhphDocumentIdentity(context, selected, "82000")).toThrow("Select the shared vehicle");
  });
  it("does not substitute a stock number or label for an incomplete VIN", () => {
    expect(() => bhphDocumentIdentity(context, { ...vehicle, vin: "123456" }, "82000")).toThrow("17-character VIN");
  });
  it("includes recorded trim and plate in the document fields without borrowing another vehicle's notes", () => {
    expect(bhphDocumentIdentity(context, { ...vehicle, trim: "SE", licensePlate: "DEMO42" }, "82000").vehicle).toMatchObject({ trim: "SE", license: "DEMO42", mileage: "82000" });
    expect(bhphDocumentIdentity(context, vehicle, "82000", { vehicleId: vehicle.id, trim: "Staff-entered trim" }).vehicle.trim).toBe("Staff-entered trim");
    expect(bhphDocumentIdentity(context, vehicle, "82000", { vehicleId: "another-vehicle", trim: "Wrong trim" }).vehicle.trim).toBe("");
  });
  it("leaves server rejection authoritative for a stale or manipulated VIN", async () => {
    const request = bhphDocumentIdentity(context, { ...vehicle, vin: "1NXBR32E85Z123456" }, "82000");
    await expect(validateDealDocumentContext(actor, request)).rejects.toMatchObject({ status: 409 });
  });
  it("still rejects changed customers, pathways and vehicles checked out elsewhere", async () => {
    const request = bhphDocumentIdentity(context, vehicle, "82000");
    await expect(validateDealDocumentContext(actor, { ...request, customerId: "other-customer" })).rejects.toMatchObject({ status: 409 });
    await expect(validateDealDocumentContext(actor, { ...request, pathway: "retail-sale" })).rejects.toMatchObject({ status: 409 });
    mocks.occupied.mockResolvedValue({ id: "other-booking" });
    await expect(validateDealDocumentContext(actor, request)).rejects.toThrow("checked out on another assignment");
  });
});
