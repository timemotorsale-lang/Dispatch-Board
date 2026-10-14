import { describe, expect, it, vi } from "vitest";
const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmLifecycleModules: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-lifecycle-modules-service", () => mocks);
import { GET } from "@/app/api/crm/v1/enterprise/lifecycle-modules/route";
describe("Unified CRM lifecycle modules route", () => {
  it("returns readiness", async () => {
    mocks.getUnifiedCrmLifecycleModules.mockResolvedValueOnce({ contractVersion: "ucrm.lifecycle-modules/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.lifecycle-modules/v1", state: "HELD" });
  });
  it("maps typed authorization errors", async () => {
    mocks.getUnifiedCrmLifecycleModules.mockRejectedValueOnce(Object.assign(new Error("CRM lifecycle module readiness is available to the manager workspace."), { code: "LIFECYCLE_MODULES_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "LIFECYCLE_MODULES_NOT_AUTHORIZED", contractVersion: "ucrm.lifecycle-modules-error/v1" });
  });
});
