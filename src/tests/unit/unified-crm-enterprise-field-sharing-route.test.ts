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
  getUnifiedCrmEnterpriseFieldSharing: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-enterprise-field-sharing-service", () => mocks);

import { GET } from "@/app/api/crm/v1/enterprise/field-sharing/route";

describe("Unified CRM enterprise field sharing route", () => {
  it("returns the enterprise sharing readiness model", async () => {
    mocks.getUnifiedCrmEnterpriseFieldSharing.mockResolvedValueOnce({
      contractVersion: "ucrm.enterprise-field-sharing/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.enterprise-field-sharing/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmEnterpriseFieldSharing).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmEnterpriseFieldSharing.mockRejectedValueOnce(Object.assign(new Error("CRM enterprise sharing readiness is available to the manager workspace."), {
      code: "ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED",
      contractVersion: "ucrm.enterprise-field-sharing-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED",
      contractVersion: "ucrm.enterprise-field-sharing-error/v1",
      error: "CRM enterprise sharing readiness is available to the manager workspace.",
      retryable: false
    });
  });
});
