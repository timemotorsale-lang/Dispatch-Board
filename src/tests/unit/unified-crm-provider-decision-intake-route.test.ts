import { describe, expect, it, vi } from "vitest";

const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmProviderDecisionIntake: vi.fn() }));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-provider-decision-intake-service", () => mocks);

import { GET } from "@/app/api/crm/v1/admin/provider-decision-intake/route";

describe("Unified CRM provider decision intake route", () => {
  it("returns the provider decision intake model", async () => {
    mocks.getUnifiedCrmProviderDecisionIntake.mockResolvedValueOnce({ contractVersion: "ucrm.provider-decision-intake/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.provider-decision-intake/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmProviderDecisionIntake).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmProviderDecisionIntake.mockRejectedValueOnce(Object.assign(new Error("CRM provider decision intake is available to the manager workspace."), { code: "PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "PROVIDER_DECISION_INTAKE_NOT_AUTHORIZED", contractVersion: "ucrm.provider-decision-intake-error/v1" });
  });
});
