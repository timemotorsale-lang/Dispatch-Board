import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmPostReleaseVerification } from "@/server/services/unified-crm-post-release-verification-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM post-release verification", () => {
  it("waits for controlled enablement before declaring release healthy", async () => {
    const result = await getUnifiedCrmPostReleaseVerification(manager, {
      now: () => new Date("2026-08-27T00:00:00.000Z")
    });

    expect(result.healthDecision).toBe("PENDING_ENABLEMENT");
    expect(result.supportIntakeOwner).toBe("operations");
    expect(result.checks.map((check) => check.checkId)).toEqual([
      "UCRM-POST-001",
      "UCRM-POST-002",
      "UCRM-POST-003",
      "UCRM-POST-004",
      "UCRM-POST-005",
      "UCRM-POST-006"
    ]);
    expect(result.checks.filter((check) => check.rollbackIfFailed)).toHaveLength(5);
    expect(result.checks.every((check) => check.status === "PENDING")).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmPostReleaseVerification(seller)).rejects.toMatchObject({
      code: "POST_RELEASE_VERIFICATION_NOT_AUTHORIZED"
    });
  });
});
