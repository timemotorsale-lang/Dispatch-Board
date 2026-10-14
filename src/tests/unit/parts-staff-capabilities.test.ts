import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

const partsUser: AuthenticatedUser = {
  id: "parts",
  name: "Pat Parts",
  email: "pat.parts@example.test",
  isActive: true,
  roles: ["Parts"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

describe("parts staff capability defaults", () => {
  it("can operate parts readiness without repair or admin authority", () => {
    for (const capability of [
      "VEHICLE_OPERATIONS_VIEW",
      "REPAIR_ORDER_VIEW",
      "PARTS_VIEW",
      "PARTS_MANAGE"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: partsUser,
        capability,
        grants: [],
        locationId: null
      })).toMatchObject({ allowed: true, reason: "ROLE_DEFAULT" });
    }

    expect(evaluateVehicleCapability({
      actor: partsUser,
      capability: "REPAIR_ORDER_MANAGE",
      grants: [],
      locationId: null
    })).toMatchObject({ allowed: false, reason: "CAPABILITY_REQUIRED" });

    expect(evaluateVehicleCapability({
      actor: partsUser,
      capability: "VEHICLE_CAPABILITY_MANAGE",
      grants: [],
      locationId: null
    })).toMatchObject({ allowed: false, reason: "GENERAL_MANAGER_OR_GRANT_REQUIRED" });
  });
});
