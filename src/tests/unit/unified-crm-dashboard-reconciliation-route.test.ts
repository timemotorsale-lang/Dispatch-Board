import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  getUnifiedCrmDashboardReconciliation: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-dashboard-reconciliation-service", () => mocks);

import { GET } from "@/app/api/crm/v1/dashboard-reconciliation/route";

describe("Unified CRM dashboard reconciliation route", () => {
  it("returns reconciliation from the service", async () => {
    mocks.getUnifiedCrmDashboardReconciliation.mockResolvedValueOnce({
      contractVersion: "ucrm.dashboard-reconciliation/v1",
      state: "PASS"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.dashboard-reconciliation/v1", state: "PASS" });
    expect(mocks.getUnifiedCrmDashboardReconciliation).toHaveBeenCalledWith(actor);
  });

  it("maps typed reconciliation errors safely", async () => {
    mocks.getUnifiedCrmDashboardReconciliation.mockRejectedValueOnce(Object.assign(new Error("CRM dashboard reconciliation is available to the manager workspace."), {
      code: "DASHBOARD_RECONCILIATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.dashboard-reconciliation-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "DASHBOARD_RECONCILIATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.dashboard-reconciliation-error/v1",
      error: "CRM dashboard reconciliation is available to the manager workspace.",
      retryable: false
    });
  });
});
