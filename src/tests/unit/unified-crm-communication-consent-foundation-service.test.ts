import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmCommunicationConsentFoundation } from "@/server/services/unified-crm-communication-consent-foundation-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM communication consent foundation", () => {
  it("keeps email, SMS, and phone actions held behind consent readiness", async () => {
    const result = await getUnifiedCrmCommunicationConsentFoundation(manager, { now: () => new Date("2026-08-28T02:00:00.000Z") });

    expect(result.contractVersion).toBe("ucrm.communication-consent-foundation/v1");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({ emailSendEnabled: false, phoneDialEnabled: false, smsSendEnabled: false, state: "HELD" });
    expect(result.channels.map((channel) => channel.channel)).toEqual(["EMAIL", "SMS", "PHONE"]);
    expect(result.checks.find((check) => check.category === "contactPointAuthority")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "quietHours")).toMatchObject({ status: "HOLD" });
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmCommunicationConsentFoundation(seller)).rejects.toMatchObject({ code: "COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED" });
  });
});
