import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmIntegrationPlatform } from "@/server/services/unified-crm-integration-platform-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM integration platform contract", () => {
  it("returns provider-neutral controls and held activation gates", async () => {
    const result = await getUnifiedCrmIntegrationPlatform(manager, {
      now: () => new Date("2026-08-27T16:30:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.integration-platform/v1");
    expect(result.generatedAt).toBe("2026-08-27T16:30:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.rollback).toEqual({
      defaultState: "DISABLED",
      featureControl: "crm.integrations.enabled",
      posture: "fail-closed"
    });
    expect(result.checks.find((check) => check.capability === "credentialIsolation")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.capability === "providerActivation")).toMatchObject({
      holdOwner: "product-owner",
      status: "HOLD"
    });
    expect(result.providerGates.map((gate) => gate.family)).toEqual([
      "EMAIL_CALENDAR",
      "SMS",
      "TELEPHONY_TRANSCRIPTION",
      "E_SIGNATURE",
      "ACCOUNTING_DMS"
    ]);
    expect(result.providerGates.every((gate) => gate.activationState === "HELD")).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmIntegrationPlatform(seller)).rejects.toMatchObject({
      code: "INTEGRATION_PLATFORM_NOT_AUTHORIZED"
    });
  });

  it("requires authentication before exposing integration readiness", async () => {
    await expect(getUnifiedCrmIntegrationPlatform(null)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED"
    });
  });
});
