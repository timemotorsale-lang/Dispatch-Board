import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmPerformanceObservability } from "@/server/services/unified-crm-performance-observability-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM performance and observability gate", () => {
  it("returns targets, pass evidence, and named holds", async () => {
    const result = await getUnifiedCrmPerformanceObservability(manager, {
      now: () => new Date("2026-08-26T22:30:00.000Z")
    });

    expect(result.state).toBe("HELD");
    expect(result.targets).toEqual({
      dashboardReconciliationMs: 1500,
      globalSearchMs: 800,
      pageInteractionMs: 1000
    });
    expect(result.checks.some((check) => check.status === "PASS")).toBe(true);
    expect(result.checks.filter((check) => check.status === "HOLD").every((check) => check.holdOwner)).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmPerformanceObservability(seller)).rejects.toMatchObject({
      code: "PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED"
    });
  });
});
