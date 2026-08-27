import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmGovernedAiAssistance } from "@/server/services/unified-crm-governed-ai-assistance-service";
const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };
describe("Unified CRM governed AI assistance readiness", () => {
  it("keeps AI receptionist, drafts, and autonomous actions held", async () => {
    const result = await getUnifiedCrmGovernedAiAssistance(manager, { now: () => new Date("2026-08-27T23:30:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.governed-ai-assistance/v1");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({ aiReceptionistEnabled: false, autonomousActionsEnabled: false, draftAssistanceEnabled: false, state: "HELD" });
    expect(result.checks.find((check) => check.category === "permissionAwareRetrieval")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "promptInjectionDefense")).toMatchObject({ status: "HOLD" });
  });
  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmGovernedAiAssistance(seller)).rejects.toMatchObject({ code: "GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED" });
  });
});
