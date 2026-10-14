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
  getUnifiedCrmReleaseCandidateValidation: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-release-candidate-validation-service", () => mocks);

import { GET } from "@/app/api/crm/v1/release-candidate-validation/route";

describe("Unified CRM release-candidate validation route", () => {
  it("returns the release-candidate validation gate", async () => {
    mocks.getUnifiedCrmReleaseCandidateValidation.mockResolvedValueOnce({
      contractVersion: "ucrm.release-candidate-validation/v1",
      validationDecision: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.release-candidate-validation/v1",
      validationDecision: "HELD"
    });
    expect(mocks.getUnifiedCrmReleaseCandidateValidation).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmReleaseCandidateValidation.mockRejectedValueOnce(Object.assign(new Error("CRM release-candidate validation is available to the manager workspace."), {
      code: "RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.release-candidate-validation-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED",
      contractVersion: "ucrm.release-candidate-validation-error/v1",
      error: "CRM release-candidate validation is available to the manager workspace.",
      retryable: false
    });
  });
});
