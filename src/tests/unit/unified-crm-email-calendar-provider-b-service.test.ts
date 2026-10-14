import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmEmailCalendarProviderB } from "@/server/services/unified-crm-email-calendar-provider-b-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM email/calendar provider B readiness", () => {
  it("keeps provider B held and independent from provider A", async () => {
    const result = await getUnifiedCrmEmailCalendarProviderB(manager, {
      now: () => new Date("2026-08-27T17:30:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.email-calendar-provider-b/v1");
    expect(result.generatedAt).toBe("2026-08-27T17:30:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.independence).toEqual({
      doesNotInheritProviderAApproval: true,
      requiresSeparateCredentials: true,
      requiresSeparateRollbackProof: true
    });
    expect(result.activation).toMatchObject({
      calendarWriteEnabled: false,
      externalSendEnabled: false,
      inboundSyncEnabled: false,
      providerName: null
    });
    expect(result.checks.find((check) => check.category === "independentProviderSelection")).toMatchObject({
      holdOwner: "product-owner",
      status: "HOLD"
    });
    expect(result.checks.find((check) => check.category === "dedupeIsolation")).toMatchObject({ status: "PASS" });
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmEmailCalendarProviderB(seller)).rejects.toMatchObject({
      code: "EMAIL_CALENDAR_PROVIDER_B_NOT_AUTHORIZED"
    });
  });

  it("requires authentication before exposing second provider readiness", async () => {
    await expect(getUnifiedCrmEmailCalendarProviderB(null)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED"
    });
  });
});
