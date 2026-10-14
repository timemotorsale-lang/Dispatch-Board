import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmProviderHealthDashboard } from "@/server/services/unified-crm-provider-health-dashboard-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = { ...manager, id: "seller-a", roles: ["Salesperson"] };
const now = new Date("2026-08-27T20:00:00.000Z");

describe("Unified CRM provider health dashboard", () => {
  it("returns a manager-only disabled-state dashboard with live traffic off", async () => {
    const model = await getUnifiedCrmProviderHealthDashboard(manager, { now: () => now });

    expect(model).toMatchObject({
      contractVersion: "ucrm.provider-health-dashboard/v1",
      generatedAt: now.toISOString(),
      state: "READY_REVIEW",
      visibility: "management",
      summary: {
        totalChannels: 5,
        liveTrafficEnabled: false,
        heldOrDisabledCount: 5,
        degradedCount: 0
      },
      rollback: {
        fallback: "manual-provider-status-review",
        featureControl: "crm.admin.providerHealth.enabled",
        posture: "read-only"
      }
    });
    expect(model.channels.map((channel) => channel.liveTrafficEnabled)).toEqual([false, false, false, false, false]);
    expect(model.channels.map((channel) => channel.id)).toEqual(["email-calendar", "sms", "telephony", "esignature", "accounting-dms"]);
    expect(JSON.stringify(model)).not.toContain("apiKey");
    expect(JSON.stringify(model)).not.toContain("secret");
  });

  it("fails closed for non-management users", async () => {
    await expect(getUnifiedCrmProviderHealthDashboard(seller, { now: () => now })).rejects.toMatchObject({
      code: "PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED",
      httpStatus: 403
    });
  });

  it("requires an authenticated user", async () => {
    await expect(getUnifiedCrmProviderHealthDashboard(null, { now: () => now })).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      httpStatus: 401
    });
  });
});
