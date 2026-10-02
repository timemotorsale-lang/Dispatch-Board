import { beforeEach, describe, expect, it, vi } from "vitest";
import { applicableDecodeProposals } from "@/lib/crm-vehicle-decode";
const mocks = vi.hoisted(() => ({ user: vi.fn(), list: vi.fn(), decode: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/vehicle-registry/service", () => ({ listVehicleRegistry: mocks.list }));
vi.mock("@/server/vehicle-identification/nhtsa", () => ({ decodeVinWithNhtsa: mocks.decode }));
import { POST } from "@/app/api/crm/v1/vehicle-decode/route";
const vin = "1HGCM82633A004352";
const item = { id: "v1", vehicleNumber: "VEH-1", vin, vinRaw: vin, stockNumber: "STOCK-100", year: 2003, make: "Honda", model: "Accord", color: "Blue", licensePlate: "ABC123" };
const decoded = { make: "HONDA", model: "Accord", modelYear: 2003, trim: "EX", bodyClass: "Sedan", driveType: "FWD", displacementLiters: "3", engineCylinders: "6", transmissionStyle: "Automatic", abs: "Standard" };
async function post(input: unknown) { return POST(new Request("http://crm.local/api/crm/v1/vehicle-decode", { method: "POST", body: JSON.stringify(input) })); }
describe("CRM enterprise VIN decoding", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "manager-1" });
    mocks.list.mockResolvedValue({ items: [item], total: 1 });
    mocks.decode.mockResolvedValue({ vin, decoded, provider: "NHTSA_VPIC", retrievedAt: "2026-10-02T12:00:00Z", warnings: [] });
  });
  it("resolves a stock number and returns sourced proposals and detailed specifications", async () => {
    const response = await post({ query: "STOCK-100", modelYear: 2003 });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result.vin).toBe(vin);
    expect(mocks.decode).toHaveBeenCalledWith(vin, { modelYear: 2003 });
    expect(result.proposals).toEqual(expect.arrayContaining([
      { field: "model", label: "Model", value: "Accord", source: "Inventory" },
      { field: "stockNumber", label: "Stock number", value: "STOCK-100", source: "Inventory" },
      { field: "trim", label: "Trim", value: "EX", source: "NHTSA vPIC" }
    ]));
    expect(result.specifications).toMatchObject({ abs: "Standard", engineCylinders: "6" });
    expect(result.proposals.some((proposal: { field: string }) => proposal.field === "mileage")).toBe(false);
  });
  it("returns ambiguous candidates without choosing a vehicle or calling the provider", async () => {
    mocks.list.mockResolvedValueOnce({ items: [item, { ...item, id: "v2" }], total: 2 });
    const result = await (await post({ query: "004352" })).json();
    expect(result.candidates).toHaveLength(2); expect(result.vin).toBeNull(); expect(mocks.decode).not.toHaveBeenCalled();
  });
  it("does not auto-select from a truncated inventory result", async () => {
    mocks.list.mockResolvedValueOnce({ items: [item], total: 110 });
    expect((await (await post({ query: "Honda" })).json()).vin).toBeNull();
    expect(mocks.decode).not.toHaveBeenCalled();
  });
  it("returns a no-match result without inventing a VIN", async () => {
    mocks.list.mockResolvedValueOnce({ items: [], total: 0 });
    const result = await (await post({ query: "MISSING" })).json();
    expect(result.proposals).toEqual([]); expect(result.vin).toBeNull();
  });
  it("preserves inventory identity when NHTSA disagrees", async () => {
    mocks.decode.mockResolvedValueOnce({ decoded: { ...decoded, model: "Civic" }, warnings: [] });
    const result = await (await post({ vin })).json();
    expect(result.warnings.join(" ")).toContain("Model differs");
    expect(result.proposals.find((proposal: { field: string }) => proposal.field === "model").value).toBe("Accord");
  });
  it("falls back to inventory, without fabricating unavailable specs", async () => {
    mocks.decode.mockRejectedValueOnce(new Error("timeout"));
    const result = await (await post({ vin })).json();
    expect(result.provider).toBe("INVENTORY_ONLY"); expect(result.specifications).toEqual({});
    expect(result.proposals.some((proposal: { field: string }) => proposal.field === "trim")).toBe(false);
    expect(result.warnings).not.toHaveLength(0);
  });
  it("decodes a new VIN and labels a derived stock number separately", async () => {
    mocks.list.mockResolvedValueOnce({ items: [], total: 0 });
    const result = await (await post({ vin: vin.toLowerCase() })).json();
    expect(result.proposals).toContainEqual({ field: "stockNumber", label: "Stock number", value: "004352", source: "VIN suffix" });
    expect(result.proposals.some((proposal: { field: string }) => proposal.field === "color")).toBe(false);
  });
  it.each(["1HGCM82623A004352", "1HGCM82633A00435I", "1HGCM82633A004352EXTRA", "123456"])("rejects invalid VIN %s before lookup", async (invalid) => {
    expect((await post({ vin: invalid })).status).toBe(400); expect(mocks.list).not.toHaveBeenCalled();
  });
  it("enforces authentication and inventory view permissions", async () => {
    mocks.user.mockResolvedValueOnce(null); expect((await post({ vin })).status).toBe(401);
    mocks.list.mockRejectedValueOnce(new Error("Vehicle capability required: VEHICLE_OPERATIONS_VIEW"));
    expect((await post({ vin })).status).toBe(403); expect(mocks.decode).not.toHaveBeenCalled();
  });
  it("reports database outages without leaking internals", async () => {
    mocks.list.mockRejectedValueOnce(new Error("secret database credentials"));
    const response = await post({ vin }); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
  it("proposes only available fields supported by the current desk", () => {
    expect(applicableDecodeProposals([
      { field: "make", label: "Make", value: "Honda", source: "Inventory" },
      { field: "trim", label: "Trim", value: "EX", source: "NHTSA vPIC" },
      { field: "engine", label: "Engine", value: "3L", source: "NHTSA vPIC" }
    ], { make: "Honda", trim: "" }).map((proposal) => proposal.field)).toEqual(["trim"]);
  });
});
