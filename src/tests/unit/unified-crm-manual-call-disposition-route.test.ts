import { describe, expect, it, vi } from "vitest";
const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmManualCallDisposition: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-manual-call-disposition-service", () => mocks);
import { GET } from "@/app/api/crm/v1/communications/manual-call-disposition/route";
describe("Unified CRM manual call disposition route", () => {
  it("returns readiness", async () => {
    mocks.getUnifiedCrmManualCallDisposition.mockResolvedValueOnce({ contractVersion: "ucrm.manual-call-disposition/v1", state: "IMPLEMENTED_UNVERIFIED" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.manual-call-disposition/v1", state: "IMPLEMENTED_UNVERIFIED" });
  });
  it("maps typed authorization errors", async () => {
    mocks.getUnifiedCrmManualCallDisposition.mockRejectedValueOnce(Object.assign(new Error("CRM manual call disposition is available to the manager workspace."), { code: "MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED", contractVersion: "ucrm.manual-call-disposition-error/v1" });
  });
});
