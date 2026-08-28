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
  getUnifiedCrmAccountingDmsConnector: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-accounting-dms-connector-service", () => mocks);

import { GET } from "@/app/api/crm/v1/integrations/accounting-dms/route";

describe("Unified CRM accounting/DMS connector route", () => {
  it("returns the accounting/DMS readiness model", async () => {
    mocks.getUnifiedCrmAccountingDmsConnector.mockResolvedValueOnce({
      contractVersion: "ucrm.accounting-dms-connector/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.accounting-dms-connector/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmAccountingDmsConnector).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmAccountingDmsConnector.mockRejectedValueOnce(Object.assign(new Error("CRM accounting and DMS connector readiness is available to the manager workspace."), {
      code: "ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED",
      contractVersion: "ucrm.accounting-dms-connector-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED",
      contractVersion: "ucrm.accounting-dms-connector-error/v1",
      error: "CRM accounting and DMS connector readiness is available to the manager workspace.",
      retryable: false
    });
  });

  it("masks unknown failures", async () => {
    mocks.getUnifiedCrmAccountingDmsConnector.mockRejectedValueOnce(new Error("accounting integration secret"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.accounting-dms-connector-error/v1",
      error: "CRM accounting and DMS connector readiness is temporarily unavailable.",
      retryable: false
    });
  });
});
