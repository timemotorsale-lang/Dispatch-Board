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
  getUnifiedCrmPilotOperationsPackage: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-pilot-operations-service", () => mocks);

import { GET } from "@/app/api/crm/v1/pilot-operations/route";

describe("Unified CRM pilot operations route", () => {
  it("returns the pilot operations package", async () => {
    mocks.getUnifiedCrmPilotOperationsPackage.mockResolvedValueOnce({
      contractVersion: "ucrm.pilot-operations/v1",
      packageStatus: "READY_FOR_REVIEW"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.pilot-operations/v1", packageStatus: "READY_FOR_REVIEW" });
    expect(mocks.getUnifiedCrmPilotOperationsPackage).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmPilotOperationsPackage.mockRejectedValueOnce(Object.assign(new Error("CRM pilot operations are available to the manager workspace."), {
      code: "PILOT_OPERATIONS_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-operations-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "PILOT_OPERATIONS_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-operations-error/v1",
      error: "CRM pilot operations are available to the manager workspace.",
      retryable: false
    });
  });
});
