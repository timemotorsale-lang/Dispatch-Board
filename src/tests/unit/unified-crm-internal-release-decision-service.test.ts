import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmInternalReleaseDecision } from "@/server/services/unified-crm-internal-release-decision-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM internal release decision", () => {
  it("keeps internal release held until all release decision fields are recorded", async () => {
    const result = await getUnifiedCrmInternalReleaseDecision(manager, {
      now: () => new Date("2026-08-27T00:00:00.000Z")
    });

    expect(result.decision).toBe("HELD");
    expect(result.approvedCohorts).toEqual([]);
    expect(result.approvedCapabilities).toEqual([]);
    expect(result.evidenceCommit).toBe("pending");
    expect(result.migrationVersion).toBe("pending");
    expect(result.rollbackTrigger).toBe("pending");
    expect(result.requiredBeforeEnablement).toHaveLength(5);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmInternalReleaseDecision(seller)).rejects.toMatchObject({
      code: "INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED"
    });
  });
});
