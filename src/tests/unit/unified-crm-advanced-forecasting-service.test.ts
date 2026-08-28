import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmAdvancedForecasting } from "@/server/services/unified-crm-advanced-forecasting-service";
const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };
describe("Unified CRM advanced forecasting readiness", () => {
  it("keeps prediction and attribution held with deterministic fallback", async () => {
    const result = await getUnifiedCrmAdvancedForecasting(manager, { now: () => new Date("2026-08-27T23:00:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.advanced-forecasting/v1");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({ attributionEnabled: false, predictiveForecastingEnabled: false, state: "HELD" });
    expect(result.checks.find((check) => check.category === "deterministicFallback")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "historicalEvaluation")).toMatchObject({ status: "HOLD" });
  });
  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmAdvancedForecasting(seller)).rejects.toMatchObject({ code: "ADVANCED_FORECASTING_NOT_AUTHORIZED" });
  });
});
