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
  getUnifiedCrmInternalReleaseDecision: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-internal-release-decision-service", () => mocks);

import { GET } from "@/app/api/crm/v1/internal-release-decision/route";

describe("Unified CRM internal release decision route", () => {
  it("returns the internal release decision gate", async () => {
    mocks.getUnifiedCrmInternalReleaseDecision.mockResolvedValueOnce({
      contractVersion: "ucrm.internal-release-decision/v1",
      decision: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.internal-release-decision/v1",
      decision: "HELD"
    });
    expect(mocks.getUnifiedCrmInternalReleaseDecision).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmInternalReleaseDecision.mockRejectedValueOnce(Object.assign(new Error("CRM internal release decision is available to the manager workspace."), {
      code: "INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED",
      contractVersion: "ucrm.internal-release-decision-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED",
      contractVersion: "ucrm.internal-release-decision-error/v1",
      error: "CRM internal release decision is available to the manager workspace.",
      retryable: false
    });
  });
});
