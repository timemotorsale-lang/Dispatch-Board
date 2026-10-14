import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUnifiedCrmOpportunityTaskBridge: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-task-bridge-service", () => ({
  createUnifiedCrmOpportunityTaskBridge: mocks.createUnifiedCrmOpportunityTaskBridge
}));

import { POST } from "@/app/api/crm/v1/opportunities/[opportunityId]/tasks/route";

describe("Unified CRM opportunity task bridge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new governed opportunity task and 200 for duplicate replay", async () => {
    mocks.createUnifiedCrmOpportunityTaskBridge.mockResolvedValueOnce({
      contractVersion: "ucrm.opportunity-task-bridge/v1",
      duplicate: false,
      opportunityId: "opp_123456",
      task: {
        dueAt: "2026-08-15T15:00:00.000Z",
        href: "/tasks/task-1",
        id: "task-1",
        title: "Follow up with Accord shopper"
      }
    });
    const created = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "Follow up" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(created.status).toBe(201);

    mocks.createUnifiedCrmOpportunityTaskBridge.mockResolvedValueOnce({
      contractVersion: "ucrm.opportunity-task-bridge/v1",
      duplicate: true,
      opportunityId: "opp_123456",
      task: {
        dueAt: "2026-08-15T15:00:00.000Z",
        href: "/tasks/task-1",
        id: "task-1",
        title: "Follow up with Accord shopper"
      }
    });
    const duplicate = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "Follow up" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(duplicate.status).toBe(200);
  });

  it("maps validation, stale version, subject hiding, and unavailable failures safely", async () => {
    mocks.createUnifiedCrmOpportunityTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Expected version is required."), { code: "INVALID_TASK_BRIDGE_COMMAND" })
    );
    const invalid = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(invalid.status).toBe(400);

    mocks.createUnifiedCrmOpportunityTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Opportunity changed before the task could be linked."), { code: "OPPORTUNITY_VERSION_CONFLICT" })
    );
    const stale = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(stale.status).toBe(409);

    mocks.createUnifiedCrmOpportunityTaskBridge.mockRejectedValueOnce(
      Object.assign(new Error("Opportunity is not available."), { code: "OPPORTUNITY_NOT_AVAILABLE" })
    );
    const hidden = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(hidden.status).toBe(404);

    mocks.createUnifiedCrmOpportunityTaskBridge.mockRejectedValueOnce(
      new Error("private task system detail")
    );
    const fallback = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ title: "x" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    const payload = await fallback.json();
    expect(fallback.status).toBe(500);
    expect(JSON.stringify(payload)).not.toContain("private task system detail");
    expect(payload).toMatchObject({ error: "CRM opportunity task handoff could not be completed safely." });
  });
});
