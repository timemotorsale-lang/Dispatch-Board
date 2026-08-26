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
  getUnifiedCrmPilotFindingClosure: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-pilot-finding-closure-service", () => mocks);

import { GET } from "@/app/api/crm/v1/pilot-finding-closure/route";

describe("Unified CRM pilot finding closure route", () => {
  it("returns the finding closure register", async () => {
    mocks.getUnifiedCrmPilotFindingClosure.mockResolvedValueOnce({
      closureDecision: "HELD",
      contractVersion: "ucrm.pilot-finding-closure/v1"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      closureDecision: "HELD",
      contractVersion: "ucrm.pilot-finding-closure/v1"
    });
    expect(mocks.getUnifiedCrmPilotFindingClosure).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmPilotFindingClosure.mockRejectedValueOnce(Object.assign(new Error("CRM pilot finding closure is available to the manager workspace."), {
      code: "PILOT_FINDING_CLOSURE_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-finding-closure-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "PILOT_FINDING_CLOSURE_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-finding-closure-error/v1",
      error: "CRM pilot finding closure is available to the manager workspace.",
      retryable: false
    });
  });
});
