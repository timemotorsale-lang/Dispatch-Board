import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmPilotExecution } from "@/server/services/unified-crm-pilot-execution-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM pilot execution", () => {
  it("returns representative internal pilot workflows and reporting requirements", async () => {
    const result = await getUnifiedCrmPilotExecution(manager, {
      now: () => new Date("2026-08-26T23:45:00.000Z")
    });

    expect(result.pilotStatus).toBe("READY_TO_RUN");
    expect(result.releaseScope).toBe("INTERNAL_PILOT_ONLY");
    expect(result.workflows).toHaveLength(7);
    expect(result.workflows.every((workflow) => workflow.owner && workflow.evidenceRequired)).toBe(true);
    expect(result.reportingRequirements.join(" ")).toContain("Do not expand release scope");
    expect(result.measures).toContain("User friction themes");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmPilotExecution(seller)).rejects.toMatchObject({
      code: "PILOT_EXECUTION_NOT_AUTHORIZED"
    });
  });
});
