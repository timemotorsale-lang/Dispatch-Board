import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOperationalHandoff } from "@/server/services/unified-crm-operational-handoff-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM operational handoff", () => {
  it("keeps handoff held until every operating owner confirms", async () => {
    const result = await getUnifiedCrmOperationalHandoff(manager, {
      now: () => new Date("2026-08-27T00:00:00.000Z")
    });

    expect(result.handoffDecision).toBe("HELD");
    expect(result.owners.map((owner) => owner.area)).toEqual([
      "monitoring",
      "support",
      "permissions",
      "flag_changes",
      "incident_response",
      "data_recovery",
      "training",
      "rollback_authority"
    ]);
    expect(result.owners.every((owner) => owner.status === "PENDING_OWNER_CONFIRMATION")).toBe(true);
    expect(result.owners.every((owner) => owner.requiredConfirmation.length > 0)).toBe(true);
    expect(result.requiredBeforeReleaseDecision).toContain("Rollback authority must be named before any internal release decision.");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmOperationalHandoff(seller)).rejects.toMatchObject({
      code: "OPERATIONAL_HANDOFF_NOT_AUTHORIZED"
    });
  });
});
