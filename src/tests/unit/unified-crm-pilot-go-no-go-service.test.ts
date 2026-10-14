import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmPilotGoNoGo } from "@/server/services/unified-crm-pilot-go-no-go-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM pilot go/no-go", () => {
  it("returns a held decision with product, operations, security, and engineering blockers", async () => {
    const result = await getUnifiedCrmPilotGoNoGo(manager, {
      now: () => new Date("2026-08-27T00:00:00.000Z")
    });

    expect(result.decision).toBe("HELD");
    expect(result.enabledScope).toEqual([]);
    expect(result.decisionAreas.map((area) => area.area)).toEqual(["product", "operations", "security", "engineering"]);
    expect(result.decisionAreas.every((area) => area.decision === "HELD" && area.blockers.length > 0)).toBe(true);
    expect(result.requiredBeforeApproval).toHaveLength(5);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmPilotGoNoGo(seller)).rejects.toMatchObject({
      code: "PILOT_GO_NO_GO_NOT_AUTHORIZED"
    });
  });
});
