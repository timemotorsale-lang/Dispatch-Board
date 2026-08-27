import { describe, expect, it, vi } from "vitest";

const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmGovernedCustomFields: vi.fn() }));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-governed-custom-fields-service", () => mocks);

import { GET } from "@/app/api/crm/v1/enterprise/custom-fields/route";

describe("Unified CRM governed custom fields route", () => {
  it("returns the custom fields readiness model", async () => {
    mocks.getUnifiedCrmGovernedCustomFields.mockResolvedValueOnce({ contractVersion: "ucrm.governed-custom-fields/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.governed-custom-fields/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmGovernedCustomFields).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmGovernedCustomFields.mockRejectedValueOnce(Object.assign(new Error("CRM custom field readiness is available to the manager workspace."), {
      code: "GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED",
      contractVersion: "ucrm.governed-custom-fields-error/v1",
      httpStatus: 403,
      retryable: false
    }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED",
      contractVersion: "ucrm.governed-custom-fields-error/v1",
      error: "CRM custom field readiness is available to the manager workspace.",
      retryable: false
    });
  });
});
