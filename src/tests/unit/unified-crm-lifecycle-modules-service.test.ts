import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmLifecycleModules } from "@/server/services/unified-crm-lifecycle-modules-service";
const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };
describe("Unified CRM lifecycle modules readiness", () => {
  it("keeps broader modules held behind their own gates", async () => {
    const result = await getUnifiedCrmLifecycleModules(manager, { now: () => new Date("2026-08-28T00:00:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.lifecycle-modules/v1");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({ accountHealthEnabled: false, marketingExpansionEnabled: false, renewalModuleEnabled: false, serviceCaseExpansionEnabled: false, state: "HELD" });
    expect(result.checks.find((check) => check.category === "sourceAuthority")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "pilot")).toMatchObject({ status: "HOLD" });
  });
  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmLifecycleModules(seller)).rejects.toMatchObject({ code: "LIFECYCLE_MODULES_NOT_AUTHORIZED" });
  });
});
