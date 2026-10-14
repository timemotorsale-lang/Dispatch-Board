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
  getUnifiedCrmPerformanceObservability: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-performance-observability-service", () => mocks);

import { GET } from "@/app/api/crm/v1/performance-observability/route";

describe("Unified CRM performance observability route", () => {
  it("returns the performance observability model", async () => {
    mocks.getUnifiedCrmPerformanceObservability.mockResolvedValueOnce({
      contractVersion: "ucrm.performance-observability/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.performance-observability/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmPerformanceObservability).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmPerformanceObservability.mockRejectedValueOnce(Object.assign(new Error("CRM performance and observability verification is available to the manager workspace."), {
      code: "PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED",
      contractVersion: "ucrm.performance-observability-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "PERFORMANCE_OBSERVABILITY_NOT_AUTHORIZED",
      contractVersion: "ucrm.performance-observability-error/v1",
      error: "CRM performance and observability verification is available to the manager workspace.",
      retryable: false
    });
  });
});
