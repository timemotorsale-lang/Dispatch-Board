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
const inventoryManager: AuthenticatedUser = {
  ...brock,
  id: "inventory-manager",
  roles: ["Inventory Manager"]
};

describe("vehicle operations lead capability defaults", () => {
  it("supports Brock's current multi-hat vehicle workspace without making him a general manager", () => {
    for (const capability of [
      "VEHICLE_OPERATIONS_VIEW",
      "VEHICLE_IDENTITY_CREATE",
      "INVENTORY_UNIT_VIEW",
      "INVENTORY_UNIT_MANAGE",
      "REPAIR_ORDER_VIEW",
      "REPAIR_ORDER_MANAGE",
      "PARTS_VIEW",
      "PARTS_MANAGE",
      "VEHICLE_EVIDENCE_VIEW",
      "VEHICLE_EVIDENCE_MANAGE",
      "VEHICLE_DISCOVERY_VIEW",
      "WORK_KNOWLEDGE_VIEW",
      "WORK_KNOWLEDGE_MANAGE"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: brock,
        capability,
        grants: [],
        locationId: null
      })).toMatchObject({ allowed: true, reason: "ROLE_DEFAULT" });
    }

    expect(evaluateVehicleCapability({
      actor: brock,
      capability: "VEHICLE_CAPABILITY_MANAGE",
      grants: [],
      locationId: null
    })).toMatchObject({ allowed: false, reason: "GENERAL_MANAGER_OR_GRANT_REQUIRED" });
  });

  it("gives the inventory manager hat the same recon execution capability set", () => {
    expect(evaluateVehicleCapability({
      actor: inventoryManager,
      capability: "PARTS_MANAGE",
      grants: [],
      locationId: null
    })).toMatchObject({ allowed: true, reason: "ROLE_DEFAULT" });
    expect(evaluateVehicleCapability({
      actor: inventoryManager,
      capability: "INVENTORY_UNIT_MANAGE",
      grants: [],
      locationId: null
    })).toMatchObject({ allowed: true, reason: "ROLE_DEFAULT" });
  });
});
