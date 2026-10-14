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
  getUnifiedCrmEmailCalendarProviderB: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-email-calendar-provider-b-service", () => mocks);

import { GET } from "@/app/api/crm/v1/integrations/email-calendar/provider-b/route";

describe("Unified CRM email/calendar provider B route", () => {
  it("returns the provider B readiness model", async () => {
    mocks.getUnifiedCrmEmailCalendarProviderB.mockResolvedValueOnce({
      contractVersion: "ucrm.email-calendar-provider-b/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.email-calendar-provider-b/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmEmailCalendarProviderB).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmEmailCalendarProviderB.mockRejectedValueOnce(Object.assign(new Error("CRM second email and calendar provider readiness is available to the manager workspace."), {
      code: "EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED",
      contractVersion: "ucrm.email-calendar-provider-b-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED",
      contractVersion: "ucrm.email-calendar-provider-b-error/v1",
      error: "CRM second email and calendar provider readiness is available to the manager workspace.",
      retryable: false
    });
  });

  it("masks unknown failures", async () => {
    mocks.getUnifiedCrmEmailCalendarProviderB.mockRejectedValueOnce(new Error("provider B refresh token"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.email-calendar-provider-b-error/v1",
      error: "CRM second email and calendar provider readiness is temporarily unavailable.",
      retryable: false
    });
  });
});
