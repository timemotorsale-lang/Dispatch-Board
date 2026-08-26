import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUnifiedCrmOpportunityDispatchBridge: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-opportunity-dispatch-bridge-service", () => ({
  createUnifiedCrmOpportunityDispatchBridge: mocks.createUnifiedCrmOpportunityDispatchBridge
}));

import { POST } from "@/app/api/crm/v1/opportunities/[opportunityId]/dispatch/route";

describe("Unified CRM opportunity dispatch bridge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new governed dispatch bridge and 200 for duplicate replay", async () => {
    mocks.createUnifiedCrmOpportunityDispatchBridge.mockResolvedValueOnce({
      contractVersion: "ucrm.opportunity-dispatch-bridge/v1",
      duplicate: false,
      opportunityId: "opp_123456",
      target: {
        href: "/vehicles/repair-workbench?repairOrderId=ro-1",
        repairJobId: null,
        repairJobNumber: null,
        repairOrderId: "ro-1",
        repairOrderNumber: "RO-1001",
        targetKind: "REPAIR_ORDER",
        title: "Repair order RO-1001",
        version: 2
      }
    });
    const created = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ repairOrderId: "ro-1" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(created.status).toBe(201);

    mocks.createUnifiedCrmOpportunityDispatchBridge.mockResolvedValueOnce({
      contractVersion: "ucrm.opportunity-dispatch-bridge/v1",
      duplicate: true,
      opportunityId: "opp_123456",
      target: {
        href: "/vehicles/repair-workbench?repairOrderId=ro-1",
        repairJobId: null,
        repairJobNumber: null,
        repairOrderId: "ro-1",
        repairOrderNumber: "RO-1001",
        targetKind: "REPAIR_ORDER",
        title: "Repair order RO-1001",
        version: 2
      }
    });
    const duplicate = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({ repairOrderId: "ro-1" }) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(duplicate.status).toBe(200);
  });

  it("maps validation, stale target, missing target, and fallback failures safely", async () => {
    mocks.createUnifiedCrmOpportunityDispatchBridge.mockRejectedValueOnce(
      Object.assign(new Error("Dispatch target kind is required."), { code: "INVALID_DISPATCH_BRIDGE_COMMAND" })
    );
    const invalid = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(invalid.status).toBe(400);

    mocks.createUnifiedCrmOpportunityDispatchBridge.mockRejectedValueOnce(
      Object.assign(new Error("Dispatch work changed before it could be linked."), { code: "DISPATCH_TARGET_VERSION_CONFLICT" })
    );
    const staleTarget = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(staleTarget.status).toBe(409);

    mocks.createUnifiedCrmOpportunityDispatchBridge.mockRejectedValueOnce(
      Object.assign(new Error("Dispatch work is not available."), { code: "DISPATCH_TARGET_NOT_AVAILABLE" })
    );
    const missingTarget = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    expect(missingTarget.status).toBe(404);

    mocks.createUnifiedCrmOpportunityDispatchBridge.mockRejectedValueOnce(
      new Error("private dispatch backend detail")
    );
    const fallback = await POST(
      new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }),
      { params: Promise.resolve({ opportunityId: "opp_123456" }) }
    );
    const payload = await fallback.json();
    expect(fallback.status).toBe(500);
    expect(JSON.stringify(payload)).not.toContain("private dispatch backend detail");
    expect(payload).toMatchObject({ error: "CRM opportunity dispatch bridge could not be completed safely." });
  });
});
