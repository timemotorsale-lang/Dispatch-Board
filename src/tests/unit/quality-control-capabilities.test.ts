import { describe, expect, it } from "vitest";

import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

const qcUser = {
  id: "user-quincy",
  name: "Quincy QC",
  email: "quincy.qc@local.test",
  isActive: true,
  roles: ["Quality Control"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

describe("quality control capability defaults", () => {
  it("lets QC inspect repair orders without granting unrelated management powers", () => {
    for (const capability of [
      "VEHICLE_OPERATIONS_VIEW",
      "REPAIR_ORDER_VIEW",
      "REPAIR_ORDER_MANAGE",
      "VEHICLE_EVIDENCE_VIEW"
    ] as const) {
      expect(evaluateVehicleCapability({
        actor: qcUser,
        capability,
        grants: [],
        locationId: null,
        now: new Date("2026-07-20T14:00:00.000Z")
      })).toEqual({ allowed: true, reason: "ROLE_DEFAULT" });
    }

    expect(evaluateVehicleCapability({
      actor: qcUser,
      capability: "PARTS_MANAGE",
      grants: [],
      locationId: null,
      now: new Date("2026-07-20T14:00:00.000Z")
    }).allowed).toBe(false);

    expect(evaluateVehicleCapability({
      actor: qcUser,
      capability: "VEHICLE_CAPABILITY_MANAGE",
      grants: [],
      locationId: null,
      now: new Date("2026-07-20T14:00:00.000Z")
    }).allowed).toBe(false);
  });
});
