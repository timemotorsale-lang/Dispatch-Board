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
  getUnifiedCrmEmailCalendarProviderA: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-email-calendar-provider-a-service", () => mocks);

import { GET } from "@/app/api/crm/v1/integrations/email-calendar/provider-a/route";

describe("Unified CRM email/calendar provider A route", () => {
  it("returns the provider A readiness model", async () => {
    mocks.getUnifiedCrmEmailCalendarProviderA.mockResolvedValueOnce({
      contractVersion: "ucrm.email-calendar-provider-a/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.email-calendar-provider-a/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmEmailCalendarProviderA).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmEmailCalendarProviderA.mockRejectedValueOnce(Object.assign(new Error("CRM email and calendar provider readiness is available to the manager workspace."), {
      code: "EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED",
      contractVersion: "ucrm.email-calendar-provider-a-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED",
      contractVersion: "ucrm.email-calendar-provider-a-error/v1",
      error: "CRM email and calendar provider readiness is available to the manager workspace.",
      retryable: false
    });
  });

  it("masks unknown failures", async () => {
    mocks.getUnifiedCrmEmailCalendarProviderA.mockRejectedValueOnce(new Error("oauth client secret"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.email-calendar-provider-a-error/v1",
      error: "CRM email and calendar provider readiness is temporarily unavailable.",
      retryable: false
    });
  });
});
