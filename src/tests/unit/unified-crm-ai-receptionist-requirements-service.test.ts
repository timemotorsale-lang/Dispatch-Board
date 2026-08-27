import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmAiReceptionistRequirements } from "@/server/services/unified-crm-ai-receptionist-requirements-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = { ...manager, id: "seller-a", roles: ["Salesperson"] };
const now = new Date("2026-08-27T23:00:00.000Z");

describe("Unified CRM AI receptionist requirements", () => {
  it("returns a held manager-only safety contract with live behavior blocked", async () => {
    const model = await getUnifiedCrmAiReceptionistRequirements(manager, { now: () => now });

    expect(model).toMatchObject({
      contractVersion: "ucrm.ai-receptionist-requirements/v1",
      generatedAt: now.toISOString(),
      state: "HELD",
      visibility: "management",
      activation: {
        liveCallsEnabled: false,
        liveTextsEnabled: false,
        autonomousActionsEnabled: false,
        simulatorAllowed: true
      },
      summary: {
        heldRequirementCount: 4,
        contractedRequirementCount: 2,
        liveBehaviorBlocked: true
      },
      rollback: {
        fallback: "human-reception-and-manual-crm-outcome",
        featureControl: "crm.ai.receptionist.enabled",
        posture: "fail-closed"
      }
    });
    expect(model.requirements.map((requirement) => requirement.category)).toEqual(expect.arrayContaining(["CONSENT", "HUMAN_HANDOFF", "RETRIEVAL", "NO_ACTION_DEFAULT", "AUDIT", "COST"]));
    expect(JSON.stringify(model)).not.toContain("autonomousApproval");
    expect(JSON.stringify(model)).not.toContain("apiKey");
  });

  it("fails closed for non-management users", async () => {
    await expect(getUnifiedCrmAiReceptionistRequirements(seller, { now: () => now })).rejects.toMatchObject({
      code: "AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED",
      httpStatus: 403
    });
  });
});
