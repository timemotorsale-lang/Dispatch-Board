import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmFullRegression } from "@/server/services/unified-crm-full-regression-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM full regression gate", () => {
  it("returns passed focused checks and explicit release-candidate holds", async () => {
    const result = await getUnifiedCrmFullRegression(manager, {
      now: () => new Date("2026-08-26T23:00:00.000Z")
    });

    expect(result.state).toBe("HELD");
    expect(result.checks.map((check) => check.category)).toEqual([
      "schemaGeneration",
      "lint",
      "unit",
      "integration",
      "policy",
      "typecheck",
      "productionBuild",
      "crmBrowser",
      "dispatchRegression"
    ]);
    expect(result.checks.filter((check) => check.status === "HOLD").every((check) => check.holdOwner)).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmFullRegression(seller)).rejects.toMatchObject({
      code: "FULL_REGRESSION_NOT_AUTHORIZED"
    });
  });
});
