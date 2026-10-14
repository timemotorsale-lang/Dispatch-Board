import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmRollbackRehearsal } from "@/server/services/unified-crm-rollback-rehearsal-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM rollback rehearsal", () => {
  it("returns required rehearsal steps with owners and explicit holds", async () => {
    const result = await getUnifiedCrmRollbackRehearsal(manager, {
      now: () => new Date("2026-08-26T23:30:00.000Z")
    });

    expect(result.rehearsalStatus).toBe("HELD");
    expect(result.steps.map((step) => step.title)).toEqual([
      "killSwitches",
      "priorReleaseRecovery",
      "inFlightWrites",
      "retainedEvidence",
      "customersSalesFallback",
      "restoreTiming",
      "decisionLog"
    ]);
    expect(result.steps.every((step) => step.owner && step.evidenceRequired)).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmRollbackRehearsal(seller)).rejects.toMatchObject({
      code: "ROLLBACK_REHEARSAL_NOT_AUTHORIZED"
    });
  });
});
