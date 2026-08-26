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
  getUnifiedCrmPilotExecution: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-pilot-execution-service", () => mocks);

import { GET } from "@/app/api/crm/v1/pilot-execution/route";

describe("Unified CRM pilot execution route", () => {
  it("returns the pilot execution model", async () => {
    mocks.getUnifiedCrmPilotExecution.mockResolvedValueOnce({
      contractVersion: "ucrm.pilot-execution/v1",
      pilotStatus: "READY_TO_RUN"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.pilot-execution/v1", pilotStatus: "READY_TO_RUN" });
    expect(mocks.getUnifiedCrmPilotExecution).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmPilotExecution.mockRejectedValueOnce(Object.assign(new Error("CRM pilot execution is available to the manager workspace."), {
      code: "PILOT_EXECUTION_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-execution-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "PILOT_EXECUTION_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-execution-error/v1",
      error: "CRM pilot execution is available to the manager workspace.",
      retryable: false
    });
  });
});
