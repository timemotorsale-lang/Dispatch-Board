import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmSmsDelivery } from "@/server/services/unified-crm-sms-delivery-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM SMS delivery readiness", () => {
  it("keeps SMS delivery held with explicit consent and cost guardrails", async () => {
    const result = await getUnifiedCrmSmsDelivery(manager, {
      now: () => new Date("2026-08-27T18:00:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.sms-delivery/v1");
    expect(result.generatedAt).toBe("2026-08-27T18:00:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({
      inboundSmsEnabled: false,
      outboundSmsEnabled: false,
      providerName: null,
      state: "HELD"
    });
    expect(result.guardrails).toEqual({
      costCapCents: null,
      quietHoursPolicy: "HELD",
      requiredConsentBasis: "explicit-channel-purpose",
      stopKeywordRequired: true
    });
    expect(result.checks.find((check) => check.category === "consentOptOut")).toMatchObject({ status: "HOLD" });
    expect(result.checks.find((check) => check.category === "deliveryStates")).toMatchObject({ status: "PASS" });
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmSmsDelivery(seller)).rejects.toMatchObject({
      code: "SMS_DELIVERY_NOT_AUTHORIZED"
    });
  });

  it("requires authentication before exposing SMS readiness", async () => {
    await expect(getUnifiedCrmSmsDelivery(null)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED"
    });
  });
});
