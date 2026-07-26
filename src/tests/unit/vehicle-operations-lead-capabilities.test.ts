import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

const brock: AuthenticatedUser = {
  id: "brock",
  name: "Brock Inventory",
  email: "brock@example.test",
  isActive: true,
  roles: ["Inventory Manager", "Service Department Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

describe("vehicle operations lead capability defaults", () => {
  it("supports Brock's current multi-hat vehicle workspace without making him a general manager", () => {
    for (const capability of [
      "VEHICLE_OPERATIONS_VIEW",
      "VEHICLE_IDENTITY_CREATE",
      "INVENTORY_UNIT_VIEW",
      "REPAIR_ORDER_VIEW",
      "PARTS_VIEW"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: brock,
        capability,
        grants: [],
        locationId: null
      })).toMatchObject({ allowed: true, reason: "VEHICLE_OPERATIONS_LEAD_DEFAULT" });
    }

    expect(evaluateVehicleCapability({
      actor: brock,
      capability: "VEHICLE_CAPABILITY_MANAGE",
      grants: [],
      locationId: null
    })).toMatchObject({ allowed: false, reason: "GENERAL_MANAGER_OR_GRANT_REQUIRED" });
  });
});
