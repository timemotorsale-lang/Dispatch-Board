import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getCrmDecision: vi.fn(),
  overrideCrmDecision: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/crm-decision-service", () => ({
  getCrmDecision: mocks.getCrmDecision,
  overrideCrmDecision: mocks.overrideCrmDecision
}));

import { GET } from "@/app/api/customers/decisions/[decisionId]/route";
import { POST } from "@/app/api/customers/decisions/[decisionId]/override/route";

describe("CRM decision routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an authenticated decision view", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getCrmDecision.mockResolvedValue({ id: "decision-1", score: 87 });

    const response = await GET(new Request("http://localhost/api/customers/decisions/decision-1"), {
      params: Promise.resolve({ decisionId: "decision-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      decision: { id: "decision-1", score: 87 }
    });
  });

  it("maps missing decisions to not found", async () => {
    mocks.getCrmDecision.mockRejectedValue(new Error("CRM decision not found."));
    const response = await GET(new Request("http://localhost/api/customers/decisions/missing"), {
      params: Promise.resolve({ decisionId: "missing" })
    });
    expect(response.status).toBe(404);
  });

  it("passes an override command through the manager-protected service", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
    mocks.overrideCrmDecision.mockResolvedValue({ id: "decision-1", override: { reason: "Capacity changed." } });
    const response = await POST(
      new Request("http://localhost/api/customers/decisions/decision-1/override", {
        method: "POST",
        body: JSON.stringify({
          reason: "Capacity changed.",
          recommendation: { recommendedOwnerId: "staff-2" }
        })
      }),
      { params: Promise.resolve({ decisionId: "decision-1" }) }
    );
    expect(response.status).toBe(200);
    expect(mocks.overrideCrmDecision).toHaveBeenCalledWith(
      { id: "manager-1" },
      "decision-1",
      {
        reason: "Capacity changed.",
        recommendation: { recommendedOwnerId: "staff-2" }
      }
    );
  });

  it("maps manager and repeat-override failures", async () => {
    mocks.overrideCrmDecision.mockRejectedValueOnce(new Error("Manager access required."));
    const forbidden = await POST(
      new Request("http://localhost/api/customers/decisions/decision-1/override", {
        method: "POST",
        body: JSON.stringify({ reason: "Capacity changed.", recommendation: {} })
      }),
      { params: Promise.resolve({ decisionId: "decision-1" }) }
    );
    expect(forbidden.status).toBe(403);

    mocks.overrideCrmDecision.mockRejectedValueOnce(
      new Error("CRM decision has already been overridden.")
    );
    const conflict = await POST(
      new Request("http://localhost/api/customers/decisions/decision-1/override", {
        method: "POST",
        body: JSON.stringify({ reason: "Capacity changed.", recommendation: {} })
      }),
      { params: Promise.resolve({ decisionId: "decision-1" }) }
    );
    expect(conflict.status).toBe(409);
  });
});
