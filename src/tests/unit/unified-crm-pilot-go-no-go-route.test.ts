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
  getUnifiedCrmPilotGoNoGo: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-pilot-go-no-go-service", () => mocks);

import { GET } from "@/app/api/crm/v1/pilot-go-no-go/route";

describe("Unified CRM pilot go/no-go route", () => {
  it("returns the pilot decision", async () => {
    mocks.getUnifiedCrmPilotGoNoGo.mockResolvedValueOnce({
      contractVersion: "ucrm.pilot-go-no-go/v1",
      decision: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.pilot-go-no-go/v1", decision: "HELD" });
    expect(mocks.getUnifiedCrmPilotGoNoGo).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmPilotGoNoGo.mockRejectedValueOnce(Object.assign(new Error("CRM pilot go/no-go is available to the manager workspace."), {
      code: "PILOT_GO_NO_GO_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-go-no-go-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "PILOT_GO_NO_GO_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-go-no-go-error/v1",
      error: "CRM pilot go/no-go is available to the manager workspace.",
      retryable: false
    });
  });
});
