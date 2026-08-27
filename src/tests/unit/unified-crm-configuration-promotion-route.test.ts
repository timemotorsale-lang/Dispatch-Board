import { describe, expect, it, vi } from "vitest";
const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmConfigurationPromotion: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-configuration-promotion-service", () => mocks);
import { GET } from "@/app/api/crm/v1/enterprise/configuration-promotion/route";

describe("Unified CRM configuration promotion route", () => {
  it("returns the promotion readiness model", async () => {
    mocks.getUnifiedCrmConfigurationPromotion.mockResolvedValueOnce({ contractVersion: "ucrm.configuration-promotion/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.configuration-promotion/v1", state: "HELD" });
  });
  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmConfigurationPromotion.mockRejectedValueOnce(Object.assign(new Error("CRM configuration promotion readiness is available to the manager workspace."), { code: "CONFIGURATION_PROMOTION_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "CONFIGURATION_PROMOTION_NOT_AUTHORIZED", contractVersion: "ucrm.configuration-promotion-error/v1" });
  });
});
