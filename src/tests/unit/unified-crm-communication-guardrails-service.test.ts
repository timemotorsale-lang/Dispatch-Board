import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmCommunicationGuardrails } from "@/server/services/unified-crm-communication-guardrails-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = { ...manager, id: "seller-a", roles: ["Salesperson"] };
const now = new Date("2026-08-27T22:00:00.000Z");

describe("Unified CRM communication guardrails", () => {
  it("returns manager-only quiet-hour, rate-limit, and cost controls with enforcement preview-only", async () => {
    const model = await getUnifiedCrmCommunicationGuardrails(manager, { now: () => now });

    expect(model).toMatchObject({
      contractVersion: "ucrm.communication-guardrails/v1",
      generatedAt: now.toISOString(),
      state: "HELD",
      visibility: "management",
      activation: {
        automatedSendingEnabled: false,
        providerTrafficEnabled: false,
        enforcementPreviewOnly: true
      },
      summary: {
        heldRuleCount: 5,
        previewRuleCount: 6,
        enforceableRuleCount: 0
      },
      rollback: {
        fallback: "manual-consent-and-cost-review",
        featureControl: "crm.communications.guardrails.enabled",
        posture: "fail-closed"
      }
    });
    expect(model.rules.map((rule) => rule.enforcementEnabled)).toEqual([false, false, false, false, false, false]);
    expect(model.rules.map((rule) => rule.category)).toEqual(expect.arrayContaining(["QUIET_HOURS", "RATE_LIMIT", "COST_CONTROL", "CONSENT", "KILL_SWITCH"]));
  });

  it("fails closed for non-management users", async () => {
    await expect(getUnifiedCrmCommunicationGuardrails(seller, { now: () => now })).rejects.toMatchObject({
      code: "COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED",
      httpStatus: 403
    });
  });
});
