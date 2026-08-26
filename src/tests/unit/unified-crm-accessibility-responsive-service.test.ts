import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmAccessibilityResponsiveGate } from "@/server/services/unified-crm-accessibility-responsive-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM accessibility and responsive gate", () => {
  it("returns WCAG-targeted pass evidence and named UX holds", async () => {
    const result = await getUnifiedCrmAccessibilityResponsiveGate(manager, {
      now: () => new Date("2026-08-26T22:00:00.000Z")
    });

    expect(result.state).toBe("HELD");
    expect(result.target).toBe("WCAG_2_2_AA");
    expect(result.checks.some((check) => check.status === "PASS")).toBe(true);
    expect(result.checks.filter((check) => check.status === "HOLD").every((check) => check.holdOwner === "ux-review")).toBe(true);
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmAccessibilityResponsiveGate(seller)).rejects.toMatchObject({
      code: "ACCESSIBILITY_GATE_NOT_AUTHORIZED"
    });
  });
});
