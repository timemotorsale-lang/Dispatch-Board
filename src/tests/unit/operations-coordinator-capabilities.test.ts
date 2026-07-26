import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

const coordinator: AuthenticatedUser = {
  id: "coordinator",
  name: "Ancilla Ops",
  email: "avery.ops@example.test",
  isActive: true,
  roles: ["Operations Coordinator"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const legacyCoordinator: AuthenticatedUser = {
  ...coordinator,
  id: "legacy-coordinator",
  roles: ["Office Manager", "Marketing/Advertisement Manager"]
};

describe("operations coordinator capability defaults", () => {
  it("allows broad view and lightweight preparation without manager authority", () => {
    for (const capability of [
      "VEHICLE_OPERATIONS_VIEW",
      "VEHICLE_IDENTITY_CREATE",
      "INVENTORY_UNIT_VIEW",
      "REPAIR_ORDER_VIEW",
      "PARTS_VIEW",
      "VEHICLE_EVIDENCE_VIEW",
      "VEHICLE_DISCOVERY_VIEW",
      "CUSTOMER_LIFECYCLE_VIEW"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: coordinator,
        capability,
        grants: [],
        locationId: null
      })).toMatchObject({ allowed: true, reason: "ROLE_DEFAULT" });
    }
  });

  it("blocks protected final-authority actions", () => {
    for (const capability of [
      "REPAIR_ORDER_MANAGE",
      "PARTS_MANAGE",
      "INVENTORY_UNIT_MANAGE",
      "VEHICLE_EVIDENCE_MANAGE",
      "CUSTOMER_LIFECYCLE_MANAGE",
      "VEHICLE_CAPABILITY_MANAGE",
      "VEHICLE_POLICY_APPROVE"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: coordinator,
        capability,
        grants: [],
        locationId: null
      }).allowed).toBe(false);
    }
  });

  it("treats the existing Ancilla role combination as coordinator view access", () => {
    for (const capability of [
      "VEHICLE_OPERATIONS_VIEW",
      "INVENTORY_UNIT_VIEW",
      "REPAIR_ORDER_VIEW",
      "PARTS_VIEW",
      "VEHICLE_DISCOVERY_VIEW",
      "CUSTOMER_LIFECYCLE_VIEW"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: legacyCoordinator,
        capability,
        grants: [],
        locationId: null
      })).toMatchObject({ allowed: true, reason: "OPERATIONS_COORDINATOR_DEFAULT" });
    }

    expect(evaluateVehicleCapability({
      actor: legacyCoordinator,
      capability: "PARTS_MANAGE",
      grants: [],
      locationId: null
    }).allowed).toBe(false);
  });
});
