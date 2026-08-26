import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmReleaseCandidateValidation } from "@/server/services/unified-crm-release-candidate-validation-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM release-candidate validation", () => {
  it("keeps validation held until UCRM-060 through UCRM-067 are current on the exact candidate", async () => {
    const result = await getUnifiedCrmReleaseCandidateValidation(manager, {
      now: () => new Date("2026-08-27T00:00:00.000Z")
    });

    expect(result.validationDecision).toBe("HELD");
    expect(result.releaseCandidate).toEqual({
      configuration: "production",
      exactCommit: "pending",
      migrationVersion: "pending"
    });
    expect(result.evidence.map((row) => row.milestone)).toEqual([
      "UCRM-060",
      "UCRM-061",
      "UCRM-062",
      "UCRM-063",
      "UCRM-064",
      "UCRM-065",
      "UCRM-066",
      "UCRM-067"
    ]);
    expect(result.evidence.some((row) => row.status === "HELD")).toBe(true);
    expect(result.evidence.every((row) => row.requiredAction.length > 0)).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmReleaseCandidateValidation(seller)).rejects.toMatchObject({
      code: "RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED"
    });
  });
});
