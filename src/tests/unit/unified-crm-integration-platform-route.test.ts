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
  getUnifiedCrmIntegrationPlatform: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-integration-platform-service", () => mocks);

import { GET } from "@/app/api/crm/v1/integrations/platform/route";

describe("Unified CRM integration platform route", () => {
  it("returns the integration platform model", async () => {
    mocks.getUnifiedCrmIntegrationPlatform.mockResolvedValueOnce({
      contractVersion: "ucrm.integration-platform/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.integration-platform/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmIntegrationPlatform).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmIntegrationPlatform.mockRejectedValueOnce(Object.assign(new Error("CRM integration platform readiness is available to the manager workspace."), {
      code: "INTEGRATION_PLATFORM_NOT_AUTHORIZED",
      contractVersion: "ucrm.integration-platform-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "INTEGRATION_PLATFORM_NOT_AUTHORIZED",
      contractVersion: "ucrm.integration-platform-error/v1",
      error: "CRM integration platform readiness is available to the manager workspace.",
      retryable: false
    });
  });

  it("masks unknown failures", async () => {
    mocks.getUnifiedCrmIntegrationPlatform.mockRejectedValueOnce(new Error("secret provider token leaked"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.integration-platform-error/v1",
      error: "CRM integration platform readiness is temporarily unavailable.",
      retryable: false
    });
  });
});
