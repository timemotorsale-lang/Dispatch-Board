import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getCompactIntake: vi.fn(), getCompactIntakeModel: vi.fn(), saveCompactIntake: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/inventory-unit/compact-intake-service", () => ({ getCompactIntake: mocks.getCompactIntake, getCompactIntakeModel: mocks.getCompactIntakeModel, saveCompactIntake: mocks.saveCompactIntake }));
import { GET, POST } from "@/app/api/inventory-units/compact-intake/route";

const actor = { id: "manager-1" };
const request = (body: unknown = {}) => new Request("http://localhost/api/inventory-units/compact-intake", { method: "POST", body: JSON.stringify(body) });

describe("compact intake route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(actor); });

  it("returns authorized flat intake context with financial response caching disabled", async () => {
    const model = { vehicleId: "vehicle-1", vehicleNumber: "VEH-1", details: { purchaseCents: null }, intakeVersion: 2, unitVersion: 1, locationId: "location-1", ownerUserId: "owner-1", canPrice: false };
    mocks.getCompactIntakeModel.mockResolvedValue(model);
    const response = await GET(new Request("http://localhost/api/inventory-units/compact-intake?vehicleId=vehicle-1"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(model);
    expect(mocks.getCompactIntakeModel).toHaveBeenCalledWith(actor, "vehicle-1");
    expect(mocks.getCompactIntake).not.toHaveBeenCalled();
  });

  it.each(["", "?vin=1HGCM82633A004352"])("uses guarded options and exact VIN lookup %s", async suffix => {
    mocks.getCompactIntake.mockResolvedValue({ intake: null, options: { locations: [], users: [], vehicles: [] } });
    const response = await GET(new Request(`http://localhost/api/inventory-units/compact-intake${suffix}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.getCompactIntake).toHaveBeenCalledWith(actor, { vin: suffix ? "1HGCM82633A004352" : null });
  });

  it("rejects conflicting identity parameters before reading a model", async () => {
    const response = await GET(new Request("http://localhost/api/inventory-units/compact-intake?vehicleId=vehicle-1&vin=1HGCM82633A004352"));
    expect(response.status).toBe(400);
    expect(mocks.getCompactIntakeModel).not.toHaveBeenCalled();
    expect(mocks.getCompactIntake).not.toHaveBeenCalled();
  });

  it("passes exact mutation input and returns stable receipt on replay", async () => {
    const result = { vehicleId: "vehicle-1", inventoryUnitId: "unit-1", inventoryNumber: "INV-1", intakeVersion: 2, unitVersion: 2, repairOrderId: "ro-1" };
    const input = { action: "SAVE_AND_START_RO", idempotencyKey: "retry-1", ownershipConfirmed: true };
    mocks.saveCompactIntake.mockResolvedValueOnce({ duplicate: false, result }).mockResolvedValueOnce({ duplicate: true, result });
    const created = await POST(request(input)), replayed = await POST(request(input));
    expect(created.status).toBe(201);
    expect(replayed.status).toBe(200);
    expect(await created.json()).toEqual({ duplicate: false, result });
    expect(await replayed.json()).toEqual({ duplicate: true, result });
    expect(mocks.saveCompactIntake).toHaveBeenCalledWith(actor, input);
  });

  it.each([
    [new Error("Authentication required."), 401],
    [new Error("Vehicle capability required: Edit acquisition intake."), 403],
    [new EnterpriseCommandConflictError("Intake changed; reload.", "VERSION_CONFLICT"), 409],
    [new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED"), 409],
    [new Error("Acquisition source is required."), 400],
  ])("maps guarded service failure to %s / %s", async (error, status) => {
    mocks.saveCompactIntake.mockRejectedValue(error);
    expect((await POST(request())).status).toBe(status);
    mocks.getCompactIntakeModel.mockRejectedValue(error);
    expect((await GET(new Request("http://localhost/api/inventory-units/compact-intake?vehicleId=vehicle-1"))).status).toBe(status);
  });

  it("handles malformed JSON through normal validation", async () => {
    mocks.saveCompactIntake.mockRejectedValue(new Error("Compact intake must be an object."));
    const response = await POST(new Request("http://localhost/api/inventory-units/compact-intake", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(mocks.saveCompactIntake).toHaveBeenCalledWith(actor, null);
  });

  it("does not expose database details in mutation errors", async () => {
    mocks.saveCompactIntake.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("private database detail", { code: "P2002", clientVersion: "test" }));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });
});
