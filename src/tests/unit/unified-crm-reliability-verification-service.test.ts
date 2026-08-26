import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmReliabilityVerification } from "@/server/services/unified-crm-reliability-verification-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM reliability verification", () => {
  it("returns pass evidence and named release-candidate holds", async () => {
    const result = await getUnifiedCrmReliabilityVerification(manager, {
      now: () => new Date("2026-08-26T21:00:00.000Z")
    });

    expect(result.state).toBe("HELD");
    expect(result.checks.map((check) => check.category)).toEqual([
      "staleWrites",
      "idempotencyReuse",
      "transactionFailure",
      "retries",
      "projectionLag",
      "unavailableDependencies",
      "jobLeases",
      "recoveryBehavior"
    ]);
    expect(result.checks.filter((check) => check.status === "HOLD").every((check) => check.holdOwner)).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmReliabilityVerification(seller)).rejects.toMatchObject({
      code: "RELIABILITY_VERIFICATION_NOT_AUTHORIZED"
    });
  });
});
