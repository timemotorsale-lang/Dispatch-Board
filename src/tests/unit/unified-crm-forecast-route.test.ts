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
  getUnifiedCrmForecast: vi.fn(),
  submitUnifiedCrmForecastJudgment: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-forecast-service", () => ({
  getUnifiedCrmForecast: mocks.getUnifiedCrmForecast,
  submitUnifiedCrmForecastJudgment: mocks.submitUnifiedCrmForecastJudgment
}));

import { GET, POST } from "@/app/api/crm/v1/opportunities/[opportunityId]/forecast/route";

describe("Unified CRM forecast route", () => {
  it("returns forecast history and appends judgment snapshots", async () => {
    mocks.getUnifiedCrmForecast.mockResolvedValueOnce({
      baseline: { source: "BASELINE" },
      contractVersion: "ucrm.forecast/v1",
      history: [],
      latestManagerJudgment: null,
      latestSellerJudgment: null,
      opportunity: { id: "opp-1" },
      state: "READY",
      visibility: "organization"
    });
    mocks.submitUnifiedCrmForecastJudgment.mockResolvedValueOnce({
      contractVersion: "ucrm.forecast/v1",
      duplicate: false,
      snapshot: { id: "forecast-1", source: "MANAGER_JUDGMENT" }
    });

    const context = { params: Promise.resolve({ opportunityId: "opp-1" }) };
    const getResponse = await GET(new Request("http://crm.local"), context);
    const postResponse = await POST(new Request("http://crm.local", {
      body: JSON.stringify({}),
      method: "POST"
    }), context);

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(201);
    expect(mocks.getUnifiedCrmForecast).toHaveBeenCalledWith(actor, "opp-1");
    expect(mocks.submitUnifiedCrmForecastJudgment).toHaveBeenCalledWith(actor, "opp-1", {});
  });

  it("maps typed forecast errors safely", async () => {
    mocks.submitUnifiedCrmForecastJudgment.mockRejectedValueOnce(Object.assign(new Error("Reason required."), {
      code: "INVALID_FORECAST_SUBMISSION",
      retryable: false
    }));

    const response = await POST(new Request("http://crm.local", {
      body: JSON.stringify({}),
      method: "POST"
    }), { params: Promise.resolve({ opportunityId: "opp-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "INVALID_FORECAST_SUBMISSION",
      contractVersion: "ucrm.forecast-error/v1",
      error: "Reason required.",
      retryable: false
    });
  });
});
