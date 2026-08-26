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
  getUnifiedCrmReliabilityVerification: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-reliability-verification-service", () => mocks);

import { GET } from "@/app/api/crm/v1/reliability-verification/route";

describe("Unified CRM reliability verification route", () => {
  it("returns the reliability verification model", async () => {
    mocks.getUnifiedCrmReliabilityVerification.mockResolvedValueOnce({
      contractVersion: "ucrm.reliability-verification/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.reliability-verification/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmReliabilityVerification).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmReliabilityVerification.mockRejectedValueOnce(Object.assign(new Error("CRM reliability verification is available to the manager workspace."), {
      code: "RELIABILITY_VERIFICATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.reliability-verification-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "RELIABILITY_VERIFICATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.reliability-verification-error/v1",
      error: "CRM reliability verification is available to the manager workspace.",
      retryable: false
    });
  });
});
