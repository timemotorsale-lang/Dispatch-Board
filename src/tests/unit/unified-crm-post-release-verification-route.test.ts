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
  getUnifiedCrmPostReleaseVerification: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-post-release-verification-service", () => mocks);

import { GET } from "@/app/api/crm/v1/post-release-verification/route";

describe("Unified CRM post-release verification route", () => {
  it("returns the post-release verification gate", async () => {
    mocks.getUnifiedCrmPostReleaseVerification.mockResolvedValueOnce({
      contractVersion: "ucrm.post-release-verification/v1",
      healthDecision: "PENDING_ENABLEMENT"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.post-release-verification/v1",
      healthDecision: "PENDING_ENABLEMENT"
    });
    expect(mocks.getUnifiedCrmPostReleaseVerification).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmPostReleaseVerification.mockRejectedValueOnce(Object.assign(new Error("CRM post-release verification is available to the manager workspace."), {
      code: "POST_RELEASE_VERIFICATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.post-release-verification-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "POST_RELEASE_VERIFICATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.post-release-verification-error/v1",
      error: "CRM post-release verification is available to the manager workspace.",
      retryable: false
    });
  });
});
