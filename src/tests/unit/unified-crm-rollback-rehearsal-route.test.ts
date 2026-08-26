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
  getUnifiedCrmRollbackRehearsal: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-rollback-rehearsal-service", () => mocks);

import { GET } from "@/app/api/crm/v1/rollback-rehearsal/route";

describe("Unified CRM rollback rehearsal route", () => {
  it("returns the rollback rehearsal model", async () => {
    mocks.getUnifiedCrmRollbackRehearsal.mockResolvedValueOnce({
      contractVersion: "ucrm.rollback-rehearsal/v1",
      rehearsalStatus: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.rollback-rehearsal/v1", rehearsalStatus: "HELD" });
    expect(mocks.getUnifiedCrmRollbackRehearsal).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmRollbackRehearsal.mockRejectedValueOnce(Object.assign(new Error("CRM rollback rehearsal is available to the manager workspace."), {
      code: "ROLLBACK_REHEARSAL_NOT_AUTHORIZED",
      contractVersion: "ucrm.rollback-rehearsal-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "ROLLBACK_REHEARSAL_NOT_AUTHORIZED",
      contractVersion: "ucrm.rollback-rehearsal-error/v1",
      error: "CRM rollback rehearsal is available to the manager workspace.",
      retryable: false
    });
  });
});
