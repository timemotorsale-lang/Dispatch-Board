import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmEmailCalendarProviderA } from "@/server/services/unified-crm-email-calendar-provider-a-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM email/calendar provider A readiness", () => {
  it("keeps provider A held until provider and OAuth decisions are approved", async () => {
    const result = await getUnifiedCrmEmailCalendarProviderA(manager, {
      now: () => new Date("2026-08-27T17:00:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.email-calendar-provider-a/v1");
    expect(result.generatedAt).toBe("2026-08-27T17:00:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({
      calendarWriteEnabled: false,
      externalSendEnabled: false,
      inboundSyncEnabled: false,
      providerName: null,
      state: "HELD"
    });
    expect(result.checks.find((check) => check.category === "providerSelection")).toMatchObject({
      holdOwner: "product-owner",
      status: "HOLD"
    });
    expect(result.checks.find((check) => check.category === "consentPurpose")).toMatchObject({ status: "PASS" });
    expect(result.rollback.featureControl).toBe("crm.integrations.emailCalendar.providerA.enabled");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmEmailCalendarProviderA(seller)).rejects.toMatchObject({
      code: "EMAIL_CALENDAR_PROVIDER_A_NOT_AUTHORIZED"
    });
  });

  it("requires authentication before exposing provider readiness", async () => {
    await expect(getUnifiedCrmEmailCalendarProviderA(null)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED"
    });
  });
});
