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
  getUnifiedCrmOperationalHandoff: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-operational-handoff-service", () => mocks);

import { GET } from "@/app/api/crm/v1/operational-handoff/route";

describe("Unified CRM operational handoff route", () => {
  it("returns the operational handoff gate", async () => {
    mocks.getUnifiedCrmOperationalHandoff.mockResolvedValueOnce({
      contractVersion: "ucrm.operational-handoff/v1",
      handoffDecision: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.operational-handoff/v1",
      handoffDecision: "HELD"
    });
    expect(mocks.getUnifiedCrmOperationalHandoff).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmOperationalHandoff.mockRejectedValueOnce(Object.assign(new Error("CRM operational handoff is available to the manager workspace."), {
      code: "OPERATIONAL_HANDOFF_NOT_AUTHORIZED",
      contractVersion: "ucrm.operational-handoff-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "OPERATIONAL_HANDOFF_NOT_AUTHORIZED",
      contractVersion: "ucrm.operational-handoff-error/v1",
      error: "CRM operational handoff is available to the manager workspace.",
      retryable: false
    });
  });
});
