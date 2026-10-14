import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmSecurityVerification } from "@/server/services/unified-crm-security-verification-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM security verification", () => {
  it("returns honest manager-only pass and hold evidence", async () => {
    const result = await getUnifiedCrmSecurityVerification(manager, {
      now: () => new Date("2026-08-26T20:00:00.000Z")
    });

    expect(result.state).toBe("HELD");
    expect(result.checks.some((check) => check.status === "PASS")).toBe(true);
    expect(result.checks.some((check) => check.status === "HOLD" && check.holdOwner)).toBe(true);
    expect(result.checks.map((check) => check.category)).toEqual([
      "organizationIsolation",
      "rbacCapabilities",
      "fieldMasking",
      "idor",
      "inputSafety",
      "csrfSession",
      "exportControls",
      "loggingSecrets",
      "dependencyScan",
      "abuseRateLimit"
    ]);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmSecurityVerification(seller)).rejects.toMatchObject({
      code: "SECURITY_VERIFICATION_NOT_AUTHORIZED"
    });
  });
});
