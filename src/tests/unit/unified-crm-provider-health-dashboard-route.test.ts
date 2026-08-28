import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUnifiedCrmProviderHealthDashboard: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-provider-health-dashboard-service", () => ({
  getUnifiedCrmProviderHealthDashboard: mocks.getUnifiedCrmProviderHealthDashboard
}));

import { GET } from "@/app/api/crm/v1/admin/provider-health/route";

describe("Unified CRM provider health route", () => {
  it("returns the provider health dashboard", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "manager-a" });
    mocks.getUnifiedCrmProviderHealthDashboard.mockResolvedValueOnce({
      contractVersion: "ucrm.provider-health-dashboard/v1",
      state: "READY_REVIEW"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.provider-health-dashboard/v1",
      state: "READY_REVIEW"
    });
  });

  it("returns typed authorization denial without leaking internals", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "seller-a" });
    mocks.getUnifiedCrmProviderHealthDashboard.mockRejectedValueOnce(
      Object.assign(new Error("CRM provider health is available to the manager workspace."), {
        code: "PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED"
      })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED",
      contractVersion: "ucrm.provider-health-dashboard-error/v1",
      retryable: false
    });
  });
});
