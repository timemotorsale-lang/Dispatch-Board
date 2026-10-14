import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmAiReceptionistSimulator } from "@/server/services/unified-crm-ai-receptionist-simulator-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = { ...manager, id: "seller-a", roles: ["Salesperson"] };
const now = new Date("2026-08-28T00:00:00.000Z");

describe("Unified CRM AI receptionist simulator", () => {
  it("returns deterministic simulation scenarios without live provider behavior", async () => {
    const model = await getUnifiedCrmAiReceptionistSimulator(manager, { now: () => now });

    expect(model).toMatchObject({
      contractVersion: "ucrm.ai-receptionist-simulator/v1",
      generatedAt: now.toISOString(),
      state: "READY_REVIEW",
      visibility: "management",
      activation: {
        simulationEnabled: true,
        liveProviderTrafficEnabled: false,
        autonomousActionsEnabled: false
      },
      rollback: {
        fallback: "human-reception-and-manual-crm-outcome",
        featureControl: "crm.ai.receptionistSimulator.enabled",
        posture: "simulation-only"
      }
    });
    expect(model.scenarios).toHaveLength(5);
    expect(model.scenarios.every((scenario) => scenario.simulationOnly)).toBe(true);
    expect(model.scenarios.map((scenario) => scenario.expectedDisposition)).toEqual(expect.arrayContaining(["ANSWER_WITH_SAFE_CONTEXT", "HANDOFF_TO_HUMAN", "ABSTAIN_AND_LOG"]));
    expect(JSON.stringify(model)).not.toContain("placeCall");
    expect(JSON.stringify(model)).not.toContain("sendText");
  });

  it("fails closed for non-management users", async () => {
    await expect(getUnifiedCrmAiReceptionistSimulator(seller, { now: () => now })).rejects.toMatchObject({
      code: "AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED",
      httpStatus: 403
    });
  });
});
