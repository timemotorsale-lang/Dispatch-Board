import { describe, expect, it, vi } from "vitest";

const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmAdminReadinessHub: vi.fn() }));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-admin-readiness-hub-service", () => mocks);

import { GET } from "@/app/api/crm/v1/admin/readiness-hub/route";

describe("Unified CRM admin readiness hub route", () => {
  it("returns the hub model", async () => {
    mocks.getUnifiedCrmAdminReadinessHub.mockResolvedValueOnce({ contractVersion: "ucrm.admin-readiness-hub/v1", state: "AVAILABLE" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.admin-readiness-hub/v1", state: "AVAILABLE" });
    expect(mocks.getUnifiedCrmAdminReadinessHub).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmAdminReadinessHub.mockRejectedValueOnce(Object.assign(new Error("CRM readiness hub is available to the manager workspace."), { code: "ADMIN_READINESS_HUB_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ADMIN_READINESS_HUB_NOT_AUTHORIZED", contractVersion: "ucrm.admin-readiness-hub-error/v1" });
  });
});
