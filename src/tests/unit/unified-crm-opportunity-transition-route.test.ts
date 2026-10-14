import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  transitionUnifiedCrmOpportunity: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-transition-command-service", () => ({ transitionUnifiedCrmOpportunity: mocks.transitionUnifiedCrmOpportunity }));

import { POST } from "@/app/api/crm/v1/opportunities/[opportunityId]/transition/route";

describe("Unified CRM opportunity transition API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "manager-a",
      name: "CRM Manager",
      email: "manager@example.test",
      isActive: true,
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    });
  });

  it("returns a transition receipt", async () => {
    mocks.transitionUnifiedCrmOpportunity.mockResolvedValue({
      contractVersion: "ucrm.opportunity-transition-command/v1",
      duplicate: false,
      opportunity: {
        fromStage: "NEW_INQUIRY",
        href: "/crm/opportunities/OPP-1",
        id: "row-1",
        nextActionDueAt: "2026-08-26T20:00:00.000Z",
        nextActionLabel: "Confirm appointment",
        opportunityNumber: "OPP-1",
        stage: "QUALIFIED",
        version: 2
      }
    });

    const response = await POST(new Request("https://example.test/api", {
      body: JSON.stringify({ expectedVersion: 1, idempotencyKey: "transition-1", toStage: "QUALIFIED" }),
      method: "POST"
    }), { params: Promise.resolve({ opportunityId: "OPP-1" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.opportunity).toMatchObject({ opportunityNumber: "OPP-1", stage: "QUALIFIED", version: 2 });
    expect(mocks.transitionUnifiedCrmOpportunity).toHaveBeenCalledWith(expect.anything(), "OPP-1", expect.objectContaining({ toStage: "QUALIFIED" }));
  });

  it("maps typed transition errors to safe responses", async () => {
    mocks.transitionUnifiedCrmOpportunity.mockRejectedValue(Object.assign(new Error("Opportunity was updated by another command. Reload and try again."), {
      code: "VERSION_CONFLICT",
      retryable: false
    }));

    const response = await POST(new Request("https://example.test/api", {
      body: JSON.stringify({ expectedVersion: 1, idempotencyKey: "transition-1", toStage: "QUALIFIED" }),
      method: "POST"
    }), { params: Promise.resolve({ opportunityId: "OPP-1" }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: "VERSION_CONFLICT",
      contractVersion: "ucrm.opportunity-transition-error/v1",
      error: "Opportunity was updated by another command. Reload and try again.",
      retryable: false
    });
  });
});
