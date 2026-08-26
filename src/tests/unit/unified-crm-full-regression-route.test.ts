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
  getUnifiedCrmFullRegression: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-full-regression-service", () => mocks);

import { GET } from "@/app/api/crm/v1/full-regression/route";

describe("Unified CRM full regression route", () => {
  it("returns the regression gate model", async () => {
    mocks.getUnifiedCrmFullRegression.mockResolvedValueOnce({
      contractVersion: "ucrm.full-regression/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.full-regression/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmFullRegression).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmFullRegression.mockRejectedValueOnce(Object.assign(new Error("CRM full regression verification is available to the manager workspace."), {
      code: "FULL_REGRESSION_NOT_AUTHORIZED",
      contractVersion: "ucrm.full-regression-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "FULL_REGRESSION_NOT_AUTHORIZED",
      contractVersion: "ucrm.full-regression-error/v1",
      error: "CRM full regression verification is available to the manager workspace.",
      retryable: false
    });
  });
});
