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
  getUnifiedCrmSmsDelivery: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-sms-delivery-service", () => mocks);

import { GET } from "@/app/api/crm/v1/integrations/sms/route";

describe("Unified CRM SMS delivery route", () => {
  it("returns the SMS delivery readiness model", async () => {
    mocks.getUnifiedCrmSmsDelivery.mockResolvedValueOnce({
      contractVersion: "ucrm.sms-delivery/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.sms-delivery/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmSmsDelivery).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmSmsDelivery.mockRejectedValueOnce(Object.assign(new Error("CRM SMS delivery readiness is available to the manager workspace."), {
      code: "SMS_DELIVERY_NOT_AUTHORIZED",
      contractVersion: "ucrm.sms-delivery-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "SMS_DELIVERY_NOT_AUTHORIZED",
      contractVersion: "ucrm.sms-delivery-error/v1",
      error: "CRM SMS delivery readiness is available to the manager workspace.",
      retryable: false
    });
  });

  it("masks unknown failures", async () => {
    mocks.getUnifiedCrmSmsDelivery.mockRejectedValueOnce(new Error("sms provider api key"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.sms-delivery-error/v1",
      error: "CRM SMS delivery readiness is temporarily unavailable.",
      retryable: false
    });
  });
});
