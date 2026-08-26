import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUnifiedCrmOpportunity: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-create-command-service", () => ({
  createUnifiedCrmOpportunity: mocks.createUnifiedCrmOpportunity
}));

import { POST } from "@/app/api/crm/v1/opportunities/route";

describe("Unified CRM opportunity create route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-a" });
  });

  it("returns 201 for a new opportunity and 200 for an idempotent replay", async () => {
    mocks.createUnifiedCrmOpportunity.mockResolvedValueOnce({
      contractVersion: "ucrm.opportunity-create-command/v1",
      duplicate: false,
      opportunity: { opportunityNumber: "OPP-1" }
    });
    const created = await POST(new Request("http://crm.local/api/crm/v1/opportunities", { method: "POST", body: "{}" }));
    expect(created.status).toBe(201);

    mocks.createUnifiedCrmOpportunity.mockResolvedValueOnce({
      contractVersion: "ucrm.opportunity-create-command/v1",
      duplicate: true,
      opportunity: { opportunityNumber: "OPP-1" }
    });
    const replay = await POST(new Request("http://crm.local/api/crm/v1/opportunities", { method: "POST", body: "{}" }));
    expect(replay.status).toBe(200);
  });

  it("maps typed failures without leaking unexpected backend details", async () => {
    mocks.createUnifiedCrmOpportunity.mockRejectedValueOnce(
      Object.assign(new Error("Title is required."), { code: "INVALID_OPPORTUNITY_COMMAND" })
    );
    const invalid = await POST(new Request("http://crm.local/api/crm/v1/opportunities", { method: "POST", body: "{}" }));
    expect(invalid.status).toBe(400);

    mocks.createUnifiedCrmOpportunity.mockRejectedValueOnce(
      Object.assign(new Error("Owner is not available."), { code: "OWNER_NOT_AVAILABLE" })
    );
    const missing = await POST(new Request("http://crm.local/api/crm/v1/opportunities", { method: "POST", body: "{}" }));
    expect(missing.status).toBe(404);

    mocks.createUnifiedCrmOpportunity.mockRejectedValueOnce(new Error("private database detail"));
    const fallback = await POST(new Request("http://crm.local/api/crm/v1/opportunities", { method: "POST", body: "{}" }));
    const payload = await fallback.json();
    expect(fallback.status).toBe(500);
    expect(JSON.stringify(payload)).not.toContain("private database detail");
    expect(payload.error).toBe("Opportunity could not be created right now.");
  });
});
