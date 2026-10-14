import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmPilotOperationsPackage } from "@/server/services/unified-crm-pilot-operations-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM pilot operations package", () => {
  it("returns all required pilot operations sections for manager review", async () => {
    const result = await getUnifiedCrmPilotOperationsPackage(manager, {
      now: () => new Date("2026-08-26T23:15:00.000Z")
    });

    expect(result.packageStatus).toBe("READY_FOR_REVIEW");
    expect(result.sections.map((section) => section.title)).toEqual([
      "cohort",
      "featureFlags",
      "training",
      "support",
      "knownLimits",
      "monitoring",
      "incidentEscalation",
      "privacy",
      "backup",
      "rollback"
    ]);
    expect(result.sections.every((section) => section.owner && section.items.length > 0)).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmPilotOperationsPackage(seller)).rejects.toMatchObject({
      code: "PILOT_OPERATIONS_NOT_AUTHORIZED"
    });
  });
});
