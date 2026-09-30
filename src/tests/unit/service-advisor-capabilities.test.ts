import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

const advisor: AuthenticatedUser = {
  id: "advisor",
  name: "Alex Carter",
  email: "alex.advisor@example.test",
  isActive: true,
  roles: ["Service Advisor"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

describe("service advisor capability defaults", () => {
  it("can perform recon execution with the current inventory manager capability set without admin authority", () => {
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
      "WORK_KNOWLEDGE_MANAGE",
      "CUSTOMER_INTAKE_CREATE",
      "DIAGNOSTIC_CASE_VIEW",
      "DIAGNOSTIC_ESTIMATE_ADVISOR_REVIEW"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: advisor,
        capability,
        grants: [],
        locationId: null
      })).toMatchObject({ allowed: true, reason: "ROLE_DEFAULT" });
    }

    expect(evaluateVehicleCapability({
      actor: advisor,
      capability: "VEHICLE_CAPABILITY_MANAGE",
      grants: [],
      locationId: null
    })).toMatchObject({ allowed: false, reason: "GENERAL_MANAGER_OR_GRANT_REQUIRED" });
  });
});
