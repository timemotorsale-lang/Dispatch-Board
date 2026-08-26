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
  getUnifiedCrmManagerExceptionQueue: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-manager-exception-queue-service", () => ({
  getUnifiedCrmManagerExceptionQueue: mocks.getUnifiedCrmManagerExceptionQueue
}));

import { GET } from "@/app/api/crm/v1/manager-exceptions/route";

describe("Unified CRM manager exception queue route", () => {
  it("returns manager exceptions from the service", async () => {
    mocks.getUnifiedCrmManagerExceptionQueue.mockResolvedValueOnce({
      contractVersion: "ucrm.manager-exception-queue/v1",
      generatedAt: "2026-08-26T12:00:00.000Z",
      items: [],
      page: { hasMore: false, nextOffset: null },
      query: { limit: 10, offset: 0 },
      state: "EMPTY",
      summary: { approval: 0, dispatchHandoff: 0, overdue: 0, stalled: 0, unassigned: 0 },
      visibility: "organization"
    });

    const response = await GET(new Request("http://crm.local/api/crm/v1/manager-exceptions?limit=10"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ contractVersion: "ucrm.manager-exception-queue/v1" });
    expect(mocks.getUnifiedCrmManagerExceptionQueue).toHaveBeenCalledWith(actor, expect.any(URLSearchParams));
  });

  it("maps typed manager exception errors safely", async () => {
    mocks.getUnifiedCrmManagerExceptionQueue.mockRejectedValueOnce(Object.assign(new Error("Manager only."), {
      code: "MANAGER_EXCEPTION_NOT_AUTHORIZED",
      retryable: false
    }));

    const response = await GET(new Request("http://crm.local/api/crm/v1/manager-exceptions"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      code: "MANAGER_EXCEPTION_NOT_AUTHORIZED",
      contractVersion: "ucrm.manager-exception-queue-error/v1",
      error: "Manager only.",
      retryable: false
    });
  });
});
