import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUnifiedCrmIntegrationRecoveryReview: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-integration-recovery-review-service", () => ({
  getUnifiedCrmIntegrationRecoveryReview: mocks.getUnifiedCrmIntegrationRecoveryReview
}));

import { GET } from "@/app/api/crm/v1/admin/integration-recovery/route";

describe("Unified CRM integration recovery review route", () => {
  it("returns recovery review from the service", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "manager-a" });
    mocks.getUnifiedCrmIntegrationRecoveryReview.mockResolvedValueOnce({
      contractVersion: "ucrm.integration-recovery-review/v1",
      state: "READY_REVIEW"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.integration-recovery-review/v1",
      state: "READY_REVIEW"
    });
  });

  it("maps typed authorization denial safely", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "seller-a" });
    mocks.getUnifiedCrmIntegrationRecoveryReview.mockRejectedValueOnce(
      Object.assign(new Error("CRM integration recovery review is available to the manager workspace."), {
        code: "INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED"
      })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED",
      contractVersion: "ucrm.integration-recovery-review-error/v1",
      retryable: false
    });
  });
});
