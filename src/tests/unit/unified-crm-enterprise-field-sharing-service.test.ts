import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmEnterpriseFieldSharing } from "@/server/services/unified-crm-enterprise-field-sharing-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM enterprise field sharing readiness", () => {
  it("keeps custom record, field, and territory sharing held", async () => {
    const result = await getUnifiedCrmEnterpriseFieldSharing(manager, {
      now: () => new Date("2026-08-27T20:00:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.enterprise-field-sharing/v1");
    expect(result.generatedAt).toBe("2026-08-27T20:00:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({
      customRecordSharingEnabled: false,
      fieldOverrideEnabled: false,
      territorySharingEnabled: false,
      state: "HELD"
    });
    expect(result.checks.find((check) => check.category === "fieldClassification")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "territoryRules")).toMatchObject({ status: "HOLD" });
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmEnterpriseFieldSharing(seller)).rejects.toMatchObject({
      code: "ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED"
    });
  });
});
