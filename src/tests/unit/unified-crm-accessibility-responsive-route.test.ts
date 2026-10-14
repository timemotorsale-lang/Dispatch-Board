import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  getUnifiedCrmAccessibilityResponsiveGate: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-accessibility-responsive-service", () => mocks);

import { GET } from "@/app/api/crm/v1/accessibility-responsive/route";

describe("Unified CRM accessibility responsive route", () => {
  it("returns the accessibility gate model", async () => {
    mocks.getUnifiedCrmAccessibilityResponsiveGate.mockResolvedValueOnce({
      contractVersion: "ucrm.accessibility-responsive/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.accessibility-responsive/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmAccessibilityResponsiveGate).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmAccessibilityResponsiveGate.mockRejectedValueOnce(Object.assign(new Error("CRM accessibility and responsive verification is available to the manager workspace."), {
      code: "ACCESSIBILITY_GATE_NOT_AUTHORIZED",
      contractVersion: "ucrm.accessibility-responsive-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "ACCESSIBILITY_GATE_NOT_AUTHORIZED",
      contractVersion: "ucrm.accessibility-responsive-error/v1",
      error: "CRM accessibility and responsive verification is available to the manager workspace.",
      retryable: false
    });
  });
});
