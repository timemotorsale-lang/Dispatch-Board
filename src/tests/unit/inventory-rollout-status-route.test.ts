import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/vehicle-operations/inventory-status/route";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  listFlags: vi.fn(),
  permitted: vi.fn(),
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/auth/navigation", () => ({ isRoutePermittedForUser: mocks.permitted }));
vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/enterprise-command/repository", () => ({
  createEnterpriseCommandRepository: () => ({ listFeatureFlags: mocks.listFlags }),
}));

const flag = (code: string, mode: string, locationId: string | null = null) => ({
  code, mode, locationId, targetAt: null, allowedUserIds: [], rolloutPercent: 0,
});
const intake = flag("INVENTORY_INTAKE", "GENERAL");
const retail = flag("RETAIL_INVENTORY", "GENERAL");
const master = flag("VEHICLE_OPERATIONS_MASTER", "GENERAL");

describe("inventory rollout status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "staff-1" });
    mocks.permitted.mockReturnValue(true);
  });

  it.each([
    { flags: [flag("VEHICLE_OPERATIONS_MASTER", "OFF"), intake, retail], status: "paused" },
    { flags: [flag("VEHICLE_OPERATIONS_MASTER", "OFF"), intake, retail,
      flag("VEHICLE_OPERATIONS_MASTER", "GENERAL", "shop-1"),
      flag("SHOP_OPERATIONS", "GENERAL", "shop-1"), flag("PARTS_OPERATIONS", "GENERAL", "shop-1")], status: "location-scoped" },
    { flags: [master, intake, retail, flag("RETAIL_INVENTORY", "OFF", "shop-1")], status: "location-scoped" },
    { flags: [master, intake, retail, flag("INVENTORY_INTAKE", "PILOT", "shop-1")], status: "location-scoped" },
    { flags: [master, intake, retail, flag("CUSTOMER_LIFECYCLE", "OFF", "shop-1")], status: "enabled" },
    { flags: [master, intake, flag("RETAIL_INVENTORY", "SHADOW")], status: "limited" },
    { flags: [flag("VEHICLE_OPERATIONS_MASTER", "SHADOW"), intake, retail], status: "limited" },
    { flags: [flag("VEHICLE_OPERATIONS_MASTER", "PILOT"), intake, retail], status: "limited" },
    { flags: [{ ...flag("VEHICLE_OPERATIONS_MASTER", "PILOT"), allowedUserIds: ["staff-1"] }, intake, retail], status: "limited" },
    { flags: [master, intake, retail], status: "enabled" },
  ])("reports the effective default rollout as $status", async ({ flags, status }) => {
    mocks.listFlags.mockResolvedValue(flags);
    const response = await GET();
    expect(await response.json()).toEqual({ status });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns no rollout data to unauthorized users or when the lookup fails", async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
    mocks.permitted.mockReturnValueOnce(false);
    expect((await GET()).status).toBe(403);
    expect(mocks.listFlags).not.toHaveBeenCalled();

    mocks.listFlags.mockRejectedValueOnce(new Error("Unavailable"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({});
  });
});
