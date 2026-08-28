import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmProviderDecisionIntake } from "@/server/services/unified-crm-provider-decision-intake-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM provider decision intake", () => {
  it("lists required provider decisions without enabling credentials or production activation", async () => {
    const result = await getUnifiedCrmProviderDecisionIntake(manager, { now: () => new Date("2026-08-28T01:30:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.provider-decision-intake/v1");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({ credentialEntryEnabled: false, productionActivationEnabled: false, providerSelectionEnabled: false, state: "HELD" });
    expect(result.requirements.some((requirement) => requirement.channel === "SMS" && requirement.requiredDecision.includes("monthly cost cap"))).toBe(true);
    expect(result.requirements.some((requirement) => requirement.channel === "TELEPHONY" && requirement.requiredDecision.includes("AI receptionist"))).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmProviderDecisionIntake(seller)).rejects.toMatchObject({ code: "PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED" });
  });
});
