import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmConfigurationPromotion } from "@/server/services/unified-crm-configuration-promotion-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM configuration promotion readiness", () => {
  it("keeps sandbox and production promotion held with safe rollback", async () => {
    const result = await getUnifiedCrmConfigurationPromotion(manager, { now: () => new Date("2026-08-27T22:00:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.configuration-promotion/v1");
    expect(result.state).toBe("HELD");
    expect(result.activation.productionPromotionEnabled).toBe(false);
    expect(result.checks.find((check) => check.category === "diffReview")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "maskedData")).toMatchObject({ status: "HOLD" });
  });
  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmConfigurationPromotion(seller)).rejects.toMatchObject({ code: "CONFIGURATION_PROMOTION_NOT_AUTHORIZED" });
  });
});
