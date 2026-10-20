import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  location: vi.fn(), vehicle: vi.fn(), units: vi.fn(), auditCreate: vi.fn(), auditFind: vi.fn(), ledger: vi.fn(), grants: vi.fn(), flags: vi.fn(), rollout: vi.fn(), create: vi.fn(),
}));
vi.mock("@/server/db/client", () => ({ prisma: {
  location: { findFirst: mocks.location }, vehicle: { findFirst: mocks.vehicle }, inventoryUnit: { findMany: mocks.units },
  enterpriseAuditEvent: { create: mocks.auditCreate, findFirst: mocks.auditFind }, enterpriseCommandLedger: { findUnique: mocks.ledger },
} }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants, listFeatureFlags: mocks.flags }) }));
vi.mock("@/server/enterprise-command/service", () => ({ evaluateVehicleOperationsFeature: mocks.rollout }));
vi.mock("@/server/vehicle-registry/service", () => ({ createRegistryVehicle: mocks.create }));
import { applyInventoryImport, exportInventory, previewInventoryImport } from "@/server/inventory-transfer/service";

const user: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Staff"], duties: { all: ["Import inventory records", "Export inventory data"], direct: [], roleDefaults: [] } };
const input = { locationId: "lot", csv: "VIN,Stock\n1HGCM82633A004352,00123", mapping: { vin: "VIN", stockNumber: "Stock" } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.location.mockResolvedValue({ id: "lot" }); mocks.vehicle.mockResolvedValue(null); mocks.ledger.mockResolvedValue(null);
  mocks.grants.mockResolvedValue([]); mocks.flags.mockResolvedValue([]); mocks.rollout.mockReturnValue({ executable: true });
  mocks.auditCreate.mockImplementation(async ({ data }) => data);
  mocks.create.mockImplementation(async (_actor, _values, _deps, trusted) => ({ result: { id: trusted.vehicleId, duplicateReviewId: null } }));
  mocks.units.mockResolvedValue([]);
});
async function preview() {
  const result = await previewInventoryImport(user, input);
  mocks.auditFind.mockResolvedValue({ locationId: "lot", metadata: result });
  return result;
}
describe("inventory transfer authorization and execution", () => {
  it("refuses unauthenticated, inactive and unauthorized staff before reading data", async () => {
    await expect(previewInventoryImport(null, input)).rejects.toThrow();
    await expect(previewInventoryImport({ ...user, isActive: false }, input)).rejects.toThrow();
    await expect(previewInventoryImport({ ...user, duties: { all: [], direct: [], roleDefaults: [] } }, input)).rejects.toThrow("capability required");
    expect(mocks.vehicle).not.toHaveBeenCalled();
  });
  it("honors location denials and master shutdown before preview or import", async () => {
    mocks.grants.mockResolvedValue([{ capability: "VEHICLE_IDENTITY_CREATE", effect: "DENY", locationId: "lot", validFrom: new Date(0), validTo: null }]);
    await expect(previewInventoryImport(user, input)).rejects.toThrow("EXPLICIT_DENY");
    mocks.grants.mockResolvedValue([]); mocks.rollout.mockReturnValue({ executable: false, reason: "MASTER_DISABLED" });
    await expect(previewInventoryImport(user, input)).rejects.toThrow("MASTER_DISABLED");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("detects invalid VINs, existing vehicles and repeated file rows without creating records", async () => {
    mocks.vehicle.mockResolvedValueOnce({ id: "existing", vehicleNumber: "KNOWN" });
    const result = await previewInventoryImport(user, { ...input, csv: input.csv + "\n1HGCM82633A004352,00123\nbad,002" });
    expect(result.rows.map(row => row.status)).toEqual(["DUPLICATE", "DUPLICATE", "INVALID"]);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });
  it("binds previews to the actor and rejects missing or expired previews", async () => {
    mocks.auditFind.mockResolvedValue(null);
    await expect(applyInventoryImport(user, { batchId: "other" })).rejects.toThrow("this staff account");
    expect(mocks.auditFind.mock.calls[0][0].where.actorUserId).toBe(user.id);
    const saved = await preview();
    mocks.auditFind.mockResolvedValue({ locationId: "lot", metadata: { ...saved, expiresAt: new Date(0).toISOString() } });
    await expect(applyInventoryImport(user, { batchId: saved.batchId })).rejects.toThrow("expired");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("ignores client replacement rows and uses the saved preview and stable vehicle ID", async () => {
    const saved = await preview();
    const result = await applyInventoryImport(user, { batchId: saved.batchId, rows: [{ vin: "bad" }], locationId: "other" });
    expect(result.rows[0].status).toBe("CREATED");
    expect(mocks.create.mock.calls[0][1]).toMatchObject({ vin: "1HGCM82633A004352", locationId: "lot", stockNumber: "00123" });
    expect(mocks.create.mock.calls[0][3].vehicleId).toBe(saved.rows[0].values!.vehicleId);
    expect(mocks.create.mock.calls[0][1].idempotencyKey).toBe(`inventory-import:${saved.batchId}:2`);
  });
  it("does not create completed rows on retry and rechecks duplicates before a new write", async () => {
    const saved = await preview();
    mocks.ledger.mockResolvedValue({ resultSnapshot: { id: "created" } });
    expect((await applyInventoryImport(user, { batchId: saved.batchId })).rows[0]).toMatchObject({ status: "CREATED", vehicleId: "created" });
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.ledger.mockResolvedValue(null); mocks.vehicle.mockResolvedValue({ id: "other", vehicleNumber: "OTHER" });
    expect((await applyInventoryImport(user, { batchId: saved.batchId })).rows[0].status).toBe("DUPLICATE");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("returns partial failures with no false success and does not expose database details", async () => {
    const saved = await preview(); mocks.create.mockRejectedValue(new Error("database password secret"));
    const result = await applyInventoryImport(user, { batchId: saved.batchId });
    expect(result.rows[0].status).toBe("FAILED"); expect(result.rows[0].message).not.toContain("secret");
  });
  it("rechecks permissions at apply time", async () => {
    const saved = await preview();
    mocks.grants.mockResolvedValue([{ capability: "VEHICLE_IDENTITY_CREATE", effect: "DENY", locationId: "lot", validFrom: new Date(0), validTo: null }]);
    await expect(applyInventoryImport(user, { batchId: saved.batchId })).rejects.toThrow("EXPLICIT_DENY");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires export permission, enforces field constraints and rejects private columns", async () => {
    const request = { locationId: "lot", columns: ["vin", "make"] };
    await expect(exportInventory({ ...user, duties: { all: ["Work on inventory"], direct: [], roleDefaults: [] } }, request)).rejects.toThrow("VEHICLE_OUTPUT_CREATE");
    mocks.grants.mockResolvedValue([{ capability: "VEHICLE_OUTPUT_CREATE", effect: "ALLOW", locationId: "lot", validFrom: new Date(0), validTo: null, constraints: { fieldAllowlist: ["vin"] } }]);
    await expect(exportInventory(user, request)).rejects.toThrow("GRANT_CONSTRAINTS_NOT_MET");
    await expect(exportInventory(user, { ...request, columns: ["customerName"] })).rejects.toThrow("valid export columns");
    expect(mocks.units).not.toHaveBeenCalled();
  });
  it("scopes active inventory to the authorized location, limits rows and audits downloads only", async () => {
    const item = { vehicle: { vin: "1HGCM82633A004352", make: "=cmd" }, inventoryNumber: "00123", lifecycleStage: "INSPECTION", operatingState: "ACTIVE", financialAcquiredAt: new Date("2026-01-01"), location: { name: "Lot" } };
    mocks.units.mockResolvedValue([item]);
    const request = { locationId: "lot", columns: ["vin", "make"] };
    expect(await exportInventory(user, request)).toMatchObject({ total: 1, rows: [[item.vehicle.vin, "=cmd"]] });
    expect(mocks.units.mock.calls[0][0].where).toMatchObject({ locationId: "lot", closedAt: null });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(await exportInventory(user, request, true)).toMatchObject({ total: 1, csv: expect.stringContaining("'=cmd") });
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
    mocks.units.mockResolvedValue(Array(5001).fill(item));
    await expect(exportInventory(user, request)).rejects.toThrow("5,000");
  });
});
