import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmPilotFindingClosure } from "@/server/services/unified-crm-pilot-finding-closure-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM pilot finding closure", () => {
  it("keeps release-candidate validation held until every pilot finding is closed", async () => {
    const result = await getUnifiedCrmPilotFindingClosure(manager, {
      now: () => new Date("2026-08-27T00:00:00.000Z")
    });

    expect(result.closureDecision).toBe("HELD");
    expect(result.enabledScope).toEqual([]);
    expect(result.findings).toHaveLength(4);
    expect(result.findings.every((finding) => finding.status === "PENDING_CLOSURE")).toBe(true);
    expect(result.findings.every((finding) => finding.releaseImpact === "BLOCKS_RELEASE")).toBe(true);
    expect(result.requiredBeforeReleaseCandidateValidation).toHaveLength(4);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmPilotFindingClosure(seller)).rejects.toMatchObject({
      code: "PILOT_FINDING_CLOSURE_NOT_AUTHORIZED"
    });
  });
});
