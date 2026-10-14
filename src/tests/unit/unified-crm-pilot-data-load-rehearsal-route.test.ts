import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "admin-1",
  name: "Admin One",
  email: "admin@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  rehearseUnifiedCrmPilotDataLoad: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-pilot-data-load-rehearsal-service", () => mocks);

import { POST } from "@/app/api/crm/v1/pilot-data-load-rehearsal/route";

describe("Unified CRM pilot data load rehearsal route", () => {
  it("returns the rehearsal report from the service", async () => {
    const payload = { rows: [{ customerName: "Alex", opportunityTitle: "Accord", sourceReference: "SRC-1" }], sourceSystem: "pilot-sheet" };
    mocks.rehearseUnifiedCrmPilotDataLoad.mockResolvedValueOnce({
      contractVersion: "ucrm.pilot-data-load-rehearsal/v1",
      dryRun: true,
      state: "READY_FOR_ADMIN_REVIEW"
    });

    const response = await POST(new Request("http://crm.local/api/crm/v1/pilot-data-load-rehearsal", { method: "POST", body: JSON.stringify(payload) }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ dryRun: true, state: "READY_FOR_ADMIN_REVIEW" });
    expect(mocks.rehearseUnifiedCrmPilotDataLoad).toHaveBeenCalledWith(actor, payload);
  });

  it("maps typed rehearsal errors safely", async () => {
    mocks.rehearseUnifiedCrmPilotDataLoad.mockRejectedValueOnce(Object.assign(new Error("Administrator access is required for CRM pilot data load rehearsal."), {
      code: "PILOT_DATA_LOAD_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-data-load-rehearsal-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await POST(new Request("http://crm.local/api/crm/v1/pilot-data-load-rehearsal", { method: "POST", body: JSON.stringify({}) }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "PILOT_DATA_LOAD_NOT_AUTHORIZED",
      contractVersion: "ucrm.pilot-data-load-rehearsal-error/v1",
      error: "Administrator access is required for CRM pilot data load rehearsal.",
      retryable: false
    });
  });
});
