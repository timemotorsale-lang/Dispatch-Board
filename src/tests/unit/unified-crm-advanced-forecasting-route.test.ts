import { describe, expect, it, vi } from "vitest";
const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmAdvancedForecasting: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-advanced-forecasting-service", () => mocks);
import { GET } from "@/app/api/crm/v1/enterprise/advanced-forecasting/route";
describe("Unified CRM advanced forecasting route", () => {
  it("returns readiness", async () => {
    mocks.getUnifiedCrmAdvancedForecasting.mockResolvedValueOnce({ contractVersion: "ucrm.advanced-forecasting/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.advanced-forecasting/v1", state: "HELD" });
  });
  it("maps typed authorization errors", async () => {
    mocks.getUnifiedCrmAdvancedForecasting.mockRejectedValueOnce(Object.assign(new Error("CRM advanced forecasting readiness is available to the manager workspace."), { code: "ADVANCED_FORECASTING_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ADVANCED_FORECASTING_NOT_AUTHORIZED", contractVersion: "ucrm.advanced-forecasting-error/v1" });
  });
});
